# 기여 가이드 (Contributing Guide)

프롬프트 생성기 프로젝트에 기여해주셔서 감사합니다! 이 문서는 프로젝트에 기여하는 방법을 안내합니다.

## 📋 목차

1. [코드 컨벤션](#코드-컨벤션)
2. [개발 환경 설정](#개발-환경-설정)
3. [작업 흐름](#작업-흐름)
4. [커밋 메시지 규칙](#커밋-메시지-규칙)
5. [Pull Request 가이드](#pull-request-가이드)
6. [테스트 작성](#테스트-작성)
7. [문서화](#문서화)

---

## 코드 컨벤션

### TypeScript

- **타입 안정성**: 모든 함수와 변수에 명시적 타입 지정
- **인터페이스 우선**: 타입보다 인터페이스 사용 권장
- **명명 규칙**:
  - 컴포넌트: PascalCase (`PromptGenerator.tsx`)
  - 함수/변수: camelCase (`generatePrompt`)
  - 상수: UPPER_SNAKE_CASE (`MAX_LENGTH`)
  - 타입/인터페이스: PascalCase (`PromptResult`)

### React

- **함수형 컴포넌트**: 클래스 컴포넌트 대신 함수형 컴포넌트 사용
- **Hooks**: 커스텀 훅은 `use` 접두사 사용
- **Props 타입**: 인터페이스로 정의
- **조건부 렌더링**: 삼항 연산자 또는 `&&` 사용

### 백엔드

- **Express 라우트**: RESTful API 설계 원칙 준수
- **에러 핸들링**: 표준 에러 응답 형식 사용
- **미들웨어**: 재사용 가능한 미들웨어 작성
- **로깅**: 구조화된 로깅 (Pino) 사용

---

## 개발 환경 설정

### 필수 요구사항

- Node.js 20.19.0 이상
- npm 10 이상
- PostgreSQL 15 이상

### 초기 설정

```bash
# 저장소 클론
git clone https://github.com/saewookkangboy/promptgenerator.git
cd prompt-generator

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일 편집

# 데이터베이스 설정
npm run db:push

# 개발 서버 실행
npm run dev          # 프론트엔드
npm run server:dev   # 백엔드
```

---

## 작업 흐름

### 1. 이슈 확인

- 작업하기 전에 관련 이슈를 확인하세요
- 새로운 기능은 먼저 이슈를 생성하세요

### 2. 브랜치 생성

```bash
# 메인 브랜치에서 최신 코드 가져오기
git checkout main
git pull origin main

# 기능 브랜치 생성
git checkout -b feature/your-feature-name
# 또는
git checkout -b fix/your-bug-fix
```

### 3. 개발

- 작은 단위로 커밋
- 테스트 작성
- 문서 업데이트

### 4. 테스트 실행

```bash
# 모든 테스트 실행
npm test

# 커버리지 확인
npm run test:coverage

# 린트 검사
npm run lint

# 포맷 검사
npm run format:check
```

### 5. 커밋 및 푸시

```bash
# 변경사항 스테이징
git add .

# 커밋 (커밋 메시지 규칙 준수)
git commit -m "feat: 새로운 기능 추가"

# 푸시
git push origin feature/your-feature-name
```

---

## 커밋 메시지 규칙

[Conventional Commits](https://www.conventionalcommits.org/) 규칙을 따릅니다.

### 형식

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 포맷팅 (기능 변경 없음)
- `refactor`: 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드 프로세스 또는 보조 도구 변경

### 예시

```
feat(prompt): 텍스트 프롬프트 생성 기능 추가

- 텍스트 콘텐츠 타입 지원
- Native English 변환 기능
- 상세 옵션 설정 기능

Closes #123
```

---

## Pull Request 가이드

### PR 제목

- 커밋 메시지와 동일한 형식 사용
- 명확하고 간결하게 작성

### PR 설명

다음 항목을 포함하세요:

1. **변경 사항 요약**
2. **관련 이슈 번호** (예: `Closes #123`)
3. **테스트 방법**
4. **스크린샷** (UI 변경인 경우)
5. **체크리스트**:
   - [ ] 코드 리뷰 완료
   - [ ] 테스트 통과
   - [ ] 문서 업데이트
   - [ ] 린트 통과

### 리뷰 프로세스

1. 최소 1명의 승인 필요
2. 모든 CI 체크 통과
3. 충돌 해결

---

## 테스트 작성

### 단위 테스트

- 각 함수/컴포넌트별 테스트 작성
- 테스트 커버리지 80% 이상 목표

```typescript
// 예시: utils/validation.test.ts
import { validateEmail } from './validation'

describe('validateEmail', () => {
  it('should return true for valid email', () => {
    expect(validateEmail('test@example.com')).toBe(true)
  })

  it('should return false for invalid email', () => {
    expect(validateEmail('invalid')).toBe(false)
  })
})
```

### 통합 테스트

- API 엔드포인트 테스트
- 데이터베이스 연동 테스트

### E2E 테스트

- 주요 사용자 시나리오 테스트
- Playwright 또는 Cypress 사용

---

## 문서화

### 코드 문서화

- JSDoc 주석 작성
- 복잡한 로직 설명

```typescript
/**
 * 프롬프트 생성 함수
 * @param content - 사용자 입력 내용
 * @param options - 생성 옵션
 * @returns 생성된 프롬프트 결과
 */
export function generatePrompt(content: string, options: PromptOptions): PromptResult {
  // ...
}
```

### README 업데이트

- 새로운 기능 추가 시 README 업데이트
- 사용 예시 포함

### API 문서

- Swagger/OpenAPI 주석 작성
- 엔드포인트 설명 추가

---

## 문의

질문이나 제안사항이 있으시면 이슈를 생성해주세요.

---

**감사합니다!** 🎉
