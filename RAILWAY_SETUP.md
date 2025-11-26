# Railway 배포 빠른 시작 가이드

## 🚀 5분 안에 배포하기

### 1단계: Railway 계정 생성
1. https://railway.app 접속
2. "Start a New Project" 클릭
3. GitHub로 로그인

### 2단계: 프로젝트 배포
1. "Deploy from GitHub repo" 선택
2. 이 저장소 선택
3. Railway가 자동으로 감지하고 배포 시작

### 3단계: PostgreSQL 데이터베이스 추가
1. 프로젝트 대시보드에서 "New" 클릭
2. "Database" → "Add PostgreSQL" 선택
3. `DATABASE_URL`이 자동으로 환경 변수에 추가됨

### 4단계: 환경 변수 설정
프로젝트 → "Variables" 탭에서 다음 변수 추가:

```
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
OPENAI_API_KEY=your_openai_api_key
OPENAI_SUMMARIZE_MODEL=gpt-4o-mini
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

**참고**: 여러 프론트엔드 도메인을 허용하려면 쉼표로 구분:
```
FRONTEND_URL=https://domain1.com,https://domain2.com
```

### 5단계: 데이터베이스 마이그레이션
Railway 터미널에서 실행:
```bash
npx prisma migrate deploy
```

또는 Railway 대시보드 → "Deployments" → "View Logs"에서 확인

### 6단계: 도메인 확인
1. "Settings" → "Domains"
2. 생성된 URL 확인 (예: `https://your-app.up.railway.app`)
3. 이 URL을 프론트엔드의 `VITE_API_BASE_URL`에 설정

### 7단계: Cron 작업 설정 (선택)
가이드 자동 수집을 위해:
1. "New" → "Cron Job"
2. Schedule: `0 2 * * *` (매일 오전 2시)
3. Command: `node server/scheduler/guideScheduler.js`

---

## ✅ 배포 확인

### Health Check
브라우저에서 접속:
```
https://your-app.up.railway.app/health
```

응답 예시:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### API 테스트
```bash
curl https://your-app.up.railway.app/api/guides/status
```

---

## 🔧 문제 해결

### 서버가 시작되지 않음
- `package.json`의 `start` 스크립트 확인
- Railway 로그 확인: "View Logs"

### 데이터베이스 연결 실패
- `DATABASE_URL` 환경 변수 확인
- Prisma 마이그레이션 실행: `npx prisma migrate deploy`

### CORS 오류
- `FRONTEND_URL` 환경 변수에 프론트엔드 도메인 추가
- 여러 도메인은 쉼표로 구분

### API 키 오류
- `GEMINI_API_KEY`, `OPENAI_API_KEY` 확인
- Railway 대시보드에서 환경 변수 재확인

---

## 📊 모니터링

Railway 대시보드에서 확인 가능:
- 실시간 로그
- 리소스 사용량
- 배포 상태
- 트래픽 통계

---

## 💰 비용

- **무료 티어**: 월 $5 크레딧 (소규모 서비스에 충분)
- **유료 플랜**: $5/월부터 (트래픽 증가 시)

---

## 🔄 업데이트

코드 푸시 시 Railway가 자동으로 재배포합니다.

수동 재배포:
1. Railway 대시보드 → "Deployments"
2. "Redeploy" 클릭

