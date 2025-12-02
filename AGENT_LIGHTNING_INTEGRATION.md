# Agent Lightning 통합 가이드

Microsoft의 Agent Lightning을 프롬프트 생성 시스템에 통합하여 이미지/동영상 프롬프트의 정확성과 품질을 향상시킵니다.

## 개요

Agent Lightning은 강화학습 기반으로 AI 에이전트를 최적화하는 도구입니다. 이를 프롬프트 생성 시스템에 통합하여:

1. **프롬프트 최적화**: 생성된 프롬프트를 자동으로 개선
2. **템플릿 추천**: 사용자 입력에 맞는 최적의 템플릿 추천
3. **품질 점수**: 프롬프트의 품질을 수치로 평가
4. **지속적 학습**: 사용자 피드백을 통해 지속적으로 개선

## 아키텍처

```
┌─────────────────┐
│  Frontend       │
│  (React)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Node.js Server │
│  (Express)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Python Server  │
│  (FastAPI +     │
│   Agent         │
│   Lightning)    │
└─────────────────┘
```

## 설치 및 설정

### 1. Python 환경 설정

```bash
cd agent-lightning
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. 환경 변수 설정

`.env` 파일에 다음 변수 추가:

```env
# Agent Lightning 서버 URL
AGENT_LIGHTNING_URL=http://localhost:8001

# Python 서버 포트 (선택)
PORT=8001
```

### 3. 서버 실행

**Python 서버 (Agent Lightning):**
```bash
cd agent-lightning
uvicorn main:app --reload --port 8001
```

**Node.js 서버:**
```bash
npm start
```

## API 사용법

### 프롬프트 최적화

```typescript
import { promptOptimizerAPI } from '@/utils/api'

const result = await promptOptimizerAPI.optimize({
  prompt: "a beautiful sunset",
  category: "image",
  model: "midjourney",
  options: {}
})

console.log(result.data.optimized_prompt)
console.log(result.data.quality_score)
console.log(result.data.improvements)
```

### 템플릿 추천

```typescript
const recommendations = await promptOptimizerAPI.recommendTemplates({
  user_input: "portrait photo",
  category: "image",
  model: "midjourney"
})

console.log(recommendations.data.recommended_templates)
```

## 프론트엔드 통합

### 이미지 프롬프트 생성기

`ImagePromptGenerator.tsx`에서 프롬프트 생성 후 최적화:

```typescript
// 프롬프트 생성 후
const optimized = await promptOptimizerAPI.optimize({
  prompt: generatedPrompt,
  category: 'image',
  model: selectedModel
})

// 최적화된 프롬프트 표시
setOptimizedPrompt(optimized.data.optimized_prompt)
```

### 동영상 프롬프트 생성기

`VideoPromptGenerator.tsx`에서도 동일하게 적용:

```typescript
const optimized = await promptOptimizerAPI.optimize({
  prompt: generatedPrompt,
  category: 'video',
  model: selectedModel
})
```

## 최적화 기능

### 이미지 프롬프트 최적화

- 고해상도 키워드 자동 추가 (4k, 8k)
- 모델별 파라미터 최적화 (Midjourney: --v, --style)
- 구도 및 조명 개선
- 부정 프롬프트 제안

### 동영상 프롬프트 최적화

- 모션 및 움직임 표현 개선
- 카메라 워크 추가
- 일관성 강화
- 프레임 레이트 명시

### 텍스트 프롬프트 최적화

- 구조화 및 명확성 개선
- 출력 형식 명시
- 전문성 향상

## Agent Lightning 기능

### 이벤트 기록

프롬프트 최적화 이벤트가 자동으로 기록되어:
- 사용 패턴 분석
- 최적화 효과 측정
- 지속적 개선

### 강화학습 (향후 구현)

사용자 피드백을 기반으로:
- 프롬프트 템플릿 자동 개선
- 모델별 최적화 전략 학습
- 품질 점수 예측 정확도 향상

## 배포

### Railway 배포

1. Python 서버를 별도 서비스로 배포하거나
2. Node.js 서버와 함께 배포 (Docker 사용)

### Docker 설정 예시

```dockerfile
# agent-lightning/Dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

## 문제 해결

### Agent Lightning 서버 연결 실패

서버가 응답하지 않으면 기본 최적화가 자동으로 제공됩니다.

### Python 의존성 오류

```bash
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

## 참고 자료

- [Agent Lightning GitHub](https://github.com/microsoft/agent-lightning)
- [Agent Lightning 문서](https://microsoft.github.io/agent-lightning/)
- [FastAPI 문서](https://fastapi.tiangolo.com/)

