# 블로그 프롬프트 최적화 가이드

## 개요

블로그 콘텐츠 생성 프롬프트가 SEO, GEO, AIO (AI Optimization), AEO (Answer Engine Optimization)에 맞춰 고도화되었습니다.

## 주요 기능

### 1. SEO 최적화 (Search Engine Optimization)
- **Primary Keywords**: 핵심 키워드 자동 추출 및 최적 배치
- **Semantic Keywords**: 의미적으로 관련된 키워드 생성
- **LSI Keywords**: 동시 출현 키워드 (Latent Semantic Indexing)
- **Long-tail Keywords**: 3-8단어 장문 키워드
- **메타데이터**: Title, Description 최적화 제안

### 2. GEO 최적화 (Geographic Optimization)
- 지역 키워드 자동 생성
- LocalBusiness Schema 마크업 지원
- 지역별 검색어 최적화

### 3. AIO 최적화 (AI Optimization)
플랫폼별 최적화 전략:

#### ChatGPT
- 권위와 신뢰성 강조 (작성자 자격증명)
- 1500-2500자 포괄적 커버리지
- Primary Source 인용 (PubMed, arXiv 등)
- Answer-first 구조
- 통계 및 데이터 포함 (+41% 인용 증대)
- 인용구 추가 (+28% 인용 증대)

#### Perplexity
- 콘텐츠 신선도 유지 (30일 이내 업데이트 = 3.2배 인용 증가)
- 인라인 인용 형식: [1], [2]
- H2→H3→불릿 구조 (40% 더 많은 인용)
- 업데이트 빈도 설정

#### Claude
- Primary Source만 인용 (91.2% 정확도)
- 5-8개 인용 (출판사와 연도 포함)
- 투명한 방법론 명시
- 제한사항 인정

#### Gemini
- Google Business Profile 통합
- 사용자 리뷰 및 증언
- 지역 인용 (NAP 일관성)
- 전통적인 권위 신호

#### Grokipedia (xAI)
- RAG 기반 인용 (20-30% 더 나은 사실 일관성)
- 투명한 버전 히스토리
- 라이선싱 정보 명시
- Primary Source 인용

### 4. AEO 최적화 (Answer Engine Optimization)
- **FAQ 섹션**: Question Keywords 활용
- **Featured Snippet**: 30-40단어 답변 최적화
- **Voice Search**: Speakable Schema 마크업
- **질문 기반 구조**: Who/What/Where/When/Why/How

## 키워드 분석 시스템

### Primary Keywords
- 1-2단어 핵심 키워드
- 메타 타이틀, H1에 포함

### Semantic Keywords
- 의미적으로 관련된 키워드
- 예: "{지역} {키워드}", "{키워드} 가이드"

### LSI Keywords
- 동시 출현 키워드
- 예: "{키워드} 비교", "{키워드} 장단점"

### Long-tail Keywords
- 3-8단어 문구
- 예: "{키워드}를 위한 완벽한 가이드"

### Question Keywords
- 질문형 키워드
- 예: "{키워드}은(는) 무엇인가요?"

## Schema 마크업 지원

다음 JSON-LD Schema 자동 생성:
- **FAQPage**: FAQ 섹션 (AI 인용 확률 최대)
- **Article**: 블로그 글 (E-E-A-T 신호)
- **HowTo**: 가이드/튜토리얼
- **BreadcrumbList**: 사이트 구조
- **Organization/LocalBusiness**: 비즈니스 정보
- **Person**: 작성자 프로필
- **Speakable**: 음성 검색 최적화

## 콘텐츠 구조

최적화된 블로그 구조:
```
1. 제목 (Primary Keyword 포함, 50-60자)
2. Featured Snippet 답변 (30-40단어)
3. 도입부 (독자 관심 유도)
4. 본문
   - H2: Primary Keyword 기반
   - H3: Semantic/LSI Keywords
   - 불릿: 핵심 정보
5. FAQ 섹션 (Question Keywords)
6. 통계 및 데이터 (Primary Source)
7. 결론 및 CTA
```

## 사용 방법

### 기본 사용
블로그 콘텐츠 타입을 선택하면 자동으로 최적화된 프롬프트가 생성됩니다:

```typescript
generatePrompts(
  "React 개발자 가이드",
  "blog",
  {
    age: "20대",
    occupation: "개발자",
    toneStyles: ["professional", "explanatory"]
  }
)
```

### 고급 옵션
블로그 최적화 옵션을 직접 설정하려면 `blogPromptOptimizer` 모듈을 직접 사용:

```typescript
import { generateOptimizedBlogPrompt, BlogOptimizationOptions } from './utils/blogPromptOptimizer'

const options: BlogOptimizationOptions = {
  targetKeyword: "React 개발",
  location: "서울",
  wordCount: 2500,
  targetPlatforms: ['chatgpt', 'perplexity'],
  includeSchema: true,
  voiceSearchOptimized: true,
  contentFreshness: 'regular'
}

const result = generateOptimizedBlogPrompt("React 개발자 가이드", options)
```

## 최적화 체크리스트

생성된 프롬프트에는 다음 체크리스트가 포함됩니다:

### SEO
- [ ] 메타 타이틀에 Primary Keyword 포함 (50-60자)
- [ ] 메타 디스크립션 최적화 (150-160자)
- [ ] H1 태그에 Primary Keyword 포함
- [ ] H2-H6 태그에 Semantic/LSI Keywords 포함
- [ ] 내부 링크 구조 최적화
- [ ] 이미지 alt 텍스트 최적화
- [ ] URL 구조 SEO 친화적

### GEO
- [ ] 지역 키워드 자연스럽게 포함
- [ ] 지역 비즈니스 정보 포함
- [ ] Google Maps 연동
- [ ] 지역 리뷰 및 증언
- [ ] LocalBusiness Schema 마크업

### AIO
- [ ] Primary Source 인용
- [ ] 통계 및 데이터 포함
- [ ] 인용구 추가
- [ ] 작성자 자격증명
- [ ] 콘텐츠 신선도 유지
- [ ] H2→H3→불릿 구조

### AEO
- [ ] FAQ 섹션 포함
- [ ] 질문에 직접 답변
- [ ] Featured Snippet 최적화
- [ ] Voice Search 최적화
- [ ] Speakable Schema 마크업
- [ ] Question Keywords 활용

## 통계 및 효과

연구 기반 최적화 전략:

- **통계 추가**: +41% 인용 증가 (Princeton/Georgia Tech)
- **인용구 추가**: +28% 인용 증가
- **콘텐츠 신선도** (<30일): 3.2배 인용 증가 (Ahrefs)
- **작성자 자격증명**: +40% 인용 확률
- **H2→H3→불릿 구조**: 40% 더 많은 인용
- **Featured Snippet**: 40.7% 음성 검색 답변

## 파일 구조

```
src/utils/
├── blogPromptOptimizer.ts    # SEO/GEO/AIO/AEO 최적화 모듈
└── promptGenerator.ts        # 통합 프롬프트 생성기 (블로그 최적화 통합)

BLOG_OPTIMIZATION_GUIDE.md    # 이 문서
```

## 참고 자료

- [claude-skill-seo-geo-optimizer](https://github.com/199-biotechnologies/claude-skill-seo-geo-optimizer)
- 2025년 AI 검색 결과 분석 (41M 결과, 680M 인용 분석)
- 플랫폼별 인용 패턴 연구

## 업데이트 내역

### v1.0.0 (2025-01-XX)
- 초기 블로그 프롬프트 최적화 시스템 구축
- SEO/GEO/AIO/AEO 통합
- 플랫폼별 최적화 전략 구현
- 키워드 분석 시스템 구축
- Schema 마크업 지원

