# 배포 체크리스트

Railway에 배포하기 전에 확인해야 할 항목들입니다.

## 📋 배포 전 체크리스트

### 1. 로컬 환경 확인

```bash
# 환경 변수 검증
npm run check:env

# 배포 전 체크리스트 실행
npm run pre-deploy
```

### 2. 필수 파일 확인

- [ ] `package.json` - `start` 스크립트 포함
- [ ] `railway.json` - Railway 설정 파일
- [ ] `server/index.js` - 서버 메인 파일
- [ ] `prisma/schema.prisma` - 데이터베이스 스키마 (선택)

### 3. 환경 변수 준비

#### 필수 환경 변수
- [ ] `GEMINI_API_KEY` - Gemini API 키
- [ ] `OPENAI_API_KEY` - OpenAI API 키

#### 선택적 환경 변수 (기본값 있음)
- [ ] `GEMINI_MODEL` - 기본값: `gemini-2.5-flash`
- [ ] `OPENAI_SUMMARIZE_MODEL` - 기본값: `gpt-4o-mini`
- [ ] `DATABASE_URL` - Railway PostgreSQL 자동 설정
- [ ] `FRONTEND_URL` - 프론트엔드 도메인 (CORS용)
- [ ] `PORT` - Railway가 자동 설정
- [ ] `NODE_ENV` - `production`으로 설정 권장

### 4. Railway 배포 단계

#### Step 1: 프로젝트 생성
- [ ] Railway 계정 생성 (https://railway.app)
- [ ] "New Project" 클릭
- [ ] "Deploy from GitHub repo" 선택
- [ ] 저장소 선택

#### Step 2: 데이터베이스 설정
- [ ] "New" → "Database" → "Add PostgreSQL"
- [ ] `DATABASE_URL` 자동 설정 확인

#### Step 3: 환경 변수 설정
- [ ] 프로젝트 → "Variables" 탭
- [ ] 필수 환경 변수 추가:
  ```
  GEMINI_API_KEY=your_key
  OPENAI_API_KEY=your_key
  GEMINI_MODEL=gemini-2.5-flash
  OPENAI_SUMMARIZE_MODEL=gpt-4o-mini
  NODE_ENV=production
  FRONTEND_URL=https://your-frontend.vercel.app
  ```

#### Step 4: 데이터베이스 마이그레이션
- [ ] Railway 터미널에서 실행:
  ```bash
  npx prisma migrate deploy
  ```
- [ ] 또는 Railway 대시보드 → "Deployments" → "View Logs" 확인

#### Step 5: 배포 확인
- [ ] "Settings" → "Domains"에서 URL 확인
- [ ] Health check: `https://your-app.up.railway.app/health`
- [ ] API 테스트: `https://your-app.up.railway.app/api/guides/status`

#### Step 6: 프론트엔드 연결
- [ ] 프론트엔드 `.env` 또는 `vite.config.ts`에 API URL 설정:
  ```
  VITE_API_BASE_URL=https://your-app.up.railway.app
  ```
- [ ] 프론트엔드 재배포

### 5. Cron 작업 설정 (선택)

가이드 자동 수집을 위해:
- [ ] "New" → "Cron Job"
- [ ] Schedule: `0 2 * * *` (매일 오전 2시)
- [ ] Command: `node server/scheduler/guideScheduler.js`

### 6. 모니터링 설정

- [ ] Railway 대시보드에서 로그 확인
- [ ] 리소스 사용량 모니터링
- [ ] 에러 알림 설정 (선택)

---

## 🔧 문제 해결

### 서버가 시작되지 않음
1. Railway 로그 확인: "View Logs"
2. `package.json`의 `start` 스크립트 확인
3. 포트 설정 확인 (`process.env.PORT`)

### 데이터베이스 연결 실패
1. `DATABASE_URL` 환경 변수 확인
2. Prisma 마이그레이션 실행:
   ```bash
   npx prisma migrate deploy
   ```
3. Prisma 클라이언트 생성:
   ```bash
   npx prisma generate
   ```

### CORS 오류
1. `FRONTEND_URL` 환경 변수 확인
2. 여러 도메인은 쉼표로 구분:
   ```
   FRONTEND_URL=https://domain1.com,https://domain2.com
   ```
3. 서버 재시작

### API 키 오류
1. Railway 대시보드에서 환경 변수 확인
2. API 키 형식 확인 (공백 없음)
3. API 키 유효성 확인

---

## ✅ 배포 후 확인사항

- [ ] Health check 엔드포인트 응답 확인
- [ ] 번역 API 테스트
- [ ] 가이드 수집 API 테스트 (선택)
- [ ] 프론트엔드에서 API 호출 확인
- [ ] 로그에 에러 없음 확인
- [ ] 리소스 사용량 정상 확인

---

## 📚 참고 문서

- [Railway 빠른 시작 가이드](./RAILWAY_SETUP.md)
- [서버 배포 옵션 비교](./SERVER_DEPLOYMENT.md)
- [Railway 공식 문서](https://docs.railway.app)

---

## 🆘 지원

문제가 발생하면:
1. Railway 로그 확인
2. 환경 변수 재확인
3. 배포 전 체크리스트 재실행: `npm run pre-deploy`

