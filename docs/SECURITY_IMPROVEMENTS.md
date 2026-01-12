# 보안 개선 사항

이 문서는 프롬프트 생성기 서비스의 보안 개선 사항을 설명합니다.

## 개선된 보안 기능

### 1. 보안 미들웨어 강화 (`server/middleware/security.ts`)

#### IP 필터링
- **화이트리스트/블랙리스트 지원**: 환경 변수를 통해 IP 접근 제어
- **의심스러운 활동 자동 감지**: 10회 이상 의심스러운 활동 시 자동 블랙리스트 추가
- **환경 변수**:
  - `IP_WHITELIST`: 허용할 IP 주소 목록 (쉼표로 구분)
  - `IP_BLACKLIST`: 차단할 IP 주소 목록 (쉼표로 구분)
  - `ENABLE_IP_WHITELIST`: 화이트리스트 모드 활성화 (`true`/`false`)

#### 요청 크기 제한
- 기본 최대 크기: 10MB
- 초과 시 413 Payload Too Large 응답

#### Injection 방지
- **SQL Injection 패턴 감지**: 8가지 주요 SQL Injection 패턴 검사
- **NoSQL Injection 패턴 감지**: MongoDB 등 NoSQL Injection 패턴 검사
- **XSS 패턴 감지**: 7가지 주요 XSS 패턴 검사
- 자동으로 의심스러운 IP 기록 및 추적

#### 보안 헤더 추가
- `X-Content-Type-Options: nosniff`: MIME 타입 스니핑 방지
- `X-Frame-Options: DENY`: 클릭재킹 방지
- `X-XSS-Protection: 1; mode=block`: XSS 필터 활성화
- `Referrer-Policy: strict-origin-when-cross-origin`: 리퍼러 정보 제어
- `Permissions-Policy`: 브라우저 기능 제어
- `X-Request-ID`: 요청 추적용 고유 ID

#### API 버전 검증
- `api-version` 또는 `x-api-version` 헤더로 API 버전 지정
- 지원 버전: `v1`, `v2`
- 미지원 버전 요청 시 400 Bad Request

#### 요청 타임아웃
- 기본 타임아웃: 30초
- 초과 시 408 Request Timeout 응답

#### 의심스러운 활동 감지
- User-Agent 검증
- 비정상적인 경로 패턴 감지
- 비정상적인 쿼리 파라미터 감지
- 자동으로 의심스러운 IP 기록

### 2. CSRF 보호 강화 (`server/middleware/csrfEnhanced.ts`)

#### 세션 기반 CSRF 토큰
- 인증된 사용자: 사용자 ID 기반 토큰 저장
- 익명 사용자: 쿠키 기반 토큰 저장
- 토큰 만료 시간: 1시간
- Timing-safe 비교로 토큰 검증

#### CSRF 토큰 발급 API
- `GET /api/csrf-token`: CSRF 토큰 발급
- 쿠키와 JSON 응답 모두 제공

### 3. 보안 로깅 시스템 (`server/utils/securityLogger.ts`)

#### 보안 이벤트 추적
- **이벤트 타입**:
  - 인증 관련: `authentication_success`, `authentication_failure`, `token_expired`, `token_invalid`
  - 권한 관련: `permission_denied`, `unauthorized_access`
  - 공격 시도: `sql_injection_attempt`, `xss_attempt`, `csrf_attempt`, `brute_force_attempt`, `rate_limit_exceeded`
  - IP 관련: `ip_blocked`, `ip_whitelisted`, `ip_blacklisted`
  - 데이터 접근: `sensitive_data_access`, `data_export`
  - 시스템 이벤트: `configuration_change`, `security_setting_change`

#### 심각도 분류
- `LOW`: 낮은 위험도
- `MEDIUM`: 중간 위험도
- `HIGH`: 높은 위험도
- `CRITICAL`: 치명적 위험도

#### 통계 및 분석
- 공격 시도 통계 (시간 윈도우별)
- IP별 의심스러운 활동 통계
- 이벤트 타입별 통계

### 4. 프론트엔드 보안 (`src/utils/security.ts`)

#### XSS 방지
- HTML 이스케이프 함수
- HTML 태그 제거 함수
- 안전한 HTML 삽입 함수

#### 입력 검증
- 이메일 검증
- 비밀번호 강도 검증
- 입력 길이 검증
- SQL Injection 패턴 검사
- XSS 패턴 검사

#### CSRF 토큰 관리
- CSRF 토큰 자동 가져오기
- 안전한 fetch 래퍼 (`secureFetch`)

#### 안전한 저장소
- `SecureStorage` 클래스: localStorage 안전하게 사용
- 접두사 기반 키 관리
- JSON 직렬화/역직렬화 오류 처리

## 적용 방법

### 서버 설정

1. **환경 변수 추가** (`.env` 또는 배포 환경):
```bash
# IP 필터링
IP_WHITELIST=192.168.1.1,10.0.0.1
IP_BLACKLIST=
ENABLE_IP_WHITELIST=false

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15분
RATE_LIMIT_MAX_REQUESTS=100

# 보안 알림 (선택)
SECURITY_ALERT_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

2. **서버 미들웨어 적용**:
서버는 이미 `server/index.js`에 보안 미들웨어가 통합되어 있습니다.

### 프론트엔드 사용

```typescript
import { 
  escapeHtml, 
  validateSafeInput, 
  secureFetch,
  getCSRFToken 
} from './utils/security'

// XSS 방지
const safeText = escapeHtml(userInput)

// 입력 검증
const validation = validateSafeInput(userInput, {
  maxLength: 1000,
  checkSQL: true,
  checkXSS: true,
})

// 안전한 API 호출
const response = await secureFetch('/api/prompts', {
  method: 'POST',
  body: JSON.stringify(data),
})
```

## 보안 모니터링

### 보안 이벤트 조회

보안 이벤트는 자동으로 로깅되며, 다음 방법으로 조회할 수 있습니다:

```typescript
import { getSecurityEvents, getAttackStatistics } from './utils/securityLogger'

// 최근 보안 이벤트 조회
const events = getSecurityEvents({ limit: 100 })

// 공격 시도 통계
const stats = getAttackStatistics(3600000) // 최근 1시간
```

### 로그 확인

보안 이벤트는 다음 위치에 로깅됩니다:
- 개발 환경: 콘솔 출력
- 프로덕션 환경: `logs/error.log`, `logs/combined.log`

## 보안 체크리스트

### 정기 점검 사항

- [ ] IP 블랙리스트 정기 업데이트
- [ ] 보안 이벤트 로그 정기 검토
- [ ] 의심스러운 활동 패턴 분석
- [ ] Rate Limiting 임계값 조정
- [ ] CSRF 토큰 만료 시간 검토
- [ ] 보안 헤더 설정 확인
- [ ] 환경 변수 보안 확인

### 배포 전 확인

- [ ] 모든 환경 변수 설정 확인
- [ ] 보안 미들웨어 활성화 확인
- [ ] CSRF 보호 활성화 확인
- [ ] Rate Limiting 설정 확인
- [ ] IP 필터링 설정 확인 (필요시)
- [ ] 보안 로깅 활성화 확인

## 추가 보안 권장 사항

### 1. DOMPurify 라이브러리 사용
프론트엔드에서 HTML sanitization을 위해 DOMPurify 라이브러리 사용을 권장합니다:

```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

### 2. Redis를 사용한 CSRF 토큰 저장
프로덕션 환경에서는 메모리 기반 토큰 저장소 대신 Redis를 사용하는 것을 권장합니다.

### 3. 외부 알림 서비스 통합
심각한 보안 이벤트 발생 시 Slack, Email, SMS 등으로 알림을 받도록 설정하는 것을 권장합니다.

### 4. 정기적인 보안 감사
- OWASP Top 10 취약점 점검
- 의존성 취약점 스캔 (`npm audit`)
- 정기적인 보안 업데이트

## 참고 자료

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
