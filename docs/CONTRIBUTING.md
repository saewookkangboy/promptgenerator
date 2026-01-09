# 기여 가이드

프롬프트 생성기 프로젝트에 기여해주셔서 감사합니다! 이 문서는 프로젝트에 기여하는 방법을 안내합니다.

## 📋 목차

- [기여 방법](#기여-방법)
- [개발 환경 설정](#개발-환경-설정)
- [코딩 스타일](#코딩-스타일)
- [커밋 가이드라인](#커밋-가이드라인)
- [Pull Request 프로세스](#pull-request-프로세스)
- [이슈 리포트](#이슈-리포트)

---

## 기여 방법

### 기여 유형

1. **버그 수정**: 버그를 발견하고 수정
2. **기능 추가**: 새로운 기능 구현
3. **문서 개선**: 문서 작성 및 개선
4. **코드 리팩토링**: 코드 품질 개선
5. **테스트 추가**: 테스트 코드 작성

---

## 개발 환경 설정

### 1. 저장소 포크 및 클론

```bash
# 저장소 포크 후 클론
git clone https://github.com/your-username/prompt-generator.git
cd prompt-generator

# 원본 저장소를 upstream으로 추가
git remote add upstream https://github.com/original-org/prompt-generator.git
```

### 2. 개발 브랜치 생성

```bash
# 최신 코드 가져오기
git checkout main
git pull upstream main

# 기능 브랜치 생성
git checkout -b feature/your-feature-name
# 또는
git checkout -b fix/your-bug-fix
```

### 3. 개발 및 테스트

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev          # 프론트엔드
npm run server:dev   # 백엔드

# 테스트 실행
npm test

# 린트 검사
npm run lint
```

---

## 코딩 스타일

### TypeScript

- `strict` 모드 준수
- `any` 타입 사용 최소화
- 명시적 타입 정의
- JSDoc 주석 추가 (공개 함수)

### 코드 포맷팅

- **Prettier** 사용 (자동 포맷팅)
- **ESLint** 규칙 준수
- 저장 시 자동 포맷팅 (VS Code 설정)

### 네이밍 컨벤션

- **변수/함수**: `camelCase`
- **클래스/인터페이스**: `PascalCase`
- **상수**: `UPPER_SNAKE_CASE`
- **파일명**: `camelCase` (컴포넌트는 `PascalCase`)

### 예시

```typescript
// ✅ 좋은 예
interface UserProfile {
  id: string
  email: string
  name: string | null
}

function getUserProfile(userId: string): Promise<UserProfile> {
  // ...
}

// ❌ 나쁜 예
function getUserProfile(userId: any): any {
  // ...
}
```

---

## 커밋 가이드라인

### 커밋 메시지 형식

```
type(scope): subject

body (optional)

footer (optional)
```

### 타입

- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 포맷팅 (기능 변경 없음)
- `refactor`: 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드/설정 변경
- `perf`: 성능 개선
- `ci`: CI/CD 변경
- `security`: 보안 관련

### 예시

```bash
# 좋은 커밋 메시지
feat(auth): Add refresh token support

- Implement access/refresh token separation
- Add token refresh endpoint
- Update authentication middleware

Closes #123

# 나쁜 커밋 메시지
fix bug
update code
```

---

## Pull Request 프로세스

### 1. PR 생성 전 체크리스트

- [ ] 코드가 린트 규칙을 통과함 (`npm run lint`)
- [ ] 코드가 포맷팅됨 (`npm run format`)
- [ ] 테스트가 통과함 (`npm test`)
- [ ] 문서가 업데이트됨 (필요한 경우)
- [ ] 커밋 메시지가 가이드라인을 따름

### 2. PR 제목 형식

```
type(scope): Brief description
```

예: `feat(prompts): Add prompt version history`

### 3. PR 설명 템플릿

```markdown
## 변경 사항
- 변경 내용 1
- 변경 내용 2

## 관련 이슈
Closes #123

## 테스트
- [ ] 로컬 테스트 통과
- [ ] 단위 테스트 통과
- [ ] 통합 테스트 통과

## 스크린샷 (UI 변경인 경우)
[스크린샷 첨부]
```

### 4. 코드 리뷰

- PR 생성 후 리뷰어 할당 요청
- 리뷰 코멘트에 대한 피드백 반영
- 승인 후 머지

---

## 이슈 리포트

### 버그 리포트

버그를 발견한 경우 다음 정보를 포함해주세요:

1. **버그 설명**: 무엇이 문제인지
2. **재현 단계**: 버그를 재현하는 방법
3. **예상 동작**: 기대했던 동작
4. **실제 동작**: 실제로 발생한 동작
5. **환경 정보**: 브라우저, OS, Node 버전 등
6. **스크린샷/로그**: 가능한 경우

### 기능 제안

새로운 기능을 제안하는 경우:

1. **기능 설명**: 무엇을 추가하고 싶은지
2. **사용 사례**: 어떻게 사용될지
3. **대안**: 고려한 다른 방법
4. **추가 컨텍스트**: 관련 정보

---

## 코드 리뷰 가이드라인

### 리뷰어 체크리스트

- [ ] 코드가 요구사항을 만족하는가?
- [ ] 코드가 스타일 가이드를 따르는가?
- [ ] 테스트가 충분한가?
- [ ] 보안 이슈가 없는가?
- [ ] 성능 이슈가 없는가?
- [ ] 문서가 업데이트되었는가?

### 리뷰 코멘트 작성

- **건설적**: 비판보다는 개선 제안
- **구체적**: 어떤 부분을 어떻게 개선할지 명시
- **친절함**: 존중하는 톤 유지

---

## 질문 및 지원

- **이슈**: GitHub Issues에 질문 게시
- **문서**: `docs/` 폴더의 문서 참고
- **API 문서**: `/api-docs` (Swagger UI)

---

## 라이선스

기여하신 코드는 프로젝트의 라이선스를 따릅니다.

---

**감사합니다!** 🎉
