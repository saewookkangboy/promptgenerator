# Agent Lightning 프롬프트 최적화 서버

이미지/동영상 프롬프트의 정확성과 품질을 향상시키기 위한 Agent Lightning 통합 서버입니다.

## 설치

```bash
cd agent-lightning
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 실행

```bash
# 개발 모드
uvicorn main:app --reload --port 8001

# 프로덕션 모드
python main.py
```

## API 엔드포인트

### 1. 프롬프트 최적화

```bash
POST /optimize
Content-Type: application/json

{
  "prompt": "a beautiful sunset",
  "category": "image",
  "model": "midjourney",
  "options": {}
}
```

**응답:**
```json
{
  "original_prompt": "a beautiful sunset",
  "optimized_prompt": "a beautiful sunset, 4k, ultra detailed, professional composition, cinematic lighting --v 6 --style raw",
  "improvements": [
    "고해상도 키워드 추가",
    "Midjourney 버전 및 스타일 파라미터 추가",
    "전문적인 구도 및 조명 지시 추가"
  ],
  "quality_score": 95.0,
  "confidence": 0.8,
  "recommendations": ["blurry", "low quality"]
}
```

### 2. 템플릿 추천

```bash
POST /recommend-templates
Content-Type: application/json

{
  "user_input": "portrait photo",
  "category": "image",
  "model": "midjourney"
}
```

## Agent Lightning 통합

이 서버는 Microsoft의 Agent Lightning을 사용하여:
- **Span 추적**: 프롬프트 최적화 이벤트를 자동으로 기록
- **보상 시스템**: 사용자 피드백 기반 보상 계산 및 기록
- **강화학습**: 지속적인 학습을 통한 프롬프트 개선
- **자동 최적화**: 학습된 패턴을 기반으로 프롬프트 자동 개선
- **LightningStore**: 중앙 집중식 데이터 저장 및 관리
- **Trainer**: 학습 루프 자동 관리

## 환경 변수

```env
PORT=8001
LIGHTNING_STORE_URL=sqlite:///lightning_store.db  # Agent Lightning Store URL (기본값: SQLite)
# 또는 PostgreSQL 사용 시:
# LIGHTNING_STORE_URL=postgresql://user:password@localhost/lightning_store
```

## 새로운 기능

### 1. 피드백 제출 API

사용자 피드백을 제출하여 보상을 기록하고 학습을 개선합니다:

```bash
POST /feedback
Content-Type: application/json

{
  "task_id": "task_image_1234",
  "span_id": "span_5678",
  "reward": 0.8,
  "feedback_text": "매우 만족합니다",
  "metadata": {
    "rating": 5,
    "used_result": true
  }
}
```

### 2. 학습 상태 조회

현재 학습 상태를 확인합니다:

```bash
GET /training/status
```

**응답:**
```json
{
  "agent_lightning_available": true,
  "store_available": true,
  "trainer_available": true,
  "training_active": false,
  "total_spans": 150,
  "total_rewards": 120,
  "average_reward": 0.75
}
```

### 3. 수동 학습 트리거

학습을 수동으로 시작합니다:

```bash
POST /training/trigger
```

## 강화학습 워크플로우

1. **프롬프트 최적화 요청**: `/optimize` 엔드포인트로 프롬프트 최적화
2. **Span 기록**: Agent Lightning이 자동으로 Span을 생성하고 기록
3. **사용자 피드백**: 사용자가 결과에 대한 피드백을 `/feedback`으로 제출
4. **보상 기록**: 피드백이 보상으로 변환되어 기록됨
5. **자동 학습**: Trainer가 주기적으로 학습 데이터를 분석하고 최적화 전략 개선
6. **지속적 개선**: 다음 최적화 요청 시 학습된 패턴이 자동으로 적용됨

