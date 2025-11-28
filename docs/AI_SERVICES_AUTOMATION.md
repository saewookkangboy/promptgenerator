# AI 서비스 정보 자동화 시스템

## 개요

이 시스템은 AI 이미지/동영상 생성 서비스 정보를 자동으로 수집, 검증, 업데이트하는 자동화 파이프라인입니다.

## 주요 기능

1. **마크다운 파일 파싱**: `data/ai-gen-services.md` 파일을 파싱하여 DB에 저장
2. **URL 검증**: 서비스 홈페이지 및 API 문서 URL의 유효성 검증
3. **주 1회 자동 업데이트**: 매주 월요일 오전 9시(KST) 자동 실행
4. **동적 모델 목록**: 프론트엔드에서 DB의 서비스 정보를 동적으로 로드

## 데이터베이스 스키마

### AIService 테이블

```prisma
model AIService {
  id                String        @id @default(uuid())
  category          AIServiceCategory  // IMAGE | VIDEO
  serviceName       String
  homepageUrl       String
  apiDocsUrl        String
  provider          String?       // OpenAI, Google, Adobe 등
  apiStatus         AIServiceStatus  // PUBLIC | GATED | UNKNOWN
  authType          AIServiceAuthType  // API_KEY | OAUTH | AWS_SIGV4 | UNKNOWN
  notes             String?
  fingerprint       String        @unique  // 중복 방지용 해시
  httpStatusHome    Int?
  httpStatusDocs    Int?
  lastVerifiedAt    DateTime?
  isActive          Boolean       @default(true)
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
}
```

## 사용 방법

### 1. 초기 데이터 로드

```bash
# ai-gen-services.md 파일을 data/ 디렉토리에 배치
cp /path/to/ai-gen-services.md data/ai-gen-services.md

# 파싱 및 DB 저장
npm run ai-services:parse
```

### 2. 수동 업데이트 (전체 프로세스)

```bash
# 파싱 + URL 검증 + 상태 업데이트
npm run ai-services:update
```

### 3. 자동 업데이트

서버가 실행되면 자동으로 매주 월요일 오전 9시(KST)에 업데이트가 실행됩니다.

## API 엔드포인트

### GET /api/ai-services

전체 서비스 목록 조회

**Query Parameters:**
- `category`: `IMAGE` | `VIDEO` (선택)
- `status`: `PUBLIC` | `GATED` | `UNKNOWN` (선택)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "category": "IMAGE",
      "serviceName": "OpenAI (GPT Image 1 / Images API)",
      "homepageUrl": "https://platform.openai.com/",
      "apiDocsUrl": "https://platform.openai.com/docs/guides/image-generation",
      "provider": "OpenAI",
      "apiStatus": "PUBLIC",
      "authType": "API_KEY",
      "httpStatusHome": 200,
      "httpStatusDocs": 200,
      "lastVerifiedAt": "2025-01-28T00:00:00Z"
    }
  ],
  "count": 1
}
```

### GET /api/ai-services/:id

특정 서비스 상세 정보 조회

### GET /api/ai-services/category/:category

카테고리별 서비스 목록 조회

## 자동화 아이디어 및 확장 방안

### 1. 웹 크롤링 자동화

현재는 마크다운 파일을 수동으로 업데이트해야 하지만, 다음과 같은 자동화가 가능합니다:

#### 옵션 A: n8n 워크플로우 (권장)

```yaml
트리거: Cron (매주 월요일 09:00 KST)
  ↓
1. 웹 검색 (SerpAPI / Google Custom Search)
   - "AI image generation API 2025"
   - "video generation API new"
   - "Sora API", "Veo API" 등
  ↓
2. URL 추출 및 정규화
  ↓
3. HTTP 요청 (HEAD/GET) - URL 검증
  ↓
4. 조건 필터링
   - HTTPS 필수
   - API 문서 키워드 포함
   - HTTP 200/301/302만 통과
  ↓
5. LLM 노드 (OpenAI/Gemini)
   - 서비스명 정규화
   - 카테고리 분류
   - Provider 추출
  ↓
6. 중복 제거 (fingerprint 기반)
  ↓
7. Diff 비교
   - NEW: 신규 서비스
   - CHANGED: URL 변경
   - REMOVED: 404/410
  ↓
8. 마크다운 파일 업데이트
  ↓
9. DB 저장 (API 호출)
  ↓
10. 알림 (Slack/Email)
```

#### 옵션 B: GitHub Actions

```yaml
name: Update AI Services
on:
  schedule:
    - cron: '0 0 * * 1'  # 매주 월요일
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Run scraper
        run: |
          node scripts/scrape-ai-services.js
      - name: Commit changes
        run: |
          git config user.name "Automation"
          git config user.email "automation@example.com"
          git add data/ai-gen-services.md
          git commit -m "Auto-update AI services" || exit 0
          git push
```

### 2. API 문서 크롤링 및 프롬프트 가이드 생성

각 서비스의 API 문서를 크롤링하여 프롬프트 생성 가이드라인을 자동으로 추출:

```javascript
// scripts/extract-api-guidelines.js
async function extractGuidelines(service) {
  // 1. API 문서 크롤링
  const docs = await crawlApiDocs(service.apiDocsUrl)
  
  // 2. LLM으로 핵심 가이드라인 추출
  const guidelines = await extractWithLLM(docs, {
    prompt: `
      다음 API 문서에서 프롬프트 생성에 도움이 되는 가이드라인을 추출하세요:
      - 필수 파라미터
      - 권장 프롬프트 형식
      - 제약사항
      - 베스트 프랙티스
    `
  })
  
  // 3. PromptGuide 테이블에 저장
  await prisma.promptGuide.create({
    data: {
      modelName: service.serviceName,
      category: service.category === 'IMAGE' ? 'IMAGE' : 'VIDEO',
      bestPractices: guidelines,
      ...
    }
  })
}
```

### 3. 실시간 모니터링

서비스 상태를 실시간으로 모니터링하고 알림:

```javascript
// server/scheduler/serviceMonitor.js
cron.schedule('0 */6 * * *', async () => {
  // 6시간마다 실행
  const services = await prisma.aIService.findMany()
  
  for (const service of services) {
    const status = await checkServiceHealth(service)
    
    if (status.changed) {
      // 상태 변경 알림
      await sendNotification({
        service: service.serviceName,
        oldStatus: status.old,
        newStatus: status.new,
        url: service.apiDocsUrl
      })
    }
  }
})
```

### 4. 프롬프트 생성기 통합

프롬프트 생성 시 선택한 모델의 API 가이드라인을 자동으로 적용:

```typescript
// 프롬프트 생성 시
const service = await aiServicesAPI.getByModel(model)
const guidelines = await getPromptGuide(service.serviceName)

// 컨텍스트 프롬프트에 가이드라인 포함
const contextPrompt = buildContextPrompt({
  userPrompt,
  modelGuidelines: guidelines.bestPractices,
  apiConstraints: service.notes,
  ...
})
```

### 5. 사용자 피드백 수집

사용자가 실제로 사용한 프롬프트와 결과를 수집하여 가이드라인 개선:

```typescript
// 프롬프트 저장 시
await prisma.promptUsage.create({
  data: {
    serviceId: service.id,
    prompt: prompt,
    options: options,
    userRating: rating,  // 사용자 평가
    success: true/false,
    ...
  }
})

// 주기적으로 분석하여 가이드라인 업데이트
cron.schedule('0 0 * * 0', async () => {
  const insights = await analyzePromptUsage()
  await updatePromptGuides(insights)
})
```

## 파일 구조

```
prompt-generator/
├── data/
│   └── ai-gen-services.md          # 마크다운 소스 파일
├── scripts/
│   └── parse-ai-services.js        # 파싱 스크립트
├── server/
│   ├── routes/
│   │   └── aiServices.js          # API 라우트
│   └── scheduler/
│       └── aiServiceScheduler.js  # 자동 업데이트 스케줄러
└── prisma/
    └── schema.prisma               # DB 스키마
```

## 환경 변수

필요한 환경 변수는 없습니다. (기본 설정 사용)

## 트러블슈팅

### 파싱 실패

- `data/ai-gen-services.md` 파일이 존재하는지 확인
- 마크다운 테이블 형식이 올바른지 확인

### URL 검증 실패

- 네트워크 연결 확인
- 일부 서버는 HEAD 요청을 지원하지 않으므로 GET으로 폴백

### 스케줄러가 실행되지 않음

- 서버가 실행 중인지 확인
- 로그에서 스케줄러 초기화 메시지 확인

## 향후 개선 사항

1. ✅ 마크다운 파일 파싱
2. ✅ URL 검증
3. ✅ 주 1회 자동 업데이트
4. ⏳ 웹 크롤링 자동화
5. ⏳ API 문서 크롤링
6. ⏳ 실시간 모니터링
7. ⏳ 사용자 피드백 수집
8. ⏳ 프롬프트 가이드 자동 생성

