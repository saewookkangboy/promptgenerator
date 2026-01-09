# 모니터링 가이드

프롬프트 생성기 서비스의 모니터링 시스템에 대한 가이드입니다.

## 📋 목차

- [모니터링 개요](#모니터링-개요)
- [에러 추적 (Sentry)](#에러-추적-sentry)
- [성능 모니터링](#성능-모니터링)
- [로그 분석](#로그-분석)
- [알림 설정](#알림-설정)

---

## 모니터링 개요

프롬프트 생성기는 다음 모니터링 시스템을 사용합니다:

1. **에러 추적**: Sentry
2. **성능 모니터링**: Vercel Analytics, Speed Insights, 커스텀 성능 추적
3. **로그 분석**: Pino 구조화 로깅

---

## 에러 추적 (Sentry)

### 설정

#### 백엔드

환경 변수 설정:
```bash
SENTRY_DSN=your-sentry-dsn
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_RELEASE=1.0.0
```

#### 프론트엔드

환경 변수 설정:
```bash
VITE_SENTRY_DSN=your-sentry-dsn
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
VITE_SENTRY_RELEASE=1.0.0
```

### 사용법

#### 예외 캡처

```typescript
import { captureException } from './utils/sentry'

try {
  // ...
} catch (error) {
  captureException(error, {
    userId: '123',
    action: 'create_prompt',
  })
}
```

#### 메시지 캡처

```typescript
import { captureMessage } from './utils/sentry'

captureMessage('Important event occurred', 'warning', {
  context: 'user_action',
})
```

#### 사용자 컨텍스트 설정

```typescript
import { setUser } from './utils/sentry'

setUser({
  id: user.id,
  email: user.email,
  username: user.name,
})
```

### Sentry 대시보드

- **에러 목록**: 발생한 모든 에러 확인
- **에러 상세**: 스택 트레이스, 컨텍스트, 사용자 정보
- **성능 모니터링**: 트랜잭션 추적
- **릴리스 추적**: 배포별 에러 추적

---

## 성능 모니터링

### Web Vitals

Vercel Speed Insights를 통해 다음 메트릭을 추적합니다:

- **LCP (Largest Contentful Paint)**: 최대 콘텐츠 렌더링 시간
- **FID (First Input Delay)**: 첫 입력 지연 시간
- **CLS (Cumulative Layout Shift)**: 누적 레이아웃 이동

### API 응답 시간

자동으로 모든 API 요청의 응답 시간을 추적합니다:

```typescript
// 자동 추적 (미들웨어에서 처리)
// 1초 이상이면 경고 로그
```

### 데이터베이스 쿼리 성능

```typescript
import { trackDBQuery } from './utils/performance'

const startTime = Date.now()
const result = await prisma.prompt.findMany(...)
const duration = Date.now() - startTime

trackDBQuery('findMany prompts', duration, 'Prompt')
```

### 메모리 사용량

```typescript
import { trackMemoryUsage } from './utils/performance'

trackMemoryUsage() // 주기적으로 호출
```

---

## 로그 분석

### 로그 레벨

- **debug**: 개발 환경에서만 출력
- **info**: 일반 정보
- **warn**: 경고
- **error**: 에러
- **fatal**: 치명적 에러

### 로그 형식

구조화된 JSON 형식으로 로깅됩니다:

```json
{
  "level": "error",
  "time": "2025-01-XXT00:00:00.000Z",
  "type": "api_error",
  "error": {
    "name": "ValidationError",
    "message": "Invalid input"
  },
  "request": {
    "method": "POST",
    "url": "/api/prompts",
    "ip": "127.0.0.1"
  }
}
```

### 로그 파일

프로덕션 환경에서는 다음 파일에 로그가 저장됩니다:

- `logs/error.log`: 에러 로그만
- `logs/combined.log`: 모든 로그

### 로그 분석 도구

구조화된 JSON 로그는 다음 도구로 분석할 수 있습니다:

- **jq**: JSON 파서
- **ELK Stack**: Elasticsearch, Logstash, Kibana
- **Loki**: Grafana Loki
- **CloudWatch**: AWS CloudWatch Logs

---

## 알림 설정

### Sentry 알림

Sentry 대시보드에서 알림 규칙을 설정할 수 있습니다:

1. **에러 발생 시**: 이메일, Slack, PagerDuty 등
2. **에러 빈도 임계값**: 특정 시간 내 N번 발생 시
3. **새로운 에러 발생 시**: 알림 전송

### 성능 알림

성능 임계값 초과 시 로그에 경고가 기록됩니다:

- API 응답 시간 > 1초
- 데이터베이스 쿼리 시간 > 500ms

향후 외부 모니터링 서비스와 통합하여 알림을 설정할 수 있습니다.

---

## 모니터링 체크리스트

### 일일 확인

- [ ] Sentry 대시보드에서 새로운 에러 확인
- [ ] 에러 빈도 확인
- [ ] 성능 메트릭 확인

### 주간 확인

- [ ] 에러 트렌드 분석
- [ ] 성능 트렌드 분석
- [ ] 로그 분석 (이상 패턴 확인)

### 월간 확인

- [ ] 모니터링 시스템 검토
- [ ] 알림 규칙 최적화
- [ ] 성능 개선 사항 식별

---

## 문제 해결

### Sentry가 작동하지 않는 경우

1. 환경 변수 확인 (`SENTRY_DSN`)
2. 네트워크 연결 확인
3. Sentry 프로젝트 설정 확인

### 로그가 기록되지 않는 경우

1. 로그 디렉토리 권한 확인
2. 디스크 공간 확인
3. 로그 레벨 설정 확인

---

**마지막 업데이트**: 2025-01-XX
