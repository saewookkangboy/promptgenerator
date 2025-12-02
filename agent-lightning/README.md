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
- 프롬프트 최적화 이벤트를 기록
- 강화학습 기반 프롬프트 개선 (향후 구현)
- 자동 프롬프트 템플릿 최적화

## 환경 변수

```env
PORT=8001
DATABASE_URL=postgresql://...  # Agent Lightning Store용 (선택)
```

