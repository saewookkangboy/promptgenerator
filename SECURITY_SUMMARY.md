# 보안 개선 요약

## 개선 완료 사항

### ✅ 1. 보안 미들웨어 강화
- **파일**: `server/middleware/security.ts`
- **기능**:
  - IP 화이트리스트/블랙리스트 관리
  - 요청 크기 제한 (기본 10MB)
  - SQL/NoSQL/XSS Injection 패턴 감지 및 차단
  - 보안 헤더 추가 (X-Content-Type-Options, X-Frame-Options 등)
  - API 버전 검증
  - 요청 타임아웃 (30초)
  - 의심스러운 활동 자동 감지

### ✅ 2. CSRF 보호 강화
- **파일**: `server/middleware/csrfEnhanced.ts`
- **기능**:
  - 세션 기반 CSRF 토큰 검증
  - 인증된 사용자와 익명 사용자 구분 처리
  - Timing-safe 토큰 비교
  - 토큰 만료 시간 관리 (1시간)

### ✅ 3. 보안 로깅 시스템
- **파일**: `server/utils/securityLogger.ts`
- **기능**:
  - 보안 이벤트 추적 (15가지 이벤트 타입)
  - 심각도 분류 (LOW, MEDIUM, HIGH, CRITICAL)
  - 공격 시도 통계
  - IP별 의심스러운 활동 분석
  - 외부 알림 연동 준비 (웹훅 지원)

### ✅ 4. 프론트엔드 보안 강화
- **파일**: `src/utils/security.ts`
- **기능**:
  - XSS 방지 (HTML 이스케이프, 태그 제거)
  - 입력 검증 (이메일, 비밀번호, 길이 등)
  - SQL Injection/XSS 패턴 검사
  - CSRF 토큰 자동 관리
  - 안전한 fetch 래퍼 (`secureFetch`)
  - 안전한 localStorage 관리 (`SecureStorage`)

### ✅ 5. 보안 API 엔드포인트
- **파일**: `server/routes/security.ts`
- **엔드포인트**:
  - `GET /api/admin/security/events` - 보안 이벤트 조회
  - `GET /api/admin/security/statistics` - 공격 시도 통계
  - `GET /api/admin/security/suspicious-ips` - 의심스러운 IP 목록
  - `POST /api/admin/security/blacklist` - IP 블랙리스트 추가
  - `GET /api/admin/security/settings` - 보안 설정 조회

### ✅ 6. 서버 통합
- **파일**: `server/index.js`
- **적용 사항**:
  - 모든 보안 미들웨어 통합
  - CSRF 토큰 발급 엔드포인트 추가 (`GET /api/csrf-token`)
  - 기존 보안 설정과의 통합

## 주요 보안 기능

### 1. Injection 방지
- **SQL Injection**: 8가지 주요 패턴 감지
- **NoSQL Injection**: 15가지 MongoDB 패턴 감지
- **XSS**: 7가지 주요 패턴 감지
- 자동 차단 및 의심스러운 IP 기록

### 2. Rate Limiting
- 일반 API: 15분당 100회
- 인증 API: 15분당 5회
- Admin API: 15분당 50회
- 초과 시 자동 차단 및 로깅

### 3. IP 필터링
- 화이트리스트 모드 지원
- 블랙리스트 자동 관리
- 의심스러운 활동 10회 이상 시 자동 차단

### 4. 보안 헤더
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (브라우저 기능 제어)
- `X-Request-ID` (요청 추적)

### 5. CSRF 보호
- 세션 기반 토큰 검증
- 쿠키 기반 토큰 (익명 사용자)
- Timing-safe 비교
- 자동 토큰 갱신

## 환경 변수 설정

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

## 사용 방법

### 프론트엔드에서 안전한 API 호출

```typescript
import { secureFetch } from './utils/security'

// CSRF 토큰이 자동으로 포함된 요청
const response = await secureFetch('/api/prompts', {
  method: 'POST',
  body: JSON.stringify(data),
})
```

### 입력 검증

```typescript
import { validateSafeInput } from './utils/security'

const validation = validateSafeInput(userInput, {
  maxLength: 1000,
  checkSQL: true,
  checkXSS: true,
})

if (!validation.valid) {
  console.error(validation.message)
  return
}

// 검증된 입력 사용
const safeInput = validation.sanitized
```

### 보안 이벤트 조회 (Admin)

```bash
# 보안 이벤트 조회
GET /api/admin/security/events?limit=100&timeWindowMs=3600000

# 공격 시도 통계
GET /api/admin/security/statistics?timeWindowMs=3600000

# 의심스러운 IP 목록
GET /api/admin/security/suspicious-ips?limit=10
```

## 보안 모니터링

### 로그 위치
- 개발 환경: 콘솔 출력
- 프로덕션 환경: `logs/error.log`, `logs/combined.log`

### 보안 이벤트 타입
- 인증 관련: `authentication_success`, `authentication_failure`, `token_expired`, `token_invalid`
- 권한 관련: `permission_denied`, `unauthorized_access`
- 공격 시도: `sql_injection_attempt`, `xss_attempt`, `csrf_attempt`, `brute_force_attempt`, `rate_limit_exceeded`
- IP 관련: `ip_blocked`, `ip_whitelisted`, `ip_blacklisted`

## 추가 권장 사항

1. **DOMPurify 라이브러리 사용**: 프론트엔드 HTML sanitization 강화
2. **Redis 사용**: 프로덕션 환경에서 CSRF 토큰 저장소로 Redis 사용
3. **외부 알림 통합**: Slack, Email, SMS 등으로 심각한 보안 이벤트 알림
4. **정기 보안 감사**: OWASP Top 10 점검, 의존성 취약점 스캔

## 참고 문서

- [보안 개선 상세 문서](./docs/SECURITY_IMPROVEMENTS.md)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
