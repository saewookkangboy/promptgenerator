# 개발자 가이드

이 문서는 프롬프트 생성기 프로젝트의 개발 환경 설정 및 개발 가이드를 제공합니다.

## 📋 목차

- [프로젝트 개요](#프로젝트-개요)
- [프로젝트 구조](#프로젝트-구조)
- [개발 환경 설정](#개발-환경-설정)
- [아키텍처](#아키텍처)
- [코딩 컨벤션](#코딩-컨벤션)
- [개발 워크플로우](#개발-워크플로우)
- [테스트](#테스트)
- [배포](#배포)

---

## 프로젝트 개요

프롬프트 생성기는 텍스트, 이미지, 동영상 프롬프트를 생성하고 프롬프트 엔지니어링을 지원하는 통합 웹 애플리케이션입니다.

### 기술 스택

- **프론트엔드**: React 18, TypeScript, Vite
- **백엔드**: Express 5, Node.js 20, TypeScript
- **데이터베이스**: PostgreSQL, Prisma ORM
- **인증**: JWT (Access Token + Refresh Token)
- **보안**: Helmet, express-rate-limit, bcrypt

---

## 프로젝트 구조

```
prompt-generator/
├── server/                 # Express 백엔드
│   ├── routes/            # API 라우트
│   │   ├── auth.ts        # 인증 API
│   │   ├── users.ts       # 사용자 관리 API
│   │   ├── prompts.ts     # 프롬프트 관리 API
│   │   ├── templates.ts   # 템플릿 관리 API
│   │   └── admin.ts       # 관리자 API
│   ├── middleware/        # 미들웨어
│   │   ├── auth.ts        # 인증 미들웨어
│   │   ├── errorHandler.ts # 에러 핸들러
│   │   ├── validation.ts  # 입력 검증
│   │   └── rbac.ts        # 역할 기반 접근 제어
│   ├── utils/             # 유틸리티
│   │   ├── logger.ts      # 로깅
│   │   └── encryption.ts  # 암호화
│   ├── db/                # 데이터베이스
│   │   └── prisma.ts      # Prisma 클라이언트
│   ├── scheduler/         # 스케줄러
│   ├── scraper/           # 스크래퍼
│   └── services/          # 서비스 레이어
├── src/                   # React 프론트엔드
│   ├── components/        # React 컴포넌트
│   ├── utils/             # 유틸리티
│   ├── hooks/             # React 훅
│   ├── contexts/          # React 컨텍스트
│   └── types/             # TypeScript 타입
├── prisma/                # Prisma 스키마
│   └── schema.prisma      # 데이터베이스 스키마
├── scripts/               # 스크립트
├── docs/                  # 문서
└── .github/              # GitHub 설정
    └── workflows/        # CI/CD 워크플로우
```

---

## 개발 환경 설정

### 필수 요구사항

- Node.js 20.19.0 이상
- npm 10.0.0 이상
- PostgreSQL 15 이상

### 초기 설정

```bash
# 저장소 클론
git clone https://github.com/your-org/prompt-generator.git
cd prompt-generator

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 열어 필요한 값 입력

# 데이터베이스 마이그레이션
npm run db:push

# Prisma 클라이언트 생성
npm run db:generate
```

### 개발 서버 실행

```bash
# 프론트엔드 개발 서버 (포트 5173)
npm run dev

# 백엔드 개발 서버 (포트 3001)
npm run server:dev
```

### 환경 변수

`.env` 파일에 다음 변수들을 설정해야 합니다:

```bash
# 필수
DATABASE_URL="postgresql://user:password@localhost:5432/prompt_generator"
JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters"
ADMIN_EMAIL="admin@example.com"
GEMINI_API_KEY="your-gemini-api-key"

# 선택
PORT=3001
FRONTEND_URL="http://localhost:5173"
NODE_ENV="development"
```

---

## 아키텍처

### 백엔드 아키텍처

```
┌─────────────────┐
│   Express App   │
├─────────────────┤
│  Middleware     │
│  - Auth         │
│  - Validation   │
│  - RBAC         │
│  - Rate Limit   │
│  - Error Handler│
├─────────────────┤
│  Routes         │
│  - /api/auth    │
│  - /api/users   │
│  - /api/prompts │
│  - /api/admin   │
├─────────────────┤
│  Services       │
│  - Logger       │
│  - Encryption   │
├─────────────────┤
│  Prisma ORM     │
└─────────────────┘
        │
        ▼
┌─────────────────┐
│   PostgreSQL    │
└─────────────────┘
```

### 프론트엔드 아키텍처

```
┌─────────────────┐
│   React App     │
├─────────────────┤
│  Components     │
│  - PromptGen    │
│  - Admin        │
│  - Templates    │
├─────────────────┤
│  Hooks          │
│  - useAuth      │
│  - useAPI       │
├─────────────────┤
│  Services       │
│  - API Client   │
│  - Storage      │
└─────────────────┘
```

### 데이터 흐름

1. **사용자 요청** → 프론트엔드 컴포넌트
2. **API 호출** → `src/utils/api.ts`
3. **인증** → JWT 토큰 포함
4. **미들웨어** → 인증, 검증, 권한 확인
5. **라우트 핸들러** → 비즈니스 로직 처리
6. **Prisma ORM** → 데이터베이스 쿼리
7. **응답** → JSON 형식으로 반환

---

## 코딩 컨벤션

### TypeScript

- `strict` 모드 활성화
- `any` 타입 사용 최소화
- 인터페이스/타입 명시적 정의
- JSDoc 주석 추가 (공개 함수)

### 네이밍

- **변수/함수**: camelCase
- **클래스/인터페이스**: PascalCase
- **상수**: UPPER_SNAKE_CASE
- **파일명**: camelCase (컴포넌트는 PascalCase)

### 코드 구조

```typescript
// 1. Import 문
import { ... } from '...'

// 2. 타입 정의
interface MyType { ... }

// 3. 상수
const CONSTANT = 'value'

// 4. 함수
function myFunction() { ... }

// 5. Export
export default myFunction
```

### 에러 처리

- 모든 비동기 함수에 try-catch 사용
- 에러는 `errorHandler.ts`를 통해 처리
- 사용자 친화적인 에러 메시지 제공

### 로깅

- 구조화된 로깅 사용 (`log.info`, `log.error` 등)
- 민감한 정보는 자동 마스킹
- 보안 이벤트는 `log.security` 사용

---

## 개발 워크플로우

### 1. 브랜치 전략

- `main`: 프로덕션 브랜치
- `develop`: 개발 브랜치
- `feature/*`: 기능 개발 브랜치
- `fix/*`: 버그 수정 브랜치

### 2. 커밋 메시지

```
type(scope): subject

body (optional)

footer (optional)
```

**타입**:
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 포맷팅
- `refactor`: 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드/설정 변경

**예시**:
```
feat(auth): Add refresh token support

- Implement access/refresh token separation
- Add token refresh endpoint
- Update authentication middleware
```

### 3. Pull Request

1. 기능 개발 완료 후 PR 생성
2. CI/CD 자동 테스트 통과 확인
3. 코드 리뷰 요청
4. 승인 후 머지

---

## 테스트

### 테스트 실행

```bash
# 모든 테스트 실행
npm test

# 커버리지 포함
npm test -- --coverage

# 특정 파일만 테스트
npm test -- path/to/test.ts
```

### 테스트 작성 가이드

- 각 기능별로 테스트 작성
- 테스트 커버리지 70% 이상 목표
- 통합 테스트와 단위 테스트 분리

---

## 배포

### 프로덕션 빌드

```bash
# 프론트엔드 빌드
npm run build

# 백엔드 빌드
npm run build:server

# 전체 빌드
npm run build && npm run build:server
```

### 배포 플랫폼

- **프론트엔드**: Vercel
- **백엔드**: Railway
- **데이터베이스**: Railway PostgreSQL

### 배포 전 체크리스트

- [ ] 환경 변수 설정 확인
- [ ] 데이터베이스 마이그레이션 확인
- [ ] 빌드 성공 확인
- [ ] 테스트 통과 확인
- [ ] 보안 스캔 통과 확인

---

## 문제 해결

### 일반적인 문제

#### 데이터베이스 연결 실패
```bash
# DATABASE_URL 확인
echo $DATABASE_URL

# Prisma 클라이언트 재생성
npm run db:generate
```

#### 포트 충돌
```bash
# 다른 포트 사용
PORT=3002 npm run server:dev
```

#### 의존성 문제
```bash
# node_modules 삭제 후 재설치
rm -rf node_modules
npm install
```

---

## 추가 리소스

- [API 문서](./API_DOCUMENTATION.md) - Swagger UI: `/api-docs`
- [에러 코드](./ERROR_CODES.md) - API 에러 코드 표준
- [보안 모범 사례](./SECURITY_BEST_PRACTICES.md) - 보안 가이드
- [README](../README.md) - 프로젝트 개요

---

**마지막 업데이트**: 2025-01-XX
