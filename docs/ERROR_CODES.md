# API 에러 코드 표준

이 문서는 API에서 사용하는 표준 에러 코드와 응답 형식을 정의합니다.

## 에러 응답 형식

모든 API 에러 응답은 다음 형식을 따릅니다:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "사용자 친화적인 에러 메시지",
    "details": {} // 선택사항, 개발 환경에서만 포함
  }
}
```

## 에러 코드 목록

### 인증/권한 에러 (4xx)

#### UNAUTHORIZED (401)
- **설명**: 인증이 필요하거나 인증에 실패한 경우
- **예시**:
  - `UNAUTHORIZED`: 유효하지 않은 토큰입니다
  - `UNAUTHORIZED`: 토큰이 만료되었습니다
  - `UNAUTHORIZED`: 인증에 실패했습니다

#### FORBIDDEN (403)
- **설명**: 인증은 되었지만 권한이 없는 경우
- **예시**:
  - `FORBIDDEN`: Admin 권한이 필요합니다
  - `FORBIDDEN`: 이 기능은 Premium Tier가 필요합니다

### 검증 에러 (4xx)

#### VALIDATION_ERROR (400)
- **설명**: 입력 데이터가 유효하지 않은 경우
- **예시**:
  - `VALIDATION_ERROR`: 입력 데이터가 유효하지 않습니다
  - `VALIDATION_ERROR`: 관련된 데이터가 존재하지 않습니다

#### INVALID_INPUT (400)
- **설명**: 잘못된 입력 형식
- **예시**:
  - `INVALID_INPUT`: 유효한 이메일 주소를 입력해주세요
  - `INVALID_INPUT`: 비밀번호는 최소 8자 이상이어야 합니다

### 리소스 에러 (4xx)

#### NOT_FOUND (404)
- **설명**: 요청한 리소스를 찾을 수 없는 경우
- **예시**:
  - `NOT_FOUND`: 요청한 경로를 찾을 수 없습니다
  - `NOT_FOUND`: 요청한 리소스를 찾을 수 없습니다

#### CONFLICT (409)
- **설명**: 리소스 충돌 (중복 등)
- **예시**:
  - `CONFLICT`: 이미 존재하는 데이터입니다
  - `CONFLICT`: 이미 사용 중인 이메일입니다

### 데이터베이스 에러 (5xx)

#### DATABASE_ERROR (500)
- **설명**: 데이터베이스 관련 오류
- **예시**:
  - `DATABASE_ERROR`: 데이터베이스 오류가 발생했습니다
  - `DATABASE_ERROR`: 데이터베이스 연결에 실패했습니다

#### UNIQUE_CONSTRAINT (409)
- **설명**: 고유 제약 조건 위반
- **예시**:
  - `UNIQUE_CONSTRAINT`: 이미 존재하는 데이터입니다

### 서버 에러 (5xx)

#### INTERNAL_SERVER_ERROR (500)
- **설명**: 내부 서버 오류
- **예시**:
  - `INTERNAL_SERVER_ERROR`: 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.

#### SERVICE_UNAVAILABLE (503)
- **설명**: 서비스 일시 중단
- **예시**:
  - `SERVICE_UNAVAILABLE`: 서비스를 일시적으로 사용할 수 없습니다

## HTTP 상태 코드 매핑

| 에러 코드 | HTTP 상태 코드 | 설명 |
|---------|--------------|------|
| UNAUTHORIZED | 401 | 인증 필요/실패 |
| FORBIDDEN | 403 | 권한 없음 |
| VALIDATION_ERROR | 400 | 검증 실패 |
| INVALID_INPUT | 400 | 잘못된 입력 |
| NOT_FOUND | 404 | 리소스 없음 |
| CONFLICT | 409 | 리소스 충돌 |
| DATABASE_ERROR | 500 | DB 오류 |
| UNIQUE_CONSTRAINT | 409 | 고유 제약 위반 |
| INTERNAL_SERVER_ERROR | 500 | 서버 오류 |
| SERVICE_UNAVAILABLE | 503 | 서비스 중단 |

## 프론트엔드 에러 처리

프론트엔드에서는 다음과 같이 에러를 처리합니다:

```typescript
try {
  const response = await fetch('/api/endpoint')
  if (!response.ok) {
    const error = await response.json()
    // error.error.code로 에러 코드 확인
    // error.error.message로 사용자에게 표시
  }
} catch (error) {
  // 네트워크 오류 등
}
```

## 에러 로깅

모든 에러는 서버에서 자동으로 로깅되며, 심각도에 따라 분류됩니다:

- **CRITICAL**: 데이터베이스 연결 실패 등
- **HIGH**: 인증 실패, 5xx 에러
- **MEDIUM**: 4xx 에러, 검증 실패
- **LOW**: Validation 에러

민감한 정보(비밀번호, 토큰, API 키 등)는 로그에서 자동으로 마스킹됩니다.
