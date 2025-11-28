# Railway 배포 가이드

이 문서는 프롬프트 생성기 서비스를 Railway에 배포하는 방법을 설명합니다.

## 📋 사전 준비사항

1. **Railway 계정 생성**
   - [Railway](https://railway.app)에 가입
   - GitHub 계정으로 연동 권장

2. **PostgreSQL 데이터베이스 준비**
   - Railway에서 PostgreSQL 서비스 생성
   - 또는 외부 PostgreSQL 서버 사용

## 🚀 배포 단계

### 1. Railway 프로젝트 생성

1. Railway 대시보드에서 "New Project" 클릭
2. "Deploy from GitHub repo" 선택
3. 저장소 선택 및 연결

### 2. PostgreSQL 데이터베이스 추가

1. Railway 프로젝트에서 "New" → "Database" → "PostgreSQL" 선택
2. PostgreSQL 서비스가 생성되면 자동으로 `DATABASE_URL` 환경 변수가 설정됨

### 3. 환경 변수 설정

Railway 프로젝트의 "Variables" 탭에서 다음 환경 변수를 설정:

#### 필수 환경 변수

```bash
# Database (Railway PostgreSQL에서 자동 설정됨)
DATABASE_URL=postgresql://user:password@host:port/database?schema=public

# Server
PORT=3000
NODE_ENV=production

# JWT Secret (강력한 랜덤 문자열 생성)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters

# Admin 계정
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=secure-password-here

# AI Services
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash-exp

# CORS (프론트엔드 도메인)
CORS_ORIGIN=https://your-frontend-domain.com
```

#### 선택적 환경 변수

```bash
# OpenAI (번역 기능용)
OPENAI_API_KEY=your-openai-api-key
OPENAI_SUMMARIZE_MODEL=gpt-4o-mini

# Frontend API URL
VITE_API_URL=https://your-backend-domain.railway.app
```

### 4. 데이터베이스 마이그레이션 및 서버 시작

`railway.toml`의 `startCommand`는 `npm run start:with-migrate`로 설정되어 있어 배포 시 다음 순서로 실행됩니다:
- `npm run db:migrate:deploy` - 데이터베이스 마이그레이션 실행
- `node server/index.js` - 서버 시작

### 5. 초기 데이터 시드

배포 후 Railway CLI 또는 웹 콘솔을 통해 시드 실행:

```bash
# Railway CLI 설치
npm i -g @railway/cli

# Railway에 로그인
railway login

# 프로젝트 연결
railway link

# 시드 실행
railway run npm run db:seed
railway run npm run db:seed:library
```

또는 Railway 대시보드의 "Deployments" → "View Logs"에서 직접 실행할 수 있습니다.

## 🔧 데이터베이스 스키마

현재 서비스는 다음 데이터를 PostgreSQL에 저장합니다:

### 주요 테이블

1. **Users** - 사용자 회원가입 정보
   - 이메일, 비밀번호 해시, 이름, 티어 등

2. **Templates** - 프롬프트 템플릿
   - 템플릿 이름, 설명, 카테고리, 내용, 변수 등

3. **Prompts** - 사용자가 생성하는 프롬프트 이력
   - 프롬프트 내용, 메타데이터, 버전 관리 등

4. **PromptGuides** - 프롬프트 가이드라인
   - 가이드 제목, 내용, 모델 정보 등

5. **Analytics** - 서비스 이용자 통계 정보
   - 이벤트 타입, 이벤트 데이터, 타임스탬프 등

6. **Workspaces** - 사용자 워크스페이스
   - 워크스페이스 정보, 멤버 관리 등

7. **AdminAuditLog** - 관리자 감사 로그
   - 관리자 작업 이력

## 📊 데이터베이스 연결 확인

배포 후 다음 엔드포인트로 서버 상태 확인:

```
GET https://your-app.railway.app/api/health
```

응답 예시:
```json
{
  "status": "ok",
  "timestamp": "2025-01-XX...",
  "uptime": 123.45
}
```

## 🔄 마이그레이션 관리

### 로컬 개발 환경

```bash
# 마이그레이션 생성
npm run db:migrate

# 마이그레이션 적용
npm run db:push
```

### 프로덕션 환경 (Railway)

Railway는 배포 시 자동으로 마이그레이션을 실행합니다 (`npm start` 스크립트에 포함).

수동 실행이 필요한 경우:

```bash
railway run npm run db:migrate:deploy
```

## 🛠️ 문제 해결

### 데이터베이스 연결 오류

1. `DATABASE_URL` 환경 변수 확인
2. PostgreSQL 서비스가 실행 중인지 확인
3. 방화벽 설정 확인 (Railway는 자동 처리)

### 마이그레이션 실패

1. Railway 로그 확인: "Deployments" → "View Logs"
2. 로컬에서 마이그레이션 테스트:
   ```bash
   DATABASE_URL=your-railway-db-url npm run db:migrate:deploy
   ```

### 시드 데이터 누락

배포 후 수동으로 시드 실행:
```bash
railway run npm run db:seed
railway run npm run db:seed:library
```

## 📝 추가 리소스

- [Railway 문서](https://docs.railway.app)
- [Prisma PostgreSQL 가이드](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [Railway PostgreSQL 가이드](https://docs.railway.app/databases/postgresql)

## 🔐 보안 권장사항

1. **JWT_SECRET**: 최소 32자 이상의 강력한 랜덤 문자열 사용
2. **ADMIN_PASSWORD**: 강력한 비밀번호 사용
3. **CORS_ORIGIN**: 프로덕션 도메인만 허용
4. **환경 변수**: 민감한 정보는 Railway Variables에만 저장
