# 프리미엄 고도화 기능 구현 계획

본 문서는 `PREMIUM_FEATURES.md`에 제안된 기능 중 **즉시 적용 가능하면서 LLM 최신 흐름과 차별화 포인트가 명확한 3가지 과제**에 대한 구현 계획을 정리합니다.

---

## 1. 표준 메타/컨텍스트 템플릿 & Wizard

### 기능 목표
- 모든 콘텐츠 카테고리에서 동일한 템플릿 구조(목표·대상·제약·톤·출력)를 적용해 **Prompt CRM** 역할을 수행.
- 단계별 Wizard UI로 초보자도 자연스럽게 프롬프트를 완성하도록 안내.

### 구현 범위
1. **데이터 스키마**
   - `PromptTemplate` / `PromptTemplateSection` 타입을 확장(이미 도입됨)하고, API 응답에서도 동일 스키마 사용.
   - 템플릿 저장 시 JSON Schema 검증(예: Zod) 추가.
2. **UI/UX**
   - `PromptGenerator`와 `EngineeringPromptGenerator`에 Wizard 토글 + 단계별 진행 상태 표시.
   - 모바일 대응(세로 스텝 네비게이션) 및 접근성 향상(ARIA, 키보드 포커스 이동).
3. **API/스토리지**
   - Admin에서 템플릿 프리셋 CRUD 가능하도록 `/api/templates` 엔드포인트 설계.
   - 로컬스토리지/IndexedDB에 최근 템플릿 사용 내역 저장 → Wizard 첫 단계에서 추천.

### 기술 스택 & 의존성
- React + Zustand/Context(상태 공유), TypeScript 타입 강화.
- 서버: Express + Prisma 기반 `prompt_templates` 테이블 신설.
- Validation: Zod + JSON Schema.

### 리스크 및 대응
- **Wizard 진입 시 UX 복잡도 증가** → 토글 기본값을 "가이드 모드"로 두되, 사용자 선택 기억(로컬스토리지) 적용.
- **템플릿 버전 관리 필요** → `version` 필드 추가해 Admin에서 rollback 가능하도록 설계.

### 세부 UX 플로우 (와이어프레임 가이드)
1. **Step 1 – 목표 & 채널**
   - Component: `WizardStepHeader`, `ChannelSelectCardList`
   - Input: 채널 선택, 사용 목적(드롭다운) → `selectedChannel`, `goal`
   - Output: 우측 패널에 실시간 템플릿 프리뷰(목표/출력 구조 자동 반영)
2. **Step 2 – 타겟 & 톤**
   - Component: `AudienceFormGrid` (Age/Gender/Occupation/Interests), `ToneGrid`
   - Interaction: Tone 카드 다중 선택 + 미리보기 문장
   - Validation: 최소 하나의 타겟 또는 톤 선택 시 다음 단계 활성화
3. **Step 3 – 자연어 프롬프트**
   - Component: `PromptTextarea`, `GuidelineChips`, `TokenMeter`
   - UX: 최근 프롬프트 히스토리 탭에서 drag&drop으로 컨텍스트 추가 가능
4. **Step 4 – 구조화 결과**
   - Component: `StructuredPromptCard` 2종 (메타/컨텍스트), `QualityBadge`
   - Actions: Copy, Save as Template, Export(JSON)

### 데이터/상태 흐름
```
WizardState {
  channel: ContentType
  goal: string
  audience: { age?: string; gender?: string; occupation?: string; interests?: string[] }
  toneStyles: ToneStyle[]
  prompt: string
  templatePreview: PromptTemplate
}
```
상태 관리: `useReducer` + Context → 하위 컴포넌트에서 dispatch, 마지막 단계에서 generator 호출.

---

## 2. DeepL + LLM 요약 파이프라인

### 기능 목표
- 한국어 입력 → DeepL 변환 → LLM 요약으로 **자연스러운 EN 템플릿 + 토큰 절감**을 동시에 달성.
- 번역/요약 결과에 대한 **로그 및 모니터링** 확보.

### 구현 범위
1. **파이프라인 설계**
   - `translateTextMap` → DeepL 번역 결과를 받아 `summarizeContext(text[])` (OpenAI/Anthropic API)로 후처리.
   - 요약 길이/토큰 사용량/응답시간을 `logs/pipeline.log`에 JSON 라인으로 기록.
2. **Fallback 전략**
   - DeepL 실패 시 기존 Native English 변환(`convertToNativeEnglish`) 사용.
   - 요약 실패 시 번역 결과 그대로 사용하고, UI에 경고 토스트 출력.
3. **UI 표시**
   - 결과 카드에 “DeepL + Compress” 배지 표시, 토큰 절감률(%), 처리 시간(ms) 표시.

### 단계별 처리 흐름 (시퀀스)
```
Client -> Server /api/translate -> DeepL -> Server
Server -> LLM Summarizer (optional) -> Server
Server -> Client (translations + metadata)
Client -> UI 렌더링 (배지/토큰절감/로그 링크)
```

1. **요청 수신**
   - `POST /api/translate` payload에 `texts[]`, `compress=true`, `context="meta|context|hashtags"` 등 메타정보 추가.
2. **DeepL 변환**
   - 병렬 호출(최대 batch 50개) → 실패 시 재시도(최대 2회, exponential backoff).
3. **LLM 요약**
   - `compress=true`일 경우 `POST /api/llm/summarize`로 내부 호출.
   - 모델 기본값: `gpt-4o-mini`(OpenAI) / 대체: `claude-3.5-haiku`.
   - Prompt 템플릿: “Summarize for prompt context, keep key instructions, max 120 tokens”.
4. **메타데이터 기록**
   - `pipeline_log` 테이블 또는 `logs/pipeline.log`에 JSON append:
     ```json
     {
       "id": "uuid",
       "timestamp": "...",
       "texts": 2,
       "deepl_ms": 820,
       "llm_ms": 410,
       "tokens_in": 580,
       "tokens_out": 190,
       "compression": 0.67,
       "status": "success"
     }
     ```
5. **응답 구조**
   ```json
   {
     "translations": ["...", "..."],
     "metadata": {
       "deeplMs": 820,
       "llmMs": 410,
       "compressionRatio": 0.67,
       "tokenSaved": 390
     }
   }
   ```

### 모니터링 & 알림
- **Dashboards**
  - Grafana/Metabase에 `compressionRatio`, `successRate`, `avgLatency` 차트.
- **Alerts**
  - DeepL error rate > 10% → Slack 알림.
  - LLM 비용이 하루 $10 이상 → 이메일 리포트.

### 보안/비용 고려
- API 키는 `server/.env`에서 관리, Vault 연계 고려.
- LLM 호출 전 `token_estimator`로 예상 비용 계산, 임계값 초과 시 요약 생략.

### 개발 단계
1. Server 파이프라인 모듈 (`services/translationPipeline.ts`)
2. Logging + Dashboard 설정
3. Client UI 업데이트 (배지/토큰 절감 표시)
4. 부하/비용 테스트 → 운영 플래그 `ENABLE_LLM_COMPRESS`

### 기술 스택 & 의존성
- DeepL REST API (기존 키 활용), OpenAI GPT-4o-mini 또는 Claude 3 Sonnet으로 요약.
- 서버에서 파이프라인 실행 → 클라이언트는 번역 완료된 데이터만 수신.

### 리스크 및 대응
- **LLM API 비용 증가** → 토큰 절감률이 일정 이하일 경우 요약 생략하도록 임계값 설정.
- **API 지연** → 비동기 파이프라인 + SSE(WebSocket) 고려, 우선은 로딩 스피너 및 타임아웃(5초) 설정.

---

## 3. 품질 피드백 엔진 & 실험 기록

### 기능 목표
- 생성된 메타/컨텍스트 프롬프트를 규칙 기반으로 즉시 점검하고(구체성, 길이, 금지어 등), A/B 실험 결과까지 저장하는 **Prompt QA + Experiment Vault** 구축.

### 구현 범위
1. **품질 규칙 엔진**
   - `qualityRules.ts`에 규칙 정의: 최소 글자 수, 금지어 리스트, 톤 일관성, CTA 포함 여부 등.
   - 결과 객체에 `qualityScore`, `issues[]`, `recommendations[]` 추가.
2. **LLM 기반 검증(옵션)**
   - “LLM-as-a-Judge” 플래그가 켜져 있으면 GPT-4o-mini를 호출해 품질 평가(0~5점)와 개선 문장 생성.
3. **실험 기록**
   - `prompt_experiments` 테이블 신설: `variant`, `inputId`, `performance`, `qualityScore` 등 저장.
   - UI에서 버전별 비교 그래프(성공률/CTR 등) 제공, 승자 선정 로직 추가.
4. **알림/보고**
   - 품질 점수가 임계값 미만이면 토스트 + 경고 배지.
   - Admin 대시보드에 실험 결과 요약 카드 추가.

### 기술 스택 & 의존성
- 규칙 엔진: TypeScript + JSON 규칙 파일.
- LLM 검증: OpenAI/Anthropic API, 비용 제어를 위한 샘플링 설정.
- 데이터 시각화: Recharts 혹은 ECharts.

### 리스크 및 대응
- **과도한 검증으로 속도 저하** → 규칙 엔진은 클라이언트에서 동기 실행, LLM 평가는 비동기(스핀업 후 결과 표시).
- **실험 데이터 스키마 복잡성** → 최소 필드부터 저장하고, 추가 KPI는 컬럼 확장으로 대응.

---

## 공통 일정 및 리소스 제안
| 기능 | 예상 기간 | 필요 리소스 | 비고 |
|------|-----------|-------------|------|
| 템플릿 & Wizard | 2주 | 프론트 1, 백엔드 1 | 기존 타입 확장 완료, UI 집중 |
| DeepL+LLM 파이프라인 | 2~3주 | 백엔드 1, DevOps 0.5 | 로그/모니터링 포함 |
| 품질 피드백 & 실험 | 3주 | 프론트 1, 백엔드 1, 데이터 0.5 | KPI 대시보드 포함 |

총 6~8주, 2~3인 크로스 팀으로 스프린트 운영 시 충분히 단계적 롤아웃 가능.

---

## 다음 단계 권장 액션
1. `PREMIUM_FEATURES.md`와 본 문서를 바탕으로 Phase 1 백로그 정식 확정.
2. DeepL/LLM API 비용 예산 산정 및 한도 설정.
3. Wizard/템플릿 UI 와이어프레임, 품질 규칙 정의 세션 진행.

필요 시 각 기능별 세부 작업 항목(Jira/Linear 티켓)으로 분할해 드릴 수 있습니다. 문의 주세요!

