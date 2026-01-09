# 보안 모범 사례 가이드

이 문서는 프롬프트 생성기 서비스의 보안 모범 사례를 정리한 것입니다.

## 🔒 보안 정책

### 환경 변수 관리
- 모든 민감한 정보는 환경 변수로 관리
- `.env` 파일은 버전 관리에 포함하지 않음
- 프로덕션 환경에서는 배포 플랫폼의 환경 변수 설정 사용
- JWT_SECRET은 최소 32자 이상의 강력한 랜덤 문자열 사용

### 비밀번호 정책
- 최소 8자 이상
- 대문자, 소문자, 숫자, 특수문자(@$!%*?&) 각각 1개 이상 포함
- bcrypt 해싱 라운드 수: 12 (보안 강화)
- 비밀번호는 절대 평문으로 저장하지 않음

### JWT 토큰 보안
- Access Token: 15분 만료
- Refresh Token: 7일 만료
- 토큰 페이로드에 민감한 정보 포함하지 않음
- 토큰 서명 알고리즘: HS256

### API 키 보안
- API 키는 64자 랜덤 문자열로 생성
- API 키 생성/삭제 시 보안 이벤트 로깅
- 향후 API 키 해시 저장으로 개선 예정
- API 키 사용 로그 기록 (향후 구현)

### 데이터베이스 보안
- Prisma ORM 사용으로 SQL Injection 방지
- 데이터베이스 연결 문자열은 환경 변수로 관리
- 데이터베이스 사용자 권한 최소화
- 정기적인 백업 및 암호화

### 로깅 보안
- 민감한 정보(비밀번호, 토큰, API 키)는 로그에서 자동 마스킹
- 보안 이벤트(로그인 실패, 권한 거부 등) 별도 로깅
- 로그 파일 접근 권한 설정
- 로그 로테이션 설정

### Rate Limiting
- 일반 API: 100회/15분
- 인증 API: 5회/15분
- Admin API: 50회/15분
- IP 기반 및 사용자 기반 Rate Limiting

### CORS 설정
- 프로덕션 환경에서 특정 도메인만 허용
- 개발 환경에서는 localhost 허용
- Credentials는 필요한 경우만 허용

### 보안 헤더
- Helmet 미들웨어로 보안 헤더 자동 설정
- Content Security Policy (CSP) 설정
- HSTS (HTTP Strict Transport Security) 설정
- X-Frame-Options, X-Content-Type-Options 등

### HTTPS
- 프로덕션 환경에서 HTTPS 강제
- HTTP 요청은 HTTPS로 자동 리다이렉트
- HSTS 헤더로 브라우저에 HTTPS 강제

## 🛡️ 보안 이벤트 모니터링

다음 이벤트들이 자동으로 로깅됩니다:

- 로그인 성공/실패
- 토큰 검증 실패
- 권한 거부 (Admin 접근 시도 등)
- API 키 생성/삭제
- 인증 실패 (비활성 사용자 등)

## 📋 정기 점검 사항

### 주간
- [ ] npm audit 실행 및 취약점 확인
- [ ] 보안 로그 검토
- [ ] Rate Limiting 통계 확인

### 월간
- [ ] 의존성 업데이트 (Dependabot PR 검토)
- [ ] 보안 이벤트 분석
- [ ] API 키 사용 현황 확인

### 분기별
- [ ] 보안 감사
- [ ] 비밀번호 정책 재검토
- [ ] JWT 토큰 만료 시간 재검토

## 🚨 보안 사고 대응

1. **즉시 조치**
   - 영향받은 계정 비활성화
   - API 키 무효화
   - 관련 로그 확인

2. **조사**
   - 보안 이벤트 로그 분석
   - 영향 범위 파악
   - 취약점 확인

3. **복구**
   - 취약점 패치
   - 영향받은 사용자에게 알림
   - 보안 강화 조치

## 📚 참고 자료

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js 보안 모범 사례](https://nodejs.org/en/docs/guides/security/)
- [Express 보안 모범 사례](https://expressjs.com/en/advanced/best-practice-security.html)
