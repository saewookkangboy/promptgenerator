# 프롬프트 메이커 개발자 가이드

## 목차

1. [프로젝트 구조](#프로젝트-구조)
2. [개발 환경 설정](#개발-환경-설정)
3. [아키텍처](#아키텍처)
4. [API 개발](#api-개발)
5. [컴포넌트 개발](#컴포넌트-개발)
6. [데이터베이스](#데이터베이스)
7. [테스트](#테스트)
8. [배포](#배포)

## 프로젝트 구조

```
prompt-generator/
├── src/
│   ├── components/        # React 컴포넌트
│   ├── contexts/          # React Context
│   ├── hooks/            # Custom Hooks
│   ├── utils/            # 유틸리티 함수
│   ├── types/            # TypeScript 타입 정의
│   └── pages/            # 페이지 컴포넌트
├── server/
│   ├── routes/           # Express 라우트
│   ├── middleware/       # 미들웨어
│   ├── db/              # 데이터베이스 설정
│   └── utils/           # 서버 유틸리티
├── prisma/
│   └── schema.prisma    # Prisma 스키마
└── docs/                # 문서
```

## 개발 환경 설정

### 필수 요구사항

- Node.js 18+
- PostgreSQL 14+
- npm 또는 yarn

### 설치

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env

# 데이터베이스 마이그레이션
npx prisma migrate dev

# 개발 서버 실행
npm run dev
```

### 환경 변수

```env
# 데이터베이스
DATABASE_URL="postgresql://user:password@localhost:5432/promptgenerator"

# JWT
JWT_SECRET="your-secret-key"

# AI API Keys
GEMINI_API_KEY="your-gemini-key"
OPENAI_API_KEY="your-openai-key"

# OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Frontend URL
FRONTEND_URL="http://localhost:5173"
```

## 아키텍처

### 프론트엔드

- **React 18**: UI 라이브러리
- **TypeScript**: 타입 안정성
- **Vite**: 빌드 도구
- **React Context**: 상태 관리
- **LocalStorage**: 클라이언트 저장소

### 백엔드

- **Express.js**: 웹 프레임워크
- **Prisma**: ORM
- **PostgreSQL**: 데이터베이스
- **JWT**: 인증
- **Rate Limiting**: API 보호

## API 개발

### 라우트 구조

```typescript
// server/routes/example.ts
import { Router, Response } from 'express'
import { authenticateToken, AuthRequest } from '../middleware/auth'

const router = Router()

router.get('/example', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // 로직 구현
    res.json({ success: true, data: {} })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

export default router
```

### 미들웨어

- `authenticateToken`: JWT 토큰 인증
- `requireAdmin`: Admin 권한 확인
- `rateLimit`: 요청 제한

## 컴포넌트 개발

### 컴포넌트 구조

```typescript
// src/components/Example.tsx
import { useState } from 'react'
import './Example.css'

interface ExampleProps {
  title: string
  onAction?: () => void
}

function Example({ title, onAction }: ExampleProps) {
  const [state, setState] = useState('')

  return (
    <div className="example">
      <h2>{title}</h2>
      {/* 컴포넌트 내용 */}
    </div>
  )
}

export default Example
```

### 스타일링

- CSS Modules 또는 일반 CSS 파일 사용
- CSS 변수를 활용한 테마 시스템
- 반응형 디자인

## 데이터베이스

### Prisma 스키마

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  // ...
}
```

### 마이그레이션

```bash
# 새 마이그레이션 생성
npx prisma migrate dev --name migration-name

# 프로덕션 마이그레이션
npx prisma migrate deploy
```

### 쿼리 예제

```typescript
// 사용자 조회
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' },
})

// 프롬프트 생성
const prompt = await prisma.prompt.create({
  data: {
    userId: user.id,
    content: '프롬프트 내용',
    category: 'TEXT',
  },
})
```

## 테스트

### 단위 테스트

```bash
npm run test
```

### E2E 테스트

```bash
npm run test:e2e
```

## 배포

### 프로덕션 빌드

```bash
npm run build
```

### Railway 배포

1. GitHub에 코드 푸시
2. Railway에서 자동 배포
3. 환경 변수 설정

### Vercel 배포

1. Vercel에 프로젝트 연결
2. 빌드 설정 확인
3. 환경 변수 설정

## 기여 가이드

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a pull request

## 라이선스

MIT License
