# 데이터베이스 설정 가이드

## 1. PostgreSQL 설치

### macOS (Homebrew)
```bash
brew install postgresql@15
brew services start postgresql@15
```

### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Windows
[PostgreSQL 공식 사이트](https://www.postgresql.org/download/windows/)에서 설치

## 2. 데이터베이스 생성

```bash
# PostgreSQL 접속
psql -U postgres

# 데이터베이스 및 사용자 생성
CREATE DATABASE prompt_generator;
CREATE USER prompt_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE prompt_generator TO prompt_user;
\q
```

## 3. 환경 변수 설정

### .env 파일 생성
프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가:

```env
# 데이터베이스 연결
DATABASE_URL="postgresql://prompt_user:your_secure_password@localhost:5432/prompt_generator?schema=public"

# 서버 설정
PORT=3001
NODE_ENV=development

# API 설정
VITE_API_BASE_URL=http://localhost:3001

# JWT 시크릿 (프로덕션에서는 반드시 변경!)
JWT_SECRET=your-secret-key-here-change-in-production

# 암호화 키 (프로덕션에서는 반드시 변경!)
ENCRYPTION_KEY=your-encryption-key-here-change-in-production

# Admin 설정
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

**중요**: 프로덕션 환경에서는 `JWT_SECRET`과 `ENCRYPTION_KEY`를 반드시 강력한 랜덤 문자열로 변경하세요!

## 4. Prisma 설정

### Prisma 클라이언트 생성
```bash
npm run db:generate
```

### 데이터베이스 스키마 적용
```bash
npm run db:push
```

또는 마이그레이션 파일 생성 (권장):
```bash
npm run db:migrate
# 마이그레이션 이름 입력 (예: init)
```

### 초기 데이터 생성 (선택사항)
```bash
npm run db:seed
```

## 5. 서버 실행

### 개발 모드
```bash
# 서버 빌드 (TypeScript → JavaScript)
npm run build:server

# 서버 실행
npm run server:dev
```

### 프로덕션 모드
```bash
npm run build:server
npm run server
```

## 6. 클라이언트 실행

```bash
npm run dev
```

## 문제 해결

### 오류: "Environment variable not found: DATABASE_URL"
- `.env` 파일이 프로젝트 루트에 있는지 확인
- `.env` 파일에 `DATABASE_URL`이 올바르게 설정되었는지 확인
- 서버 재시작

### 오류: "@prisma/client did not initialize yet"
```bash
npm run db:generate
```

### 오류: "Connection refused"
- PostgreSQL 서비스가 실행 중인지 확인
- 데이터베이스 이름, 사용자, 비밀번호가 올바른지 확인
- 포트가 5432인지 확인

### 오류: "password authentication failed"
- PostgreSQL 사용자 비밀번호 확인
- `pg_hba.conf` 설정 확인

## 빠른 시작 (로컬 개발용 SQLite)

개발 환경에서 빠르게 시작하려면 SQLite를 사용할 수 있습니다:

### 1. Prisma 스키마 수정
`prisma/schema.prisma`에서:
```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}
```

### 2. 마이그레이션
```bash
npm run db:push
npm run db:generate
```

**주의**: SQLite는 프로덕션 환경에 권장되지 않습니다. 프로덕션에서는 PostgreSQL을 사용하세요.

## 다음 단계

데이터베이스 설정이 완료되면:
1. 서버 실행: `npm run server:dev`
2. 클라이언트 실행: `npm run dev`
3. 브라우저에서 `http://localhost:5173` 접속
4. 회원가입 후 로그인
5. 프롬프트 생성 테스트

