# 자체 서버 구축 방안

현재 프롬프트 생성기 서비스를 웹에서 실행 가능한 서버로 구축하기 위한 옵션들을 정리했습니다.

## 📊 현재 상황 분석

### 현재 구조
- **프론트엔드**: Vite + React (정적 파일)
- **백엔드**: Express.js 서버
- **데이터베이스**: Prisma + PostgreSQL (Prisma Cloud)
- **주요 기능**:
  - Gemini API를 통한 번역
  - OpenAI API를 통한 요약
  - 가이드 수집 스케줄러 (node-cron)
  - Admin API (사용자/프롬프트 관리)

### 배포 현황
- 프론트엔드: GitHub Pages 또는 Vercel (정적 호스팅)
- 백엔드: **미배포** (로컬에서만 실행)

---

## 🚀 추천 배포 옵션 (우선순위별)

### 1️⃣ **Railway** (가장 추천 ⭐)

**장점:**
- ✅ **가장 빠른 설정** (5분 내 배포 가능)
- ✅ 무료 티어 제공 (월 $5 크레딧)
- ✅ PostgreSQL 데이터베이스 자동 제공
- ✅ 환경 변수 관리 간편
- ✅ GitHub 연동으로 자동 배포
- ✅ Cron 작업 지원 (가이드 수집 스케줄러)
- ✅ 로그 확인 용이

**단점:**
- 무료 티어는 제한적 (트래픽 적을 때 충분)
- 유료 플랜은 $5/월부터

**구현 방법:**
```bash
# 1. Railway CLI 설치
npm i -g @railway/cli

# 2. Railway 로그인
railway login

# 3. 프로젝트 초기화
railway init

# 4. PostgreSQL 추가
railway add postgresql

# 5. 환경 변수 설정
railway variables set GEMINI_API_KEY=your_key
railway variables set GEMINI_MODEL=gemini-2.5-flash
railway variables set OPENAI_API_KEY=your_key
railway variables set DATABASE_URL=${{Postgres.DATABASE_URL}}

# 6. 배포
railway up
```

**필요 파일:**
- `railway.json` (설정 파일)
- `Procfile` 또는 `package.json`의 start 스크립트

---

### 2️⃣ **Render** (무료 티어 제공)

**장점:**
- ✅ **무료 티어 제공** (제한적이지만 시작하기 좋음)
- ✅ PostgreSQL 무료 제공
- ✅ GitHub 연동 자동 배포
- ✅ Cron 작업 지원
- ✅ SSL 자동 설정

**단점:**
- 무료 티어는 15분 비활성 시 슬리프 모드 (첫 요청 지연)
- 무료 티어는 제한적

**구현 방법:**
1. Render.com 가입
2. "New Web Service" 선택
3. GitHub 저장소 연결
4. 설정:
   - Build Command: `npm install`
   - Start Command: `node server/index.js`
   - Environment: Node
5. PostgreSQL 데이터베이스 추가
6. 환경 변수 설정

**필요 파일:**
- `render.yaml` (선택사항, 인프라 코드)

---

### 3️⃣ **Fly.io** (글로벌 CDN)

**장점:**
- ✅ **빠른 전 세계 응답 속도**
- ✅ 무료 티어 제공 (제한적)
- ✅ Docker 기반 (유연한 설정)
- ✅ PostgreSQL 제공

**단점:**
- 설정이 다소 복잡
- Dockerfile 필요

**구현 방법:**
```bash
# 1. Fly CLI 설치
curl -L https://fly.io/install.sh | sh

# 2. 로그인
fly auth login

# 3. 앱 초기화
fly launch

# 4. PostgreSQL 추가
fly postgres create

# 5. 환경 변수 설정
fly secrets set GEMINI_API_KEY=your_key
fly secrets set GEMINI_MODEL=gemini-2.5-flash
fly secrets set OPENAI_API_KEY=your_key

# 6. 배포
fly deploy
```

**필요 파일:**
- `Dockerfile`
- `fly.toml`

---

### 4️⃣ **Vercel Serverless Functions** (현재 프론트엔드와 통합)

**장점:**
- ✅ 프론트엔드와 같은 플랫폼 (통합 관리)
- ✅ 무료 티어 제공
- ✅ 자동 스케일링
- ✅ CDN 통합

**단점:**
- ❌ **Cron 작업 제한적** (Vercel Cron은 유료)
- ❌ 장시간 실행 작업 부적합
- ❌ Prisma + PostgreSQL 설정 복잡

**구현 방법:**
1. 서버 코드를 `/api` 폴더로 이동
2. Express 앱을 Serverless Functions로 변환
3. `vercel.json` 업데이트

**주의사항:**
- 가이드 수집 스케줄러는 별도 처리 필요 (외부 Cron 서비스 사용)

---

### 5️⃣ **DigitalOcean App Platform**

**장점:**
- ✅ 간단한 설정
- ✅ PostgreSQL 제공
- ✅ GitHub 연동
- ✅ 예측 가능한 가격 ($5/월부터)

**단점:**
- 무료 티어 없음
- 최소 $5/월 비용

---

### 6️⃣ **AWS/GCP/Azure** (엔터프라이즈급)

**장점:**
- ✅ 높은 확장성
- ✅ 다양한 서비스 통합
- ✅ 강력한 인프라

**단점:**
- ❌ 설정 복잡
- ❌ 초기 비용 높음
- ❌ 관리 복잡도 높음

**권장하지 않음** (초기 단계에서는 과도함)

---

## 🎯 최종 추천: **Railway**

### 선택 이유
1. **가장 빠른 시작**: 5분 내 배포 가능
2. **비용 효율**: 무료 티어로 시작, 필요 시 $5/월
3. **완전한 기능 지원**: Cron, PostgreSQL, 환경 변수 모두 지원
4. **개발자 친화적**: CLI 도구와 대시보드 모두 우수

### 구현 단계

#### Step 1: Railway 프로젝트 설정 파일 생성

**`railway.json`** 생성:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install"
  },
  "deploy": {
    "startCommand": "node server/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### Step 2: package.json에 start 스크립트 추가

```json
{
  "scripts": {
    "start": "node server/index.js",
    "server": "node server/index.js"
  }
}
```

#### Step 3: 환경 변수 설정

Railway 대시보드에서 다음 환경 변수 설정:
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (기본값: gemini-2.5-flash)
- `OPENAI_API_KEY`
- `OPENAI_SUMMARIZE_MODEL` (기본값: gpt-4o-mini)
- `DATABASE_URL` (Railway PostgreSQL 자동 연결)
- `NODE_ENV=production`
- `PORT` (Railway가 자동 설정)

#### Step 4: Cron 작업 설정

Railway는 Cron 작업을 지원합니다. `railway.json`에 추가:

```json
{
  "cron": [
    {
      "schedule": "0 2 * * *",
      "command": "node server/scheduler/guideScheduler.js"
    }
  ]
}
```

또는 Railway 대시보드에서 Cron Job 추가

#### Step 5: 프론트엔드 API URL 업데이트

**`.env.production`** 또는 **`vite.config.ts`**:
```typescript
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
      process.env.VITE_API_BASE_URL || 'https://your-railway-app.up.railway.app'
    )
  }
})
```

---

## 🔄 대안: 하이브리드 구조

### 프론트엔드 + 백엔드 분리 배포

**프론트엔드**: Vercel (현재 유지)
- 정적 파일 호스팅
- 빠른 CDN
- 무료

**백엔드**: Railway
- API 서버
- Cron 작업
- 데이터베이스

**장점:**
- 각각 최적의 플랫폼 사용
- 비용 효율적
- 확장 용이

---

## 📝 구현 체크리스트

### Railway 배포 전 준비사항

- [ ] `railway.json` 생성
- [ ] `package.json`에 `start` 스크립트 확인
- [ ] 환경 변수 목록 정리
- [ ] Prisma 스키마 확인 (`DATABASE_URL` 필요)
- [ ] Cron 작업 스케줄 확인
- [ ] CORS 설정 확인 (프론트엔드 도메인 허용)
- [ ] 로그 경로 확인 (Railway는 자동 로그 수집)

### 서버 코드 수정 필요사항

1. **포트 설정**:
```javascript
const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
```

2. **CORS 설정**:
```javascript
const cors = require('cors')
app.use(cors({
  origin: [
    'https://your-frontend-domain.vercel.app',
    'https://your-frontend-domain.github.io',
    'http://localhost:5173' // 개발 환경
  ],
  credentials: true
}))
```

3. **환경 변수 검증**:
```javascript
const requiredEnvVars = ['GEMINI_API_KEY', 'OPENAI_API_KEY']
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.warn(`⚠️  ${varName} is not set`)
  }
})
```

---

## 💰 비용 비교

| 플랫폼 | 무료 티어 | 시작 가격 | 추천도 |
|--------|----------|----------|--------|
| **Railway** | $5 크레딧/월 | $5/월 | ⭐⭐⭐⭐⭐ |
| **Render** | 제한적 무료 | $7/월 | ⭐⭐⭐⭐ |
| **Fly.io** | 제한적 무료 | $1.94/월 | ⭐⭐⭐ |
| **Vercel** | 무료 | $20/월 | ⭐⭐⭐ (Cron 제한) |
| **DigitalOcean** | 없음 | $5/월 | ⭐⭐⭐ |

---

## 🚦 빠른 시작 가이드 (Railway)

### 1단계: Railway 계정 생성
1. https://railway.app 접속
2. GitHub로 로그인
3. "New Project" 클릭

### 2단계: 프로젝트 배포
1. "Deploy from GitHub repo" 선택
2. 저장소 선택
3. Railway가 자동으로 감지하고 배포 시작

### 3단계: PostgreSQL 추가
1. "New" → "Database" → "Add PostgreSQL"
2. `DATABASE_URL` 자동 설정됨

### 4단계: 환경 변수 설정
1. "Variables" 탭
2. 필요한 환경 변수 추가:
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL=gemini-2.5-flash`
   - `OPENAI_API_KEY`
   - `NODE_ENV=production`

### 5단계: Cron 작업 설정 (선택)
1. "New" → "Cron Job"
2. 스케줄 설정: `0 2 * * *` (매일 오전 2시)
3. Command: `node server/scheduler/guideScheduler.js`

### 6단계: 도메인 확인
1. 배포 완료 후 "Settings" → "Domains"
2. 생성된 URL 확인 (예: `https://your-app.up.railway.app`)

### 7단계: 프론트엔드 연결
1. 프론트엔드 `.env` 또는 `vite.config.ts`에 API URL 설정
2. `VITE_API_BASE_URL=https://your-app.up.railway.app`

---

## 🔍 문제 해결

### 일반적인 문제들

1. **서버가 시작되지 않음**
   - `package.json`의 `start` 스크립트 확인
   - 포트 설정 확인 (`process.env.PORT`)

2. **데이터베이스 연결 실패**
   - `DATABASE_URL` 환경 변수 확인
   - Prisma 마이그레이션 실행: `npx prisma migrate deploy`

3. **Cron 작업이 실행되지 않음**
   - Railway Cron 설정 확인
   - 또는 외부 Cron 서비스 사용 (cron-job.org)

4. **CORS 오류**
   - 서버 CORS 설정에 프론트엔드 도메인 추가

---

## 📚 추가 리소스

- [Railway 문서](https://docs.railway.app)
- [Render 문서](https://render.com/docs)
- [Fly.io 문서](https://fly.io/docs)

---

## ✅ 다음 단계

1. **Railway 계정 생성 및 프로젝트 배포**
2. **환경 변수 설정**
3. **데이터베이스 마이그레이션**
4. **프론트엔드 API URL 업데이트**
5. **테스트 및 모니터링**

**예상 소요 시간**: 30분 ~ 1시간

