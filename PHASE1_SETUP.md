# Phase 1 구현 가이드

## 개요
Phase 1: 기본 구조 구축 (2주)
1. 데이터베이스 스키마 생성
2. 기본 Admin UI 구성
3. 사용자 관리 기능
4. 프롬프트 기본 관리

## 1. 데이터베이스 설정

### PostgreSQL 설치
```bash
# macOS (Homebrew)
brew install postgresql@15
brew services start postgresql@15

# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# Windows
# https://www.postgresql.org/download/windows/ 에서 설치
```

### 데이터베이스 생성
```bash
# PostgreSQL 접속
psql -U postgres

# 데이터베이스 생성
CREATE DATABASE prompt_generator;
CREATE USER prompt_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE prompt_generator TO prompt_user;
\q
```

### 환경 변수 설정
```bash
# .env 파일 생성 (루트 디렉토리)
cp .env.example .env

# .env 파일 수정
DATABASE_URL="postgresql://prompt_user:your_password@localhost:5432/prompt_generator?schema=public"
```

### Prisma 마이그레이션
```bash
# Prisma 클라이언트 생성
npm run db:generate

# 데이터베이스에 스키마 적용
npm run db:push

# 또는 마이그레이션 파일 생성 (권장)
npm run db:migrate
```

### Prisma Studio 실행 (선택사항)
```bash
# 데이터베이스 GUI 도구
npm run db:studio
```

## 2. 서버 설정

### 서버 실행
```bash
# 개발 모드
npm run server:dev

# 프로덕션 모드
npm run server
```

### API 테스트
```bash
# Health check
curl http://localhost:3001/health

# 프롬프트 목록 (인증 필요)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/prompts
```

## 3. 인증 시스템 구현

### 사용자 등록/로그인 API 필요
다음 파일들을 생성해야 합니다:
- `server/routes/auth.ts` - 회원가입, 로그인
- `server/routes/users.ts` - 사용자 관리

### JWT 토큰 발급
로그인 성공 시 JWT 토큰을 발급하여 클라이언트에 저장

## 4. 클라이언트 통합

### API 클라이언트 생성
`src/utils/api.ts` 파일 생성하여 API 호출 함수 구현

### 인증 상태 관리
- 로그인 상태 관리
- 토큰 저장 및 갱신
- 자동 로그아웃 처리

## 5. 프롬프트 저장 마이그레이션

### 기존 localStorage에서 DB로 마이그레이션
1. 기존 데이터 백업
2. DB에 저장
3. localStorage는 캐시로만 사용

## 6. Admin UI 확장

### 새로운 Admin 섹션 추가
- 사용자 관리
- 프롬프트 관리
- 통계 대시보드

## 다음 단계

Phase 1 완료 후:
- Phase 2: Tier 1 기능 구현
- Phase 3: Tier 2 기능 구현
- Phase 4: 최적화 및 확장

## 문제 해결

### Prisma 오류
```bash
# Prisma 클라이언트 재생성
npm run db:generate

# 데이터베이스 연결 확인
npx prisma db pull
```

### 데이터베이스 연결 오류
- `.env` 파일의 `DATABASE_URL` 확인
- PostgreSQL 서비스 실행 확인
- 방화벽 설정 확인

### 포트 충돌
- 다른 포트 사용: `PORT=3002 npm run server:dev`
- 또는 `.env` 파일에서 `PORT` 설정

