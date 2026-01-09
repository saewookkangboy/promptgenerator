# 코딩 컨벤션

프롬프트 생성기 프로젝트의 코딩 스타일 및 컨벤션을 정의한 문서입니다.

## 📋 목차

- [일반 원칙](#일반-원칙)
- [TypeScript 컨벤션](#typescript-컨벤션)
- [React 컨벤션](#react-컨벤션)
- [Node.js/Express 컨벤션](#nodejsexpress-컨벤션)
- [파일 구조](#파일-구조)
- [네이밍 규칙](#네이밍-규칙)

---

## 일반 원칙

### 1. 가독성 우선
- 코드는 읽기 쉬워야 함
- 복잡한 로직은 주석으로 설명
- 의미 있는 변수명 사용

### 2. 일관성
- 프로젝트 전체에서 동일한 스타일 유지
- 기존 코드 스타일 따르기

### 3. 단순성
- 불필요한 복잡도 피하기
- YAGNI (You Aren't Gonna Need It) 원칙

---

## TypeScript 컨벤션

### 타입 정의

```typescript
// ✅ 좋은 예: 명시적 타입 정의
interface User {
  id: string
  email: string
  name: string | null
  tier: 'FREE' | 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE'
}

// ❌ 나쁜 예: any 사용
function getUser(id: any): any {
  // ...
}
```

### 함수 정의

```typescript
// ✅ 좋은 예: 타입 명시, JSDoc 주석
/**
 * 사용자 프로필을 조회합니다.
 * @param userId - 사용자 ID
 * @returns 사용자 프로필 정보
 */
async function getUserProfile(userId: string): Promise<User> {
  // ...
}

// ❌ 나쁜 예: 타입 생략
function getUserProfile(userId) {
  // ...
}
```

### 에러 처리

```typescript
// ✅ 좋은 예: 명시적 에러 타입
try {
  await someAsyncOperation()
} catch (error: unknown) {
  if (error instanceof Error) {
    log.error({ error }, 'Operation failed')
    throw error
  }
  throw new Error('Unknown error occurred')
}

// ❌ 나쁜 예: any 사용
try {
  await someAsyncOperation()
} catch (error: any) {
  console.error(error)
}
```

---

## React 컨벤션

### 컴포넌트 구조

```typescript
// ✅ 좋은 예
import { useState, useCallback } from 'react'
import './Component.css'

interface ComponentProps {
  title: string
  onAction: (id: string) => void
}

export function Component({ title, onAction }: ComponentProps) {
  const [count, setCount] = useState(0)

  const handleClick = useCallback(() => {
    setCount(prev => prev + 1)
    onAction('action-id')
  }, [onAction])

  return (
    <div className="component">
      <h1>{title}</h1>
      <button onClick={handleClick}>Click {count}</button>
    </div>
  )
}
```

### Hooks 사용

```typescript
// ✅ 좋은 예: 커스텀 훅 사용
function useUserData(userId: string) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUser(userId).then(setUser).finally(() => setLoading(false))
  }, [userId])

  return { user, loading }
}

// ❌ 나쁜 예: 컴포넌트 내부에 복잡한 로직
function Component({ userId }: { userId: string }) {
  const [user, setUser] = useState(null)
  // ... 복잡한 로직
}
```

---

## Node.js/Express 컨벤션

### 라우트 정의

```typescript
// ✅ 좋은 예: 명확한 구조, 에러 처리
/**
 * @swagger
 * /api/prompts:
 *   get:
 *     summary: 프롬프트 목록 조회
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prompts = await prisma.prompt.findMany({
      where: { userId: req.user!.id },
    })
    res.json({ prompts })
  } catch (error: unknown) {
    log.error({ error }, 'Failed to fetch prompts')
    res.status(500).json({ error: 'Failed to fetch prompts' })
  }
})
```

### 미들웨어

```typescript
// ✅ 좋은 예: 타입 안전성, 명확한 에러 처리
export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const token = extractToken(req)
    const decoded = verifyToken(token)
    req.user = decoded
    next()
  } catch (error: unknown) {
    res.status(401).json({ error: 'Unauthorized' })
  }
}
```

---

## 파일 구조

### 컴포넌트 파일

```
ComponentName.tsx
├── Imports
├── Types/Interfaces
├── Constants
├── Component Function
└── Exports
```

### 유틸리티 파일

```
utilityName.ts
├── Imports
├── Types
├── Constants
├── Functions
└── Exports
```

### 라우트 파일

```
routeName.ts
├── Imports
├── Router Setup
├── Route Handlers
└── Export
```

---

## 네이밍 규칙

### 변수 및 함수

```typescript
// ✅ camelCase
const userName = 'John'
function getUserData() { }

// ❌ snake_case 또는 PascalCase (변수/함수)
const user_name = 'John'
function GetUserData() { }
```

### 클래스 및 인터페이스

```typescript
// ✅ PascalCase
class UserService { }
interface UserProfile { }

// ❌ camelCase
class userService { }
interface userProfile { }
```

### 상수

```typescript
// ✅ UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3
const API_BASE_URL = 'https://api.example.com'

// ❌ camelCase
const maxRetryCount = 3
```

### 파일명

```typescript
// ✅ 컴포넌트: PascalCase
PromptGenerator.tsx
AdminDashboard.tsx

// ✅ 유틸리티/서비스: camelCase
api.ts
promptGenerator.ts
userService.ts

// ✅ 라우트: camelCase
auth.ts
prompts.ts
```

---

## 주석 및 문서화

### JSDoc 주석

```typescript
/**
 * 사용자 프로필을 업데이트합니다.
 * @param userId - 사용자 ID
 * @param data - 업데이트할 데이터
 * @returns 업데이트된 사용자 정보
 * @throws {ValidationError} 입력 데이터가 유효하지 않은 경우
 */
async function updateUserProfile(
  userId: string,
  data: UpdateUserData
): Promise<User> {
  // ...
}
```

### 인라인 주석

```typescript
// ✅ 좋은 예: 왜 이렇게 했는지 설명
// Rate limiting을 위해 15분 윈도우 사용
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
})

// ❌ 나쁜 예: 무엇을 하는지만 설명 (코드가 이미 설명함)
// Rate limit 설정
const limiter = rateLimit({ ... })
```

---

## 에러 처리

### 에러 타입

```typescript
// ✅ 명시적 에러 타입
class ValidationError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}
```

### 에러 처리 패턴

```typescript
// ✅ 구조화된 에러 처리
try {
  await operation()
} catch (error: unknown) {
  if (error instanceof ValidationError) {
    res.status(400).json({ error: error.message })
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    res.status(500).json({ error: 'Database error' })
  } else {
    log.error({ error }, 'Unexpected error')
    res.status(500).json({ error: 'Internal server error' })
  }
}
```

---

## 테스트 컨벤션

### 테스트 파일명

```
ComponentName.test.tsx
utilityName.test.ts
routeName.test.ts
```

### 테스트 구조

```typescript
describe('ComponentName', () => {
  it('should render correctly', () => {
    // Arrange
    const props = { ... }
    
    // Act
    render(<Component {...props} />)
    
    // Assert
    expect(screen.getByText('Expected')).toBeInTheDocument()
  })
})
```

---

## 추가 리소스

- [TypeScript 공식 스타일 가이드](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [React 스타일 가이드](https://react.dev/learn/thinking-in-react)
- [Node.js 모범 사례](https://github.com/goldbergyoni/nodebestpractices)

---

**마지막 업데이트**: 2025-01-XX
