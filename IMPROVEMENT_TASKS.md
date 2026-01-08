# 시스템 개선 작업 TASK

이 문서는 현재 프롬프트 생성기 시스템을 개선하기 위한 구체적인 작업 목록입니다. 각 작업은 우선순위별로 분류되어 있으며, 실행 가능한 단위로 세분화되어 있습니다.

---

## 📋 목차

1. [P0 - Critical (즉시 필요)](#p0---critical-즉시-필요)
2. [P1 - High (단기간 내 필요)](#p1---high-단기간-내-필요)
3. [P2 - Medium (중기간 내 필요)](#p2---medium-중기간-내-필요)
4. [P3 - Low (장기간 내 필요)](#p3---low-장기간-내-필요)
5. [작업 진행 방법](#작업-진행-방법)

---

## P0 - Critical (즉시 필요)

### 🔒 보안 강화

#### TASK-001: 환경 변수 검증 강화
**상태**: 🔴 미시작  
**예상 시간**: 2시간  
**담당자**: -  
**우선순위**: P0

**작업 내용**:
- [ ] `scripts/check-env.js` 개선하여 필수 환경 변수 누락 시 빌드 실패하도록 수정
- [ ] `.env.example` 파일 생성 및 모든 필수 변수 문서화
- [ ] 환경 변수 타입 검증 추가 (예: DATABASE_URL 형식 검증)
- [ ] 서버 시작 시 환경 변수 검증 로직 추가

**관련 파일**:
- `scripts/check-env.js`
- `.env.example` (신규 생성)
- `server/index.js`

**완료 기준**:
- 모든 필수 환경 변수 누락 시 서버가 시작되지 않음
- `.env.example` 파일에 모든 필수 변수 문서화됨

---

#### TASK-002: 입력 검증 및 Sanitization
**상태**: 🔴 미시작  
**예상 시간**: 4시간  
**담당자**: -  
**우선순위**: P0

**작업 내용**:
- [ ] XSS 방지를 위한 입력 sanitization 라이브러리 추가 (DOMPurify 또는 validator.js)
- [ ] 모든 사용자 입력에 대한 검증 미들웨어 생성
- [ ] API 엔드포인트에 입력 검증 적용
  - [ ] `/api/auth/register` - 이메일, 비밀번호 검증
  - [ ] `/api/prompts` - 프롬프트 내용 검증
  - [ ] `/api/templates` - 템플릿 내용 검증
- [ ] SQL Injection 방지 확인 (Prisma 사용으로 이미 방지되지만 재확인)

**관련 파일**:
- `server/middleware/validation.ts` (신규 생성)
- `server/routes/auth.ts`
- `server/routes/prompts.ts`
- `server/routes/templates.ts`

**완료 기준**:
- 모든 사용자 입력이 검증됨
- XSS 공격 시도 차단됨
- 잘못된 입력에 대한 명확한 에러 메시지 제공

---

#### TASK-003: CORS 설정 최적화
**상태**: 🟡 부분 완료  
**예상 시간**: 1시간  
**담당자**: -  
**우선순위**: P0

**작업 내용**:
- [ ] 현재 `allow_origins: ["*"]` 설정을 프로덕션 환경에서는 특정 도메인으로 제한
- [ ] 환경 변수로 허용된 도메인 목록 관리 (`ALLOWED_ORIGINS`)
- [ ] 개발/프로덕션 환경별 CORS 설정 분리
- [ ] CORS 설정 문서화

**관련 파일**:
- `server/index.js`
- `agent-lightning/main.py`

**완료 기준**:
- 프로덕션 환경에서 특정 도메인만 허용
- 개발 환경에서는 localhost 허용
- CORS 에러 발생 시 명확한 로그 기록

---

### 🛠️ 에러 처리 개선

#### TASK-004: 전역 에러 핸들러 구현
**상태**: 🔴 미시작  
**예상 시간**: 3시간  
**담당자**: -  
**우선순위**: P0

**작업 내용**:
- [ ] Express 전역 에러 핸들러 미들웨어 생성
- [ ] 에러 타입별 처리 (Prisma 에러, Validation 에러, 일반 에러)
- [ ] 프로덕션 환경에서는 상세 에러 정보 숨김
- [ ] 개발 환경에서는 상세 스택 트레이스 제공
- [ ] 에러 로깅 시스템 구축 (파일 또는 외부 서비스)

**관련 파일**:
- `server/middleware/errorHandler.ts` (신규 생성)
- `server/index.js`

**완료 기준**:
- 모든 미처리 에러가 전역 핸들러로 전달됨
- 프로덕션에서 민감한 정보 노출되지 않음
- 모든 에러가 로그에 기록됨

---

#### TASK-005: API 에러 응답 표준화
**상태**: 🔴 미시작  
**예상 시간**: 2시간  
**담당자**: -  
**우선순위**: P0

**작업 내용**:
- [ ] 표준 에러 응답 형식 정의
  ```typescript
  {
    success: false,
    error: {
      code: string,
      message: string,
      details?: any
    }
  }
  ```
- [ ] 모든 API 엔드포인트에 표준 형식 적용
- [ ] HTTP 상태 코드 적절히 사용 (400, 401, 403, 404, 500 등)
- [ ] 에러 코드 상수 정의

**관련 파일**:
- `server/utils/errors.ts` (신규 생성)
- 모든 `server/routes/*.ts` 파일

**완료 기준**:
- 모든 API 에러 응답이 표준 형식으로 반환됨
- 적절한 HTTP 상태 코드 사용
- 프론트엔드에서 에러 처리 용이

---

### 📝 로깅 시스템 구축

#### TASK-006: 구조화된 로깅 시스템 구현
**상태**: 🔴 미시작  
**예상 시간**: 3시간  
**담당자**: -  
**우선순위**: P0

**작업 내용**:
- [ ] Winston 또는 Pino 로깅 라이브러리 추가
- [ ] 로그 레벨 설정 (error, warn, info, debug)
- [ ] 파일 로깅 설정 (에러 로그, 액세스 로그 분리)
- [ ] 로그 포맷 표준화 (JSON 형식)
- [ ] 환경별 로그 레벨 설정 (개발: debug, 프로덕션: info)
- [ ] 로그 로테이션 설정

**관련 파일**:
- `server/utils/logger.ts` (신규 생성)
- `server/index.js`
- `package.json`

**완료 기준**:
- 모든 로그가 구조화된 형식으로 기록됨
- 에러 로그와 일반 로그가 분리됨
- 로그 파일이 자동으로 로테이션됨

---

## P1 - High (단기간 내 필요)

### 🧪 테스트 인프라 구축

#### TASK-007: 테스트 환경 설정
**상태**: 🔴 미시작  
**예상 시간**: 4시간  
**담당자**: -  
**우선순위**: P1

**작업 내용**:
- [ ] Jest 설치 및 설정
- [ ] React Testing Library 설치 및 설정
- [ ] Supertest 설치 및 설정 (API 테스트용)
- [ ] 테스트 환경 변수 설정 (`.env.test`)
- [ ] 테스트 데이터베이스 설정 (별도 DB 또는 SQLite)
- [ ] `package.json`에 테스트 스크립트 추가
  - `npm test` - 모든 테스트 실행
  - `npm run test:watch` - 감시 모드
  - `npm run test:coverage` - 커버리지 리포트

**관련 파일**:
- `jest.config.js` (신규 생성)
- `jest.config.server.js` (신규 생성)
- `.env.test` (신규 생성)
- `package.json`

**완료 기준**:
- 테스트 환경이 정상적으로 설정됨
- 테스트 스크립트가 정상 실행됨
- 커버리지 리포트 생성됨

---

#### TASK-008: 핵심 유틸리티 함수 테스트 작성
**상태**: 🔴 미시작  
**예상 시간**: 6시간  
**담당자**: -  
**우선순위**: P1

**작업 내용**:
- [ ] `src/utils/promptGenerator.ts` 테스트 작성
  - [ ] `generatePrompts` 함수 테스트
  - [ ] 각 콘텐츠 타입별 테스트
  - [ ] 옵션 적용 테스트
- [ ] `src/utils/validation.ts` 테스트 작성 (있는 경우)
- [ ] `src/utils/storage.ts` 테스트 작성
- [ ] 테스트 커버리지 80% 이상 달성

**관련 파일**:
- `src/utils/__tests__/promptGenerator.test.ts` (신규 생성)
- `src/utils/__tests__/validation.test.ts` (신규 생성)
- `src/utils/__tests__/storage.test.ts` (신규 생성)

**완료 기준**:
- 핵심 유틸리티 함수 테스트 커버리지 80% 이상
- 모든 엣지 케이스 테스트됨

---

#### TASK-009: API 엔드포인트 테스트 작성
**상태**: 🔴 미시작  
**예상 시간**: 8시간  
**담당자**: -  
**우선순위**: P1

**작업 내용**:
- [ ] 인증 API 테스트
  - [ ] `POST /api/auth/register` - 성공/실패 케이스
  - [ ] `POST /api/auth/login` - 성공/실패 케이스
  - [ ] `GET /api/auth/me` - 인증된/미인증 사용자
- [ ] 프롬프트 API 테스트
  - [ ] `GET /api/prompts` - 목록 조회, 필터링, 페이지네이션
  - [ ] `POST /api/prompts` - 생성, 검증 실패 케이스
  - [ ] `GET /api/prompts/:id` - 조회, 권한 검증
  - [ ] `PUT /api/prompts/:id` - 수정, 권한 검증
  - [ ] `DELETE /api/prompts/:id` - 삭제, 권한 검증
- [ ] Admin API 테스트
  - [ ] 권한 검증 테스트
  - [ ] 통계 조회 테스트

**관련 파일**:
- `server/routes/__tests__/auth.test.ts` (신규 생성)
- `server/routes/__tests__/prompts.test.ts` (신규 생성)
- `server/routes/__tests__/admin.test.ts` (신규 생성)

**완료 기준**:
- 주요 API 엔드포인트 테스트 커버리지 70% 이상
- 성공/실패 케이스 모두 테스트됨
- 권한 검증 테스트 포함

---

### 🎨 코드 품질 도구 설정

#### TASK-010: ESLint 설정
**상태**: 🔴 미시작  
**예상 시간**: 2시간  
**담당자**: -  
**우선순위**: P1

**작업 내용**:
- [ ] ESLint 설치 및 설정
- [ ] TypeScript ESLint 플러그인 설정
- [ ] React ESLint 플러그인 설정
- [ ] 프로젝트 규칙 정의
  - [ ] `any` 타입 사용 금지
  - [ ] 미사용 변수 경고
  - [ ] import 순서 규칙
- [ ] `.eslintrc.json` 또는 `.eslintrc.js` 생성
- [ ] `package.json`에 lint 스크립트 추가
  - `npm run lint` - 린트 검사
  - `npm run lint:fix` - 자동 수정

**관련 파일**:
- `.eslintrc.json` (신규 생성)
- `package.json`

**완료 기준**:
- ESLint가 정상적으로 작동함
- 기존 코드에 린트 규칙 적용 (필요시 수정)
- CI/CD에서 린트 검사 통과 필수

---

#### TASK-011: Prettier 설정
**상태**: 🔴 미시작  
**예상 시간**: 1시간  
**담당자**: -  
**우선순위**: P1

**작업 내용**:
- [ ] Prettier 설치 및 설정
- [ ] `.prettierrc` 파일 생성 (프로젝트 스타일 정의)
- [ ] `.prettierignore` 파일 생성
- [ ] ESLint와 Prettier 통합 (eslint-config-prettier)
- [ ] `package.json`에 format 스크립트 추가
  - `npm run format` - 전체 파일 포맷팅
  - `npm run format:check` - 포맷팅 검사
- [ ] VS Code 설정 파일 추가 (`.vscode/settings.json`)

**관련 파일**:
- `.prettierrc` (신규 생성)
- `.prettierignore` (신규 생성)
- `.vscode/settings.json` (신규 생성)
- `package.json`

**완료 기준**:
- Prettier가 정상적으로 작동함
- 저장 시 자동 포맷팅 (VS Code)
- CI/CD에서 포맷팅 검사 통과 필수

---

#### TASK-012: Git Hooks 설정 (Husky)
**상태**: 🔴 미시작  
**예상 시간**: 2시간  
**담당자**: -  
**우선순위**: P1

**작업 내용**:
- [ ] Husky 설치 및 설정
- [ ] pre-commit hook 설정
  - [ ] 린트 검사
  - [ ] 포맷팅 검사
  - [ ] 타입 체크
  - [ ] 테스트 실행 (선택적)
- [ ] commit-msg hook 설정 (Conventional Commits 검증)
- [ ] pre-push hook 설정 (테스트 실행)

**관련 파일**:
- `.husky/pre-commit` (신규 생성)
- `.husky/commit-msg` (신규 생성)
- `.husky/pre-push` (신규 생성)
- `package.json`

**완료 기준**:
- 커밋 전 자동으로 린트/포맷팅 검사
- 잘못된 커밋 메시지 거부
- 푸시 전 테스트 실행

---

### ⚡ 성능 최적화

#### TASK-013: 데이터베이스 쿼리 최적화
**상태**: 🔴 미시작  
**예상 시간**: 4시간  
**담당자**: -  
**우선순위**: P1

**작업 내용**:
- [ ] Prisma 스키마에 인덱스 추가
  - [ ] `Prompt.userId` 인덱스
  - [ ] `Prompt.category` 인덱스
  - [ ] `Prompt.createdAt` 인덱스 (정렬 최적화)
  - [ ] `User.email` 유니크 인덱스 확인
- [ ] N+1 쿼리 문제 해결
  - [ ] `include` 또는 `select` 사용하여 관계 데이터 한 번에 조회
- [ ] 쿼리 성능 분석
  - [ ] Prisma 로깅 활성화
  - [ ] 느린 쿼리 식별 및 최적화
- [ ] 페이지네이션 최적화 (cursor-based pagination 고려)

**관련 파일**:
- `prisma/schema.prisma`
- `server/routes/prompts.ts`
- `server/routes/admin.ts`

**완료 기준**:
- 주요 쿼리 응답 시간 500ms 이하
- N+1 쿼리 문제 해결됨
- 인덱스가 적절히 설정됨

---

#### TASK-014: 프론트엔드 번들 크기 최적화
**상태**: 🔴 미시작  
**예상 시간**: 3시간  
**담당자**: -  
**우선순위**: P1

**작업 내용**:
- [ ] 번들 크기 분석 (vite-bundle-visualizer 또는 webpack-bundle-analyzer)
- [ ] 코드 스플리팅 적용
  - [ ] 라우트별 코드 스플리팅
  - [ ] 컴포넌트 지연 로딩 (React.lazy)
- [ ] 불필요한 의존성 제거
- [ ] 트리 쉐이킹 확인
- [ ] 번들 압축 최적화 (gzip, brotli)

**관련 파일**:
- `vite.config.mts`
- `src/App.tsx`
- `src/components/*.tsx`

**완료 기준**:
- 초기 번들 크기 50% 이상 감소
- Lighthouse 성능 점수 90 이상
- 초기 로딩 시간 3초 이하

---

## P2 - Medium (중기간 내 필요)

### 📚 문서화

#### TASK-015: API 문서 작성 (OpenAPI/Swagger)
**상태**: 🔴 미시작  
**예상 시간**: 6시간  
**담당자**: -  
**우선순위**: P2

**작업 내용**:
- [ ] Swagger/OpenAPI 라이브러리 설치 (swagger-ui-express, swagger-jsdoc)
- [ ] API 엔드포인트 문서화
  - [ ] 요청/응답 스키마 정의
  - [ ] 인증 방법 문서화
  - [ ] 예제 요청/응답 제공
- [ ] Swagger UI 설정
- [ ] `/api-docs` 엔드포인트 생성
- [ ] README에 API 문서 링크 추가

**관련 파일**:
- `server/utils/swagger.ts` (신규 생성)
- `server/index.js`
- 모든 `server/routes/*.ts` 파일 (JSDoc 주석 추가)

**완료 기준**:
- 모든 API 엔드포인트가 Swagger UI에 문서화됨
- 요청/응답 예제 제공됨
- 개발자가 API 문서를 쉽게 확인할 수 있음

---

#### TASK-016: 개발자 가이드 작성
**상태**: 🔴 미시작  
**예상 시간**: 4시간  
**담당자**: -  
**우선순위**: P2

**작업 내용**:
- [ ] 개발 환경 설정 가이드
- [ ] 프로젝트 구조 설명
- [ ] 아키텍처 다이어그램
- [ ] 코딩 컨벤션 문서
- [ ] 기여 가이드라인
- [ ] 트러블슈팅 가이드

**관련 파일**:
- `docs/DEVELOPER_GUIDE.md` (신규 생성)
- `docs/ARCHITECTURE.md` (신규 생성)
- `docs/CONTRIBUTING.md` (신규 생성)

**완료 기준**:
- 새로운 개발자가 프로젝트를 이해하고 기여할 수 있음
- 아키텍처가 명확히 문서화됨

---

### 🔄 CI/CD 개선

#### TASK-017: GitHub Actions CI/CD 파이프라인 구축
**상태**: 🟡 부분 완료 (GitHub Pages 배포만 있음)  
**예상 시간**: 4시간  
**담당자**: -  
**우선순위**: P2

**작업 내용**:
- [ ] PR 생성 시 자동 테스트 실행
  - [ ] 린트 검사
  - [ ] 타입 체크
  - [ ] 단위 테스트
  - [ ] 통합 테스트
- [ ] 코드 커버리지 리포트 생성 및 PR 코멘트
- [ ] 메인 브랜치 머지 시 자동 배포
- [ ] 배포 전 체크리스트 실행
- [ ] 배포 롤백 전략

**관련 파일**:
- `.github/workflows/ci.yml` (신규 생성)
- `.github/workflows/deploy.yml` (기존 파일 개선)

**완료 기준**:
- 모든 PR에 대해 자동 테스트 실행
- 테스트 실패 시 머지 불가
- 자동 배포 파이프라인 구축

---

### 🧩 React 컴포넌트 테스트

#### TASK-018: 핵심 컴포넌트 테스트 작성
**상태**: 🔴 미시작  
**예상 시간**: 8시간  
**담당자**: -  
**우선순위**: P2

**작업 내용**:
- [ ] `PromptGenerator` 컴포넌트 테스트
  - [ ] 프롬프트 생성 플로우
  - [ ] 옵션 변경 테스트
  - [ ] 에러 처리 테스트
- [ ] `ImagePromptGenerator` 컴포넌트 테스트
- [ ] `VideoPromptGenerator` 컴포넌트 테스트
- [ ] `AdminDashboard` 컴포넌트 테스트
- [ ] 공통 컴포넌트 테스트 (LoadingSpinner, ErrorMessage 등)

**관련 파일**:
- `src/components/__tests__/PromptGenerator.test.tsx` (신규 생성)
- `src/components/__tests__/ImagePromptGenerator.test.tsx` (신규 생성)
- `src/components/__tests__/VideoPromptGenerator.test.tsx` (신규 생성)
- `src/components/__tests__/AdminDashboard.test.tsx` (신규 생성)

**완료 기준**:
- 핵심 컴포넌트 테스트 커버리지 70% 이상
- 사용자 인터랙션 시나리오 테스트됨

---

### 🚀 성능 모니터링

#### TASK-019: 성능 모니터링 도구 통합
**상태**: 🟡 부분 완료 (Vercel Analytics 사용 중)  
**예상 시간**: 3시간  
**담당자**: -  
**우선순위**: P2

**작업 내용**:
- [ ] Web Vitals 모니터링 강화
- [ ] API 응답 시간 모니터링
- [ ] 데이터베이스 쿼리 성능 모니터링
- [ ] 에러 추적 도구 통합 (Sentry 고려)
- [ ] 성능 대시보드 구축

**관련 파일**:
- `server/utils/monitoring.ts` (신규 생성)
- `src/utils/analytics.ts` (개선)

**완료 기준**:
- 실시간 성능 메트릭 수집
- 성능 저하 시 알림 받음
- 에러 발생 시 즉시 알림

---

## P3 - Low (장기간 내 필요)

### 🎯 고급 기능

#### TASK-020: 프롬프트 버전 관리 UI 구현
**상태**: 🔴 미시작  
**예상 시간**: 6시간  
**담당자**: -  
**우선순위**: P3

**작업 내용**:
- [ ] 프롬프트 버전 히스토리 UI 컴포넌트
- [ ] 버전 비교 기능
- [ ] 이전 버전으로 롤백 기능
- [ ] 버전별 메타데이터 표시

**관련 파일**:
- `src/components/PromptVersionHistory.tsx` (신규 생성)
- `src/components/PromptVersionCompare.tsx` (신규 생성)

**완료 기준**:
- 사용자가 프롬프트 버전을 확인하고 비교할 수 있음
- 이전 버전으로 롤백 가능

---

#### TASK-021: 프롬프트 A/B 테스트 기능 구현
**상태**: 🔴 미시작  
**예상 시간**: 8시간  
**담당자**: -  
**우선순위**: P3

**작업 내용**:
- [ ] A/B 테스트 생성 UI
- [ ] 테스트 결과 수집 및 분석
- [ ] 통계적 유의성 계산
- [ ] 테스트 결과 시각화

**관련 파일**:
- `src/components/ABTestCreator.tsx` (신규 생성)
- `src/components/ABTestResults.tsx` (신규 생성)
- `server/routes/abtest.ts` (신규 생성)

**완료 기준**:
- 사용자가 프롬프트 A/B 테스트를 생성하고 결과를 확인할 수 있음
- 통계적 분석 결과 제공

---

#### TASK-022: 캐싱 전략 구현 (Redis)
**상태**: 🔴 미시작  
**예상 시간**: 6시간  
**담당자**: -  
**우선순위**: P3

**작업 내용**:
- [ ] Redis 클라이언트 설정
- [ ] 자주 조회되는 데이터 캐싱
  - [ ] AI 서비스 목록
  - [ ] 템플릿 목록
  - [ ] 가이드 데이터
- [ ] 캐시 무효화 전략
- [ ] 캐시 히트율 모니터링

**관련 파일**:
- `server/utils/cache.ts` (신규 생성)
- `server/routes/aiServices.ts`
- `server/routes/templates.ts`

**완료 기준**:
- API 응답 시간 50% 이상 개선
- 캐시 히트율 70% 이상
- 캐시 무효화가 적절히 작동함

---

### 📊 분석 및 리포팅

#### TASK-023: 사용자 행동 분석 구현
**상태**: 🔴 미시작  
**예상 시간**: 4시간  
**담당자**: -  
**우선순위**: P3

**작업 내용**:
- [ ] 이벤트 추적 시스템 구축
- [ ] 주요 사용자 행동 이벤트 정의
  - [ ] 프롬프트 생성
  - [ ] 템플릿 사용
  - [ ] 가이드 클릭
- [ ] 분석 대시보드 구현
- [ ] 데이터 시각화 (Chart.js 활용)

**관련 파일**:
- `src/utils/analytics.ts` (개선)
- `src/components/AnalyticsDashboard.tsx` (신규 생성)

**완료 기준**:
- 주요 사용자 행동이 추적됨
- 분석 대시보드에서 데이터 확인 가능

---

## 작업 진행 방법

### 1. 작업 선택
- 우선순위에 따라 작업 선택
- P0 작업부터 시작하여 순차적으로 진행
- 팀원과 협의하여 작업 분배

### 2. 작업 시작 전
- [ ] 관련 이슈 생성 (GitHub Issues)
- [ ] 작업 브랜치 생성 (`feature/TASK-XXX-description`)
- [ ] 작업 계획 검토

### 3. 작업 진행 중
- [ ] 작업 내용을 커밋 메시지에 명확히 기록
- [ ] 관련 파일에 주석 추가
- [ ] 중간 진행 상황 공유

### 4. 작업 완료 시
- [ ] 모든 체크리스트 항목 완료 확인
- [ ] 테스트 작성 및 통과 확인
- [ ] 코드 리뷰 요청
- [ ] 문서 업데이트
- [ ] 이슈 닫기

### 5. 작업 상태 업데이트
- 🔴 미시작
- 🟡 진행 중
- 🟢 완료
- ⚪ 보류

---

## 진행 상황 추적

### 전체 진행률
- **P0 (Critical)**: 0/6 완료 (0%)
- **P1 (High)**: 0/8 완료 (0%)
- **P2 (Medium)**: 0/5 완료 (0%)
- **P3 (Low)**: 0/4 완료 (0%)

### 최근 완료된 작업
- (작업 완료 시 여기에 기록)

### 다음 우선순위 작업
1. TASK-001: 환경 변수 검증 강화
2. TASK-002: 입력 검증 및 Sanitization
3. TASK-003: CORS 설정 최적화

---

## 참고 자료

- [Spec-Kit 체크리스트](./SPEC_KIT_CHECKLIST.md)
- [프로젝트 README](./README.md)
- [GitHub Spec-Kit](https://github.com/github/spec-kit)

---

**마지막 업데이트**: 2025-01-XX

