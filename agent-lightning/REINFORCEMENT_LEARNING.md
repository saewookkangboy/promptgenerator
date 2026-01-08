# Agent Lightning 강화학습 통합 가이드

이 문서는 Agent Lightning을 사용한 지속적인 AI 강화학습 및 심화학습 구현에 대한 상세 가이드입니다.

## 개요

Agent Lightning은 Microsoft에서 개발한 AI 에이전트 훈련 프레임워크로, **ZERO CODE CHANGE**로 에이전트를 최적화할 수 있습니다. 이 프로젝트에서는 프롬프트 최적화 시스템에 강화학습을 통합하여 지속적으로 개선되는 AI 시스템을 구축했습니다.

## 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    사용자 요청                            │
│              (프롬프트 최적화 요청)                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              FastAPI 서버 (main.py)                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │  1. 프롬프트 최적화 로직 실행                      │  │
│  │  2. Agent Lightning Span 생성 및 기록              │  │
│  │  3. 최적화된 프롬프트 반환                         │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Agent Lightning                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Span 추적    │  │ 보상 시스템  │  │ LightningStore│  │
│  │ (emit_span)  │  │ (emit_reward)│  │ (데이터 저장) │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              사용자 피드백                                │
│              (/feedback API)                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Trainer (학습 루프)                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  1. 보상 데이터 분석                              │  │
│  │  2. 최적화 전략 개선                              │  │
│  │  3. 학습된 패턴 저장                              │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              지속적 개선                                  │
│              (다음 최적화 요청에 자동 적용)                │
└─────────────────────────────────────────────────────────┘
```

## 핵심 기능

### 1. Span 추적 시스템

모든 프롬프트 최적화 작업을 Span으로 추적합니다:

```python
def emit_prompt_span(
    prompt: str,
    optimized_prompt: str,
    category: str,
    model: Optional[str] = None,
    task_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Optional[str]:
    """프롬프트 최적화 Span 기록"""
    span = agl.emit_span(
        name=f"prompt_optimization_{category}",
        metadata={
            "original_prompt": prompt,
            "optimized_prompt": optimized_prompt,
            "category": category,
            "model": model,
            **metadata
        },
        task_id=task_id
    )
    return span.span_id
```

### 2. 보상 시스템

사용자 피드백을 기반으로 보상을 계산하고 기록합니다:

```python
def calculate_reward_from_feedback(
    quality_score: float,
    user_rating: Optional[float] = None,
    user_feedback: Optional[Dict[str, Any]] = None
) -> float:
    """사용자 피드백 기반 보상 계산"""
    # 기본 보상: 품질 점수를 -1 ~ 1 범위로 정규화
    base_reward = (quality_score / 100.0) * 2.0 - 1.0
    
    # 사용자 평점이 있으면 가중 평균
    if user_rating is not None:
        user_reward = (user_rating / 5.0) * 2.0 - 1.0
        base_reward = base_reward * 0.4 + user_reward * 0.6
    
    # 피드백 기반 조정
    if user_feedback:
        if user_feedback.get("satisfied", False):
            base_reward = min(base_reward + 0.2, 1.0)
        if user_feedback.get("used_result", False):
            base_reward = min(base_reward + 0.1, 1.0)
    
    return max(-1.0, min(1.0, base_reward))
```

### 3. 학습된 최적화 전략 적용

과거 학습 데이터를 기반으로 최적화 전략을 개선합니다:

```python
def get_learned_optimizations(
    category: str,
    model: Optional[str] = None
) -> Dict[str, Any]:
    """학습된 최적화 전략 조회"""
    # LightningStore에서 학습된 패턴 조회
    # 예: 특정 키워드 조합이 높은 보상을 받았는지 등
    return {
        "learned_keywords": ["cinematic", "professional"],
        "learned_patterns": [...],
        "confidence": 0.85
    }
```

## 사용 예제

### 예제 1: 프롬프트 최적화 및 피드백 제출

```python
import requests

# 1. 프롬프트 최적화 요청
response = requests.post("http://localhost:8001/optimize", json={
    "prompt": "a beautiful sunset",
    "category": "image",
    "model": "midjourney",
    "options": {}
})

result = response.json()
print(f"최적화된 프롬프트: {result['optimized_prompt']}")
print(f"품질 점수: {result['quality_score']}")
print(f"Task ID: {result.get('task_id')}")
print(f"Span ID: {result.get('span_id')}")

# 2. 사용자 피드백 제출
if result.get('span_id'):
    feedback_response = requests.post("http://localhost:8001/feedback", json={
        "task_id": result['task_id'],
        "span_id": result['span_id'],
        "reward": 0.9,  # -1 ~ 1 범위
        "feedback_text": "매우 만족합니다. 결과를 사용했습니다.",
        "metadata": {
            "rating": 5,
            "satisfied": True,
            "used_result": True
        }
    })
    print(f"피드백 기록: {feedback_response.json()}")
```

### 예제 2: 학습 상태 확인

```python
# 학습 상태 조회
status = requests.get("http://localhost:8001/training/status").json()
print(f"Agent Lightning 사용 가능: {status['agent_lightning_available']}")
print(f"Store 사용 가능: {status['store_available']}")
print(f"Trainer 사용 가능: {status['trainer_available']}")
print(f"총 Span 수: {status.get('total_spans', 0)}")
print(f"평균 보상: {status.get('average_reward', 0.0)}")
```

### 예제 3: 수동 학습 트리거

```python
# 수동으로 학습 시작
response = requests.post("http://localhost:8001/training/trigger")
print(response.json())
```

## 학습 루프

### 자동 학습 프로세스

1. **데이터 수집**: 프롬프트 최적화 요청마다 Span이 생성되고 기록됨
2. **피드백 수집**: 사용자가 피드백을 제출하면 보상으로 변환되어 기록됨
3. **패턴 분석**: Trainer가 주기적으로 보상 데이터를 분석하여 패턴 발견
4. **전략 개선**: 높은 보상을 받은 프롬프트 패턴을 학습하여 최적화 전략 개선
5. **자동 적용**: 다음 최적화 요청 시 학습된 패턴이 자동으로 적용됨

### 학습 메트릭

- **평균 보상**: 모든 보상의 평균값 (목표: 0.7 이상)
- **Span 수**: 기록된 총 작업 수
- **보상 비율**: 보상이 기록된 Span의 비율
- **카테고리별 성능**: 이미지/동영상/텍스트별 평균 보상

## 고급 기능

### 커스텀 보상 함수

보상 계산 로직을 커스터마이징할 수 있습니다:

```python
def custom_reward_function(quality_score, user_feedback):
    # 커스텀 로직 구현
    reward = quality_score / 100.0
    
    # 특정 키워드가 포함된 경우 보너스
    if "cinematic" in user_feedback.get("prompt", ""):
        reward += 0.1
    
    return max(-1.0, min(1.0, reward))
```

### 배치 학습

여러 프롬프트를 한 번에 학습할 수 있습니다:

```python
# 여러 프롬프트 최적화
tasks = [
    {"prompt": "sunset", "category": "image"},
    {"prompt": "mountain", "category": "image"},
    {"prompt": "ocean", "category": "image"}
]

for task in tasks:
    result = optimize_prompt(task)
    # 피드백 수집 및 기록
    submit_feedback(result)
```

## 모니터링 및 디버깅

### 로그 확인

```bash
# 서버 로그에서 Span 기록 확인
tail -f logs/server.log | grep "Span 기록"

# 보상 기록 확인
tail -f logs/server.log | grep "보상 기록"
```

### 데이터베이스 확인

LightningStore가 SQLite를 사용하는 경우:

```bash
sqlite3 lightning_store.db
.tables
SELECT * FROM spans LIMIT 10;
SELECT * FROM rewards LIMIT 10;
```

## 성능 최적화

### 1. 비동기 처리

대량의 요청을 처리할 때는 비동기 처리를 고려하세요:

```python
import asyncio
import aiohttp

async def optimize_batch(prompts):
    async with aiohttp.ClientSession() as session:
        tasks = [
            session.post("/optimize", json=prompt)
            for prompt in prompts
        ]
        results = await asyncio.gather(*tasks)
    return results
```

### 2. 캐싱

자주 사용되는 최적화 결과를 캐싱하여 성능을 향상시킬 수 있습니다.

## 문제 해결

### Agent Lightning이 로드되지 않는 경우

```bash
# 패키지 재설치
pip install --upgrade agentlightning

# 최신 버전 확인
pip show agentlightning
```

### LightningStore 연결 실패

```bash
# 환경 변수 확인
echo $LIGHTNING_STORE_URL

# SQLite 파일 권한 확인
ls -la lightning_store.db
```

### Trainer가 작동하지 않는 경우

```bash
# Trainer 상태 확인
curl http://localhost:8001/training/status

# 수동 학습 트리거
curl -X POST http://localhost:8001/training/trigger
```

## 참고 자료

- [Agent Lightning GitHub](https://github.com/microsoft/agent-lightning)
- [Agent Lightning 문서](https://microsoft.github.io/agent-lightning/)
- [강화학습 기초](https://spinningup.openai.com/en/latest/)

## 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

