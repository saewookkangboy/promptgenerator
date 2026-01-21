# 프롬프트 메이커 공개 API 문서

## 개요

프롬프트 메이커는 RESTful API를 제공하여 외부 애플리케이션에서 프롬프트 생성 기능을 사용할 수 있습니다.

## 인증

API를 사용하려면 API 키가 필요합니다. API 키는 사용자 설정에서 생성할 수 있습니다.

### API 키 사용 방법

요청 헤더에 API 키를 포함하세요:

```
X-API-Key: your-api-key-here
```

## Base URL

- 프로덕션: `https://promptgenerator-production.up.railway.app`
- 개발: `http://localhost:3001`

## Rate Limiting

API 키의 티어에 따라 요청 제한이 다릅니다:

- **FREE**: 분당 10회
- **BASIC**: 분당 50회
- **PROFESSIONAL**: 분당 200회
- **ENTERPRISE**: 분당 1000회

Rate limit을 초과하면 `429 Too Many Requests` 응답이 반환됩니다.

## 엔드포인트

### 1. 프롬프트 생성

프롬프트를 생성합니다.

**요청:**

```http
POST /api/v1/prompts
Content-Type: application/json
X-API-Key: your-api-key

{
  "inputText": "인공지능의 미래에 대해 작성해주세요",
  "category": "TEXT",
  "contentType": "blog",
  "options": {
    "goal": "awareness",
    "toneStyles": ["professional"],
    "age": "30대",
    "gender": "무관"
  }
}
```

**응답:**

```json
{
  "success": true,
  "data": {
    "prompt": "생성된 프롬프트",
    "metaPrompt": "메타 프롬프트",
    "contextPrompt": "컨텍스트 프롬프트"
  }
}
```

### 2. 프롬프트 조회

저장된 프롬프트를 조회합니다.

**요청:**

```http
GET /api/v1/prompts/{id}
X-API-Key: your-api-key
```

**응답:**

```json
{
  "success": true,
  "data": {
    "id": "prompt-id",
    "title": "프롬프트 제목",
    "content": "프롬프트 내용",
    "category": "TEXT",
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

### 3. 사용자 정보 조회

API 키에 연결된 사용자 정보를 조회합니다.

**요청:**

```http
GET /api/v1/me
X-API-Key: your-api-key
```

**응답:**

```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "email": "user@example.com",
    "tier": "PROFESSIONAL",
    "subscriptionStatus": "ACTIVE",
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

## 에러 응답

모든 에러 응답은 다음 형식을 따릅니다:

```json
{
  "error": "에러 메시지"
}
```

### HTTP 상태 코드

- `200 OK`: 요청 성공
- `400 Bad Request`: 잘못된 요청
- `401 Unauthorized`: 인증 실패
- `404 Not Found`: 리소스를 찾을 수 없음
- `429 Too Many Requests`: Rate limit 초과
- `500 Internal Server Error`: 서버 오류

## 예제 코드

### JavaScript (Fetch API)

```javascript
const apiKey = 'your-api-key'

async function generatePrompt(inputText, category) {
  const response = await fetch('https://promptgenerator-production.up.railway.app/api/v1/prompts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({
      inputText,
      category,
      contentType: 'blog',
    }),
  })

  const data = await response.json()
  return data
}
```

### Python

```python
import requests

api_key = 'your-api-key'
base_url = 'https://promptgenerator-production.up.railway.app'

def generate_prompt(input_text, category):
    response = requests.post(
        f'{base_url}/api/v1/prompts',
        headers={
            'Content-Type': 'application/json',
            'X-API-Key': api_key,
        },
        json={
            'inputText': input_text,
            'category': category,
            'contentType': 'blog',
        }
    )
    return response.json()
```

### cURL

```bash
curl -X POST https://promptgenerator-production.up.railway.app/api/v1/prompts \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "inputText": "인공지능의 미래에 대해 작성해주세요",
    "category": "TEXT",
    "contentType": "blog"
  }'
```

## 서드파티 통합

### Zapier

Zapier 통합을 통해 다른 서비스와 연결할 수 있습니다. (향후 지원 예정)

### Slack Bot

Slack 봇을 통해 프롬프트를 생성할 수 있습니다. (향후 지원 예정)

### Chrome Extension

Chrome 확장 프로그램을 통해 브라우저에서 직접 프롬프트를 생성할 수 있습니다. (향후 지원 예정)

## 지원

API 관련 문의사항은 다음으로 연락하세요:
- 이메일: chunghyo@troe.kr
- GitHub Issues: [프로젝트 GitHub](https://github.com/your-repo)
