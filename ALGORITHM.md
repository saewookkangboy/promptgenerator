# 프롬프트 가이드 수집 시스템 알고리즘 문서

## 목차
1. [시스템 개요](#시스템-개요)
2. [아키텍처](#아키텍처)
3. [스크래핑 알고리즘](#스크래핑-알고리즘)
4. [에러 처리 및 재시도 로직](#에러-처리-및-재시도-로직)
5. [데이터 수집 및 저장 프로세스](#데이터-수집-및-저장-프로세스)
6. [스케줄러 시스템](#스케줄러-시스템)
7. [최신 업데이트 (2024-2025)](#최신-업데이트-2024-2025)

---

## 시스템 개요

프롬프트 가이드 수집 시스템은 주요 LLM 및 이미지/동영상 생성 모델의 최신 프롬프트 가이드를 자동으로 수집, 저장, 업데이트하는 시스템입니다.

### 주요 기능
- **자동 수집**: 일정 주기(7일)마다 자동으로 최신 가이드 수집
- **수동 수집**: 관리자가 필요 시 즉시 수집 가능
- **다중 소스**: 각 모델별로 여러 URL에서 수집 시도
- **스마트 파싱**: HTML 구조를 분석하여 Best Practices, Tips, Examples 추출
- **신뢰도 평가**: 수집된 데이터의 품질을 점수로 평가

---

## 아키텍처

```
┌─────────────────┐
│  Client (React) │
│  - GuideManager │
│  - Admin UI     │
└────────┬────────┘
         │ HTTP API
         ▼
┌─────────────────┐
│  Server (Node)  │
│  - Express API  │
│  - Scraper      │
│  - Scheduler    │
└────────┬────────┘
         │ HTTP Requests
         ▼
┌─────────────────┐
│  External APIs  │
│  - OpenAI Docs  │
│  - Anthropic    │
│  - Google AI    │
│  - etc.         │
└─────────────────┘
```

### 컴포넌트 구조

1. **클라이언트 사이드**
   - `GuideManager.tsx`: 가이드 관리 UI
   - `prompt-guide-collector.ts`: 서버 API 호출
   - `prompt-guide-storage.ts`: 로컬 스토리지 관리
   - `prompt-guide-scheduler.ts`: 스케줄러 상태 확인

2. **서버 사이드**
   - `server/index.js`: Express API 서버
   - `server/scraper/guideScraper.js`: 웹 스크래핑 로직
   - `server/scheduler/guideScheduler.js`: 자동 스케줄러

---

## 스크래핑 알고리즘

### 1. 수집 소스 정의

각 모델별로 여러 URL을 정의하여 하나가 실패해도 다른 소스에서 수집 시도:

```javascript
const COLLECTION_SOURCES = {
  'openai-gpt-4': [
    'https://help.openai.com/en/articles/6654000-best-practices-for-prompt-engineering-with-openai-api',
    'https://platform.openai.com/docs/guides/prompt-engineering',
  ],
  // ... 기타 모델들
}
```

### 2. 스크래핑 프로세스

```
┌─────────────────────────────────────────┐
│  collectAllGuides()                     │
│  - 모든 모델 순회                        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  collectGuideForModel(modelName)        │
│  - 모델별 소스 URL 순회                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  scrapeGuideFromURL(url, modelName)     │
│  1. HTTP 요청 (헤더 설정)               │
│  2. 응답 검증 (200-299만 성공)          │
│  3. HTML 파싱 (Cheerio)                 │
│  4. 내용 추출                           │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  extractContent($, modelName)           │
│  - Best Practices 추출                  │
│  - Tips 추출                            │
│  - Examples 추출                        │
│  - Parameters 추출                      │
└─────────────────────────────────────────┘
```

### 3. 내용 추출 알고리즘

#### Best Practices 추출
```javascript
1. 키워드 검색: ['best practice', 'best practices', 'guidelines', 'recommendations']
2. 헤딩(h1-h4)에서 키워드 포함 섹션 찾기
3. 다음 10개 요소까지 순회하며 리스트 항목/문단 추출
4. 길이 검증: 15-500자
5. 중복 제거 및 최대 15개 제한
```

#### Tips 추출
```javascript
1. 키워드 검색: ['tip', 'tips', 'note', 'important', 'remember']
2. 헤딩, strong, em 태그에서 키워드 포함 요소 찾기
3. 부모 요소의 텍스트 추출
4. blockquote 태그도 tips로 간주
5. 길이 검증: 20-500자
6. 중복 제거 및 최대 15개 제한
```

#### Examples 추출
```javascript
1. pre, code 태그에서 코드 블록 추출
2. .example 클래스 요소에서 예시 추출
3. 길이 검증: 20-2000자
4. 코드 블록은 최대 500자, 일반 예시는 300자로 제한
5. 최대 10개 제한
```

### 4. HTTP 요청 최적화

#### 헤더 설정
```javascript
{
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ...',
  'Accept': 'text/html,application/xhtml+xml,...',
  'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8',
  'Referer': 'https://www.google.com/',
  // GitHub 사이트는 별도 헤더
}
```

#### 요청 제어
- **타임아웃**: 30초
- **최대 리다이렉트**: 10회
- **요청 간 딜레이**: 2초 (서버 부하 방지)
- **모델 간 딜레이**: 3초

---

## 에러 처리 및 재시도 로직

### 1. 에러 분류

```javascript
// HTTP 상태 코드별 처리
403 Forbidden → 봇 차단 가능성, 대체 소스 시도
404 Not Found → URL 변경 가능성, 다음 소스 시도
400 Bad Request → 잘못된 요청, 다음 소스 시도
리다이렉트 초과 → URL 문제, 다음 소스 시도
타임아웃 → 네트워크 문제, 다음 소스 시도
```

### 2. 재시도 전략

```
소스 1 실패
    ↓
소스 2 시도
    ↓
소스 3 시도
    ↓
모든 소스 실패 시
    ↓
부분 성공 결과라도 저장 (낮은 신뢰도)
```

### 3. 부분 성공 처리

모든 소스에서 완전한 수집이 실패해도:
- 제목이나 설명만이라도 추출된 경우
- 신뢰도 0.3으로 저장
- 경고 메시지와 함께 반환

### 4. 신뢰도 계산 알고리즘

```javascript
function calculateConfidence(content) {
  let score = 0.3  // 기본 점수
  
  // Best Practices: 최대 0.3점
  if (content.bestPractices?.length > 0) {
    score += Math.min(content.bestPractices.length * 0.1, 0.3)
  }
  
  // Tips: 최대 0.2점
  if (content.tips?.length > 0) {
    score += Math.min(content.tips.length * 0.1, 0.2)
  }
  
  // Examples: 최대 0.2점
  if (content.examples?.length > 0) {
    score += Math.min(content.examples.length * 0.1, 0.2)
  }
  
  return Math.min(score, 1.0)  // 최대 1.0
}
```

---

## 데이터 수집 및 저장 프로세스

### 1. 수집 플로우

```
사용자 요청 (수동 수집)
    ↓
클라이언트: triggerManualCollection()
    ↓
서버 API: POST /api/guides/collect
    ↓
서버: collectAllGuides()
    ↓
각 모델별 수집: collectGuideForModel()
    ↓
결과 반환 및 클라이언트 스토리지 저장
```

### 2. 데이터 구조

```typescript
interface PromptGuide {
  modelName: ModelName
  category: 'llm' | 'image' | 'video'
  version: string
  title: string
  description: string
  lastUpdated: number
  source: string
  content: {
    bestPractices: string[]
    tips: string[]
    examples: Array<{ input: string; output: string }>
    parameters: { [key: string]: any }
  }
  metadata: {
    collectedAt: number
    collectedBy: 'scraper' | 'manual'
    confidence: number  // 0.0 - 1.0
  }
}
```

### 3. 저장 로직

```javascript
// upsertGuides() 함수
1. 기존 가이드 확인 (modelName + version)
2. 존재하면 업데이트, 없으면 추가
3. 로컬 스토리지에 저장
4. 90일 이상 된 오래된 가이드 자동 정리
```

### 4. 중복 방지

- `modelName + version` 조합으로 고유성 확인
- 동일한 가이드가 있으면 업데이트만 수행
- 새로운 가이드만 추가

---

## 스케줄러 시스템

### 1. 자동 스케줄러 (서버 사이드)

```javascript
// node-cron을 사용한 일정 스케줄링
cron.schedule('0 18 * * *', async () => {
  // 매일 UTC 18:00 (한국시간 03:00) 실행
  await collectAllGuides()
}, {
  scheduled: true,
  timezone: "Asia/Seoul"
})
```

### 2. 수집 주기

- **기본 주기**: 7일마다 자동 수집
- **수동 수집**: 언제든지 가능
- **다음 수집 일정**: 클라이언트 스토리지에 저장

### 3. 스케줄러 상태 확인

```javascript
// 클라이언트에서 서버 상태 확인
GET /api/guides/status
→ {
  nextCollection: timestamp,
  isCollecting: boolean,
  lastUpdated: timestamp
}
```

---

## 최신 업데이트 (2024-2025)

### 1. URL 업데이트 (2025-01)

#### OpenAI (GPT-4, GPT-3.5, DALL-E 3)
**문제**: 403 Forbidden (봇 차단)
**해결**:
- `help.openai.com` 공개 가이드 페이지 사용
- `platform.openai.com/docs/guides/images/introduction` 추가

**변경 전**:
```javascript
'https://platform.openai.com/docs/guides/prompt-engineering'
'https://platform.openai.com/docs/api-reference/chat'
```

**변경 후**:
```javascript
'https://help.openai.com/en/articles/6654000-best-practices-for-prompt-engineering-with-openai-api'
'https://platform.openai.com/docs/guides/prompt-engineering'
```

#### Gemini (Pro, Ultra, Nano Banana Pro)
**문제**: 리다이렉트 초과
**해결**: 새로운 API 문서 경로로 변경

**변경 전**:
```javascript
'https://ai.google.dev/docs/prompt_intro'
'https://ai.google.dev/docs'
```

**변경 후**:
```javascript
'https://ai.google.dev/gemini-api/docs'
'https://ai.google.dev/gemini-api/docs/prompt-intro'
'https://ai.google.dev/gemini-api/docs/get-started/python'
```

#### Midjourney
**문제**: 404 Not Found
**해결**: URL 경로 수정

**변경 전**:
```javascript
'https://docs.midjourney.com/docs'
```

**변경 후**:
```javascript
'https://docs.midjourney.com'
'https://docs.midjourney.com/parameter-list'
'https://docs.midjourney.com/docs/prompts'
```

#### Stable Diffusion
**문제**: 404 Not Found
**해결**: GitHub 저장소 및 뉴스 페이지 사용

**변경 전**:
```javascript
'https://stability.ai/docs'
```

**변경 후**:
```javascript
'https://github.com/Stability-AI/StableDiffusion'
'https://github.com/Stability-AI/stablediffusion'
'https://stability.ai/news'
```

#### Sora
**문제**: 403 Forbidden
**해결**: URL 경로 수정

**변경 전**:
```javascript
'https://openai.com/research/video-generation-models-as-world-simulators'
```

**변경 후**:
```javascript
'https://openai.com/sora'
'https://openai.com/index/video-generation-models-as-world-simulators'
```

#### Veo-3
**문제**: URL 접근 불가
**해결**: URL 정리 및 최신 블로그 포스트 추가

**변경 전**:
```javascript
'https://deepmind.google/technologies/veo/'
```

**변경 후**:
```javascript
'https://deepmind.google/technologies/veo'
'https://deepmind.google/discover/blog/veo-2-our-most-capable-video-generation-model'
```

#### Llama (3, 3.1)
**문제**: 400 Bad Request
**해결**: 올바른 경로로 변경

**변경 전**:
```javascript
'https://llama.meta.com/docs'
```

**변경 후**:
```javascript
'https://llama.meta.com/llama3'
'https://ai.meta.com/llama'
'https://github.com/meta-llama/llama3'
```

### 2. 에러 처리 개선

#### 상태 코드 검증 강화
```javascript
// 변경 전: 200-499 모두 허용
validateStatus: (status) => status >= 200 && status < 500

// 변경 후: 200-299만 성공
validateStatus: (status) => status >= 200 && status < 300
```

#### 명확한 에러 메시지
```javascript
// 403 에러 처리
if (response.status === 403) {
  console.warn('⚠️ 403 Forbidden - 봇 차단 가능성')
  return { success: false, error: '403 Forbidden - 봇 차단' }
}
```

### 3. 헤더 최적화

#### Referer 헤더 추가
```javascript
headers: {
  'Referer': 'https://www.google.com/',
  // 봇 차단 완화
}
```

#### GitHub 사이트별 헤더
```javascript
if (url.includes('github.com')) {
  headers['Accept'] = 'text/html,application/xhtml+xml'
}
```

### 4. 리다이렉트 처리 개선

```javascript
// 변경 전
maxRedirects: 5

// 변경 후
maxRedirects: 10  // Gemini 등 리다이렉트가 많은 사이트 대응
```

### 5. 내용 추출 알고리즘 개선

#### 더 넓은 범위의 키워드 검색
```javascript
// Best Practices
const practiceKeywords = [
  'best practice',
  'best practices',
  'guidelines',
  'recommendations',
  'guide'
]

// Tips
const tipKeywords = [
  'tip',
  'tips',
  'note',
  'important',
  'remember'
]
```

#### 섹션 추출 로직 개선
```javascript
// 헤딩에서 키워드 찾기
mainContent.find('h1, h2, h3, h4').each((i, elem) => {
  const headingText = heading.text().toLowerCase()
  if (headingText.includes(keyword)) {
    // 다음 10개 요소까지 순회
    // 리스트 항목/문단 추출
  }
})
```

### 6. 부분 성공 처리 추가

```javascript
// 모든 소스 실패 시에도 부분 성공 결과 저장
const partialResults = results.filter(r => r.title || r.description)
if (partialResults.length > 0) {
  return {
    success: true,
    guide: { ... },
    warning: '일부 소스에서만 수집 성공',
    confidence: 0.3  // 낮은 신뢰도
  }
}
```

### 7. 성공 조건 최적화

```javascript
// 충분한 내용을 얻었으면 다음 소스 시도 중단
if (result.success && result.content && 
    ((result.content.bestPractices?.length || 0) + 
     (result.content.tips?.length || 0)) > 0) {
  break  // 다음 소스 시도 중단
}
```

---

## 성능 최적화

### 1. 요청 최적화
- **병렬 처리**: 모델별로 순차 처리 (서버 부하 방지)
- **요청 간 딜레이**: 2초 (봇 차단 방지)
- **타임아웃**: 30초 (무한 대기 방지)

### 2. 데이터 최적화
- **중복 제거**: Set을 사용한 중복 항목 제거
- **길이 제한**: Best Practices 15개, Tips 15개, Examples 10개
- **오래된 데이터 정리**: 90일 이상 된 가이드 자동 삭제

### 3. 스토리지 최적화
- **로컬 스토리지**: 클라이언트 사이드 저장
- **버전 관리**: modelName + version으로 중복 방지
- **압축**: 긴 텍스트는 적절히 잘라서 저장

---

## 향후 개선 계획

1. **프록시 지원**: 봇 차단이 심한 사이트를 위한 프록시 서버
2. **캐싱 시스템**: Redis 등을 활용한 서버 사이드 캐싱
3. **API 키 지원**: 일부 사이트의 공식 API 활용
4. **머신러닝 기반 파싱**: 더 정확한 내용 추출
5. **실시간 모니터링**: 수집 성공률 대시보드

---

## 참고 자료

- [Express.js 공식 문서](https://expressjs.com/)
- [Cheerio 공식 문서](https://cheerio.js.org/)
- [node-cron 공식 문서](https://www.npmjs.com/package/node-cron)
- [Axios 공식 문서](https://axios-http.com/)

---

**최종 업데이트**: 2025-01-XX
**버전**: 1.0.0

