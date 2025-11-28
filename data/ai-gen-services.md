# AI 생성(이미지/동영상) 서비스·API 리스트 (운영용)

- 생성일: 2025-11-28 11:00 UTC+09:00
- 목적: 서비스 개발(제품/플랫폼)에 **즉시 반영 가능한** 형태로, 이미지·동영상 생성 AI 서비스와 API 문서를 관리합니다.
- 업데이트 원칙: **정기 자동화**로 신규/변경/중단을 감지하고, 링크 유효성 및 API 제공 여부를 재검증합니다.

---

## 0) 데이터 스키마(권장)

서비스 목록은 아래 필드를 표준화해 관리합니다.

- `category`: `image` | `video`
- `service_name`: 서비스/플랫폼명
- `homepage_url`: 공식 홈/제품 페이지
- `api_docs_url`: 공식 API 문서/레퍼런스(가능하면 “API Reference”)
- `provider`: OpenAI / Google / Adobe / AWS / 기타
- `api_status`: `public` | `gated` | `unknown`
- `auth_type`: `api_key` | `oauth` | `aws_sigv4` | `unknown`
- `notes`: 제한사항/계약조건/특이사항
- `last_verified_at`: 마지막으로 링크·상태 검증한 시각(ISO8601)
- `http_status_home`: 200/301/403/404 등
- `http_status_docs`: 200/301/403/404 등
- `fingerprint`: `sha256(service_name + api_docs_url)` 등 (중복 방지)

---

## 1) AI 이미지 생성 모델/서비스

| 서비스 명 | URL | API 페이지 URL |
|---|---|---|
| OpenAI (GPT Image 1 / Images API) | https://platform.openai.com/ | https://platform.openai.com/docs/guides/image-generation |
| OpenAI (Images API Reference) | https://platform.openai.com/ | https://platform.openai.com/docs/api-reference/images |
| Adobe Firefly Services (Firefly API) | https://business.adobe.com/products/firefly-business/firefly-services.html | https://developer.adobe.com/firefly-services/docs/firefly-api/ |
| Adobe Firefly (Image Generation V3 Async) | https://business.adobe.com/products/firefly-business/firefly-services.html | https://developer.adobe.com/firefly-services/docs/firefly-api/guides/api/image_generation/V3_Async/ |
| Stability AI (Developer Platform) | https://platform.stability.ai/ | https://platform.stability.ai/docs/api-reference |
| Stability AI (Stable Image – Getting Started) | https://platform.stability.ai/ | https://platform.stability.ai/docs/getting-started/stable-image |
| Google Gemini API (Imagen) | https://ai.google.dev/ | https://ai.google.dev/gemini-api/docs/imagen |
| Ideogram | https://ideogram.ai/ | https://developer.ideogram.ai/ |
| Ideogram (Generate v3 API Reference) | https://ideogram.ai/ | https://developer.ideogram.ai/api-reference/api-reference/generate-v3 |
| Leonardo.Ai | https://leonardo.ai/ | https://docs.leonardo.ai/docs/getting-started |
| Luma Dream Machine | https://lumalabs.ai/dream-machine | https://docs.lumalabs.ai/docs/api |
| Runway (Images 포함) | https://runwayml.com/api | https://docs.dev.runwayml.com/api |
| fal.ai (Model APIs: 다수 이미지 모델) | https://fal.ai/ | https://docs.fal.ai/model-apis |
| Replicate (모델 마켓 + 실행 API) | https://replicate.com/ | https://replicate.com/docs/reference/http |
| Hugging Face (Inference Providers) | https://huggingface.co/ | https://huggingface.co/docs/inference-providers/en/index |
| Amazon Bedrock (이미지 포함) | https://docs.aws.amazon.com/bedrock/ | https://docs.aws.amazon.com/bedrock/latest/userguide/getting-started-api.html |

---

## 2) AI 동영상 생성 모델/서비스

| 서비스 명 | URL | API 페이지 URL |
|---|---|---|
| OpenAI (Sora Video API) | https://platform.openai.com/ | https://platform.openai.com/docs/guides/video-generation |
| OpenAI (Videos API Reference) | https://platform.openai.com/ | https://platform.openai.com/docs/api-reference/videos |
| Google Vertex AI (Veo Video Generation API) | https://cloud.google.com/vertex-ai | https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/veo-video-generation |
| Google Gemini API (Veo 3.1 Video) | https://ai.google.dev/ | https://ai.google.dev/gemini-api/docs/video |
| Runway | https://runwayml.com/api | https://docs.dev.runwayml.com/api |
| Luma Dream Machine (Video) | https://lumalabs.ai/dream-machine | https://docs.lumalabs.ai/docs/video-generation |
| Luma Dream Machine (API) | https://lumalabs.ai/dream-machine | https://docs.lumalabs.ai/docs/api |
| Adobe Firefly (Generate Video API) | https://business.adobe.com/products/firefly-business/firefly-services.html | https://developer.adobe.com/firefly-services/docs/firefly-api/guides/api/generate_video/V3_Async/ |
| Adobe Firefly (Audio/Video API Reference) | https://developer.adobe.com/audio-video-firefly-services/ | https://developer.adobe.com/audio-video-firefly-services/api/ |
| Amazon Bedrock (Luma Ray 2 – Video) | https://docs.aws.amazon.com/bedrock/ | https://docs.aws.amazon.com/ko_kr/bedrock/latest/userguide/model-parameters-luma.html |
| Leonardo.Ai (Image/Video API) | https://leonardo.ai/api/ | https://docs.leonardo.ai/docs/getting-started |
| fal.ai (Model APIs: 다수 비디오 모델) | https://fal.ai/ | https://docs.fal.ai/model-apis/model-endpoints |
| Replicate (비디오 모델 포함) | https://replicate.com/ | https://replicate.com/docs |

---

## 3) 정기 업데이트 자동화(권장 아키텍처)

### 3.1 기본 전략
1. **소스 수집(Discovery)**  
   - “AI image generation API”, “video generation API”, “Sora API”, “Veo API”, “Firefly API” 등으로 웹 검색/뉴스/공식 블로그 업데이트를 수집
2. **후보 정규화(Normalize)**  
   - 서비스명/홈/문서 URL 추출 → 표준 스키마로 정규화
3. **검증(Validate)**  
   - URL 유효성(HTTP status), 리다이렉트 추적, 공식 도메인 확인, API 문서 여부(키워드 기반) 확인
4. **비교(Diff)**  
   - 기존 리스트와 비교해 변경점(New/Changed/Removed) 산출
5. **저장(Store)**  
   - Git/Repo의 `.md` + 별도 `services.json`(또는 Sheet) 동기화
6. **알림(Notify)**  
   - Slack/Email/Notion 업데이트 로그 + 변경 요약 전송

### 3.2 n8n 기준 워크플로(예시)
- Trigger: Cron (매일 09:10 KST 또는 매주 월 09:10 KST)
- Nodes:
  1) **Set**: 기본 Query/Seed 구성
  2) **HTTP Request / Search API**: 검색 결과 수집 (SerpAPI, Google Custom Search, Brave Search 등)
  3) **Function**: 결과에서 URL 후보 추출/정규화
  4) **HTTP Request (HEAD/GET)**: 링크 상태 검증 및 리다이렉트 추적
  5) **IF**: 조건 통과 여부 분기(아래 “조건문” 참고)
  6) **OpenAI / LLM Node**: 서비스명/카테고리/프로바이더/노트 요약(정해진 포맷으로만)
  7) **Merge + Dedup**: fingerprint 기준으로 중복 제거
  8) **Diff**: 기존 데이터(JSON/Sheet)와 비교
  9) **Markdown Render**: 이 문서(표 포함) 업데이트 텍스트 생성
 10) **GitHub / Drive / Docs**: 저장
 11) **Slack/Email**: 변경 요약 알림

---

## 4) 조건문(Validation Rules) — 자동화에 반드시 포함할 것

아래 조건은 “수집된 후보”를 프로덕션에 넣기 전에 필터링하는 목적입니다.  
n8n `IF` 노드 또는 `Function` 노드로 그대로 구현할 수 있습니다.

### 4.1 URL 형식 조건
- [필수] `homepage_url`과 `api_docs_url`은 **https** 로 시작해야 한다.
- [필수] `api_docs_url`은 아래 키워드 중 하나를 포함해야 한다(대소문자 무관):
  - `api`, `docs`, `documentation`, `reference`, `developer`
- [제외] 이미지 파일 확장자/정적 리소스는 제외:
  - `.png .jpg .jpeg .gif .webp .svg .ico .pdf` (PDF는 별도 예외 처리 시만 허용)

### 4.2 HTTP 상태 조건(링크 유효성)
- [통과] `http_status`가 **200** 또는 **301/302(리다이렉트 후 최종 200)** 인 경우만 통과
- [보류/재시도] 429/503은 **재시도(예: 3회, 지수 백오프)** 후 실패 시 `api_status=unknown`
- [실패] 404/410은 즉시 제거 후보로 표시

### 4.3 공식성(Official) 조건
- [필수] `api_docs_url`의 도메인이 **공식 도메인 후보군**과 일치하거나, 공식 홈에서 링크로 연결되는 문서여야 한다.
  - 예: `openai.com`, `platform.openai.com`, `ai.google.dev`, `cloud.google.com`, `developer.adobe.com`, `docs.aws.amazon.com` 등
- [경고] 공식이 아닌 “블로그/미러 문서”는 `notes`에 표시하고 기본 리스트에는 제외(옵션).

### 4.4 API 제공 여부 조건(서비스 등급화)
- [public] 로그인 후 즉시 발급 가능한 공개 API 문서/레퍼런스가 확인됨
- [gated] “limited availability”, “waitlist”, “enterprise only” 등 제한이 명시됨
- [unknown] 문서 접근이 403/로그인 강제 또는 상태 확인 불가

---

## 5) n8n용 Function Node 예시(조건문 코드)

아래 코드는 후보 리스트를 받아 **통과/보류/제외**로 나누는 예시입니다.  
(필요 시 그대로 복사해 Function Node에 사용)

```js
// Input: items[] where item.json has
// { service_name, homepage_url, api_docs_url, category, http_status_home, http_status_docs }

const IMAGE_EXT = /\.(png|jpg|jpeg|gif|webp|svg|ico)(\?.*)?$/i;
const PDF_EXT   = /\.(pdf)(\?.*)?$/i; // 기본 제외, 허용하려면 옵션 처리
const MUST_HAVE_DOC_KEYWORD = /(api|docs|documentation|reference|developer)/i;

function isHttps(url) {
  return typeof url === 'string' && url.startsWith('https://');
}
function isBadAsset(url) {
  return IMAGE_EXT.test(url) || PDF_EXT.test(url);
}
function isOkStatus(s) {
  // allow 200, or 301/302 with later link-follow handled upstream
  return [200, 301, 302].includes(Number(s));
}

return items.map((item) => {
  const j = item.json || {};
  const homepage = j.homepage_url;
  const docs = j.api_docs_url;

  // 기본 실패 사유 수집
  const reasons = [];

  if (!isHttps(homepage)) reasons.push('homepage_not_https');
  if (!isHttps(docs)) reasons.push('docs_not_https');

  if (!MUST_HAVE_DOC_KEYWORD.test(docs || '')) reasons.push('docs_keyword_missing');
  if (isBadAsset(docs || '')) reasons.push('docs_points_to_asset');

  if (!isOkStatus(j.http_status_home)) reasons.push('homepage_http_bad');
  if (!isOkStatus(j.http_status_docs)) reasons.push('docs_http_bad');

  // 분기 기준
  let verdict = 'pass';
  if (reasons.length) verdict = 'reject';

  // 429/503은 보류로 분리(재시도 큐로 보냄)
  const ds = Number(j.http_status_docs);
  if ([429, 503].includes(ds)) verdict = 'hold';

  return {
    json: {
      ...j,
      verdict,
      reasons,
      last_verified_at: new Date().toISOString()
    }
  };
});
```

---

## 6) 변경 감지(Diff) 규칙(권장)

- `fingerprint = sha256(category + '|' + service_name + '|' + api_docs_url)` 로 고유키를 만든다.
- Diff 분류:
  - `NEW`: fingerprint가 신규
  - `CHANGED`: fingerprint는 동일하지만 `api_docs_url` 또는 `homepage_url` 리다이렉트/변경
  - `REMOVED`: 기존에는 있었으나 이번 검증에서 `reject` 또는 404/410으로 확정

알림 메시지에는 아래를 포함:
- NEW/CHANGED/REMOVED 개수
- CHANGED는 “이전 URL → 신규 URL”
- Removed는 사유(404, 도메인 변경, API 중단 등)

---

## 7) 운영 팁(프로덕션 관점)

- 링크 검증은 **HEAD 우선**, 실패 시 GET으로 폴백. (일부 서버가 HEAD 미지원)
- 검색결과만으로 확정하지 말고, 가능하면 **공식 홈 → 문서로의 연결** 관계를 확인.
- 문서가 로그인/권한 필요(403)인 경우가 있어 `gated/unknown` 상태 분리를 반드시 유지.
- 최종 산출물은
  - 사람용: 이 `.md` (표 + 변경 로그)
  - 시스템용: `services.json` (스키마 준수, 자동화 파이프라인 입력)

---

## 8) 다음 단계(원하면 바로 제공 가능)
- 위 스키마 기반으로 `services.json` 템플릿 생성
- n8n 워크플로(크론 → 검색 → 검증 → Diff → GitHub/Drive 저장 → Slack 알림) JSON 블루프린트 제공
- “D-1 기준(어제 업데이트만 반영)” 필터링 룰을 검색/뉴스 쿼리에 포함하도록 확장
