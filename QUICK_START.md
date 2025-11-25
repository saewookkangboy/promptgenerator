# 빠른 시작 가이드

## 오류 해결 완료 ✅

다음 오류들이 수정되었습니다:
1. ✅ Prisma 스키마 관계 필드 수정
2. ✅ Prisma 클라이언트 생성 완료
3. ✅ .env 파일 생성

## 다음 단계

### 옵션 1: SQLite 사용 (빠른 시작, 개발용)

`.env` 파일을 열고 다음으로 변경:
```env
DATABASE_URL="file:./dev.db"
```

그 다음:
```bash
npm run db:push
npm run db:seed
```

### 옵션 2: PostgreSQL 사용 (프로덕션 권장)

1. **PostgreSQL 설치 및 데이터베이스 생성**
```bash
# macOS
brew install postgresql@15
brew services start postgresql@15

# PostgreSQL 접속
psql -U postgres

# 데이터베이스 생성
CREATE DATABASE prompt_generator;
CREATE USER prompt_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE prompt_generator TO prompt_user;
\q
```

2. **.env 파일 수정**
```env
DATABASE_URL="postgresql://prompt_user:your_secure_password@localhost:5432/prompt_generator?schema=public"
```

3. **데이터베이스 스키마 적용**
```bash
npm run db:push
npm run db:seed
```

## 서버 및 클라이언트 실행

### 1. 서버 빌드 및 실행
```bash
# TypeScript 컴파일
npm run build:server

# 서버 실행 (개발 모드)
npm run server:dev
```

### 2. 클라이언트 실행
```bash
# 새 터미널에서
npm run dev
```

## 테스트

1. 브라우저에서 `http://localhost:5173` 접속
2. 회원가입 (이메일, 비밀번호 입력)
3. 로그인
4. 프롬프트 생성 테스트
5. Admin 모드에서 사용자/프롬프트 관리 확인

## 문제 해결

### DATABASE_URL 오류
- `.env` 파일이 프로젝트 루트에 있는지 확인
- `DATABASE_URL` 값이 올바른지 확인
- PostgreSQL이 실행 중인지 확인 (SQLite 사용 시 불필요)

### Prisma 클라이언트 오류
```bash
npm run db:generate
```

### 서버 연결 오류
- 서버가 실행 중인지 확인: `npm run server:dev`
- 포트 3001이 사용 가능한지 확인

