# Spec-Kit 기반 개발 체크리스트

이 문서는 [GitHub Spec-Kit](https://github.com/github/spec-kit)의 명세 주도 개발(Spec-Driven Development) 원칙을 프롬프트 생성기 시스템에 적용하기 위한 체크리스트입니다.

---

## 📋 목차

1. [프로젝트 원칙 (Constitution)](#1-프로젝트-원칙-constitution)
2. [명세서 작성 (Specification)](#2-명세서-작성-specification)
3. [기술 구현 계획 (Planning)](#3-기술-구현-계획-planning)
4. [작업 목록 생성 (Tasks)](#4-작업-목록-생성-tasks)
5. [구현 및 테스트 (Implementation)](#5-구현-및-테스트-implementation)
6. [문서화 및 유지보수 (Documentation)](#6-문서화-및-유지보수-documentation)

---

## 1. 프로젝트 원칙 (Constitution)

### ✅ 코드 품질 기준

- [ ] **타입 안정성**
  - [ ] 모든 TypeScript 파일에 명시적 타입 정의
  - [ ] `any` 타입 사용 최소화 (필요시 `unknown` 사용)
  - [ ] Prisma 스키마와 TypeScript 타입 동기화
  - [ ] API 요청/응답에 Pydantic/FastAPI 모델 적용 (agent-lightning/main.py)

- [ ] **코드 일관성**
  - [ ] ESLint/Prettier 설정 및 자동 포맷팅
  - [ ] 네이밍 컨벤션 준수 (camelCase, PascalCase)
  - [ ] 파일 구조 일관성 유지
  - [ ] import 순서 정리 (외부 → 내부 → 상대)

- [ ] **에러 처리**
  - [ ] 모든 API 엔드포인트에 try-catch 블록
  - [ ] 사용자 친화적 에러 메시지 제공
  - [ ] 에러 로깅 시스템 구축 (logger 사용)
  - [ ] HTTP 상태 코드 적절히 사용

- [ ] **성능 최적화**
  - [ ] React 컴포넌트 메모이제이션 (useMemo, useCallback)
  - [ ] 불필요한 리렌더링 방지
  - [ ] 데이터베이스 쿼리 최적화 (Prisma 인덱스, 관계 최적화)
  - [ ] 이미지/에셋 최적화 및 지연 로딩

### ✅ 테스트 기준

- [ ] **단위 테스트**
  - [ ] 핵심 유틸리티 함수 테스트 (promptGenerator.ts 등)
  - [ ] API 라우트 단위 테스트
  - [ ] React 컴포넌트 단위 테스트
  - [ ] 테스트 커버리지 70% 이상 목표

- [ ] **통합 테스트**
  - [ ] API 엔드포인트 통합 테스트
  - [ ] 데이터베이스 트랜잭션 테스트
  - [ ] 인증/권한 플로우 테스트

- [ ] **E2E 테스트**
  - [ ] 주요 사용자 시나리오 테스트
  - [ ] 프롬프트 생성 플로우 테스트
  - [ ] Admin 대시보드 플로우 테스트

### ✅ 사용자 경험 일관성

- [ ] **UI/UX 일관성**
  - [ ] Black/White 미니멀 디자인 시스템 준수
  - [ ] IBM Plex Sans KR 폰트 일관적 사용
  - [ ] 버튼/입력 필드 스타일 통일
  - [ ] 로딩 상태 표시 일관성
  - [ ] 에러 메시지 표시 방식 통일

- [ ] **접근성 (A11y)**
  - [ ] 키보드 네비게이션 지원
  - [ ] ARIA 레이블 및 역할 속성
  - [ ] 스크린 리더 지원
  - [ ] 색상 대비 비율 WCAG AA 준수
  - [ ] 애니메이션 감소 설정 지원 (prefers-reduced-motion)

- [ ] **반응형 디자인**
  - [ ] 모바일 (480px 이하) 최적화
  - [ ] 태블릿 (768px 이하) 최적화
  - [ ] 데스크톱 (1200px 최대 너비) 최적화
  - [ ] 모든 주요 기능 모바일에서 사용 가능

### ✅ 성능 요구사항

- [ ] **프론트엔드 성능**
  - [ ] 초기 로딩 시간 < 3초
  - [ ] Lighthouse 성능 점수 > 90
  - [ ] 번들 크기 최적화 (코드 스플리팅)
  - [ ] 이미지 최적화 (WebP, lazy loading)

- [ ] **백엔드 성능**
  - [ ] API 응답 시간 < 500ms (평균)
  - [ ] 데이터베이스 쿼리 최적화
  - [ ] 캐싱 전략 수립 (Redis 고려)
  - [ ] 연결 풀링 설정

- [ ] **확장성**
  - [ ] 수평 확장 가능한 아키텍처
  - [ ] 상태 관리 최적화
  - [ ] 데이터베이스 인덱스 최적화

---

## 2. 명세서 작성 (Specification)

### ✅ 기능 명세서

#### 텍스트 프롬프트 생성 기능
- [ ] **입력 요구사항**
  - [ ] 사용자 자연어 입력 필수
  - [ ] 콘텐츠 타입 선택 (블로그, LinkedIn, Facebook, Instagram, YouTube)
  - [ ] 상세 옵션 (나이, 성별, 직업, 대화체) 선택 가능

- [ ] **출력 요구사항**
  - [ ] 메타 프롬프트 생성
  - [ ] 컨텍스트 프롬프트 생성
  - [ ] 해시태그 10개 이하 자동 생성
  - [ ] Native English 버전 자동 생성

- [ ] **비즈니스 로직**
  - [ ] 콘텐츠 타입별 프롬프트 템플릿 적용
  - [ ] 타겟 독자 설정 반영
  - [ ] SEO/GEO/AEO 최적화 (블로그의 경우)

#### 이미지 프롬프트 생성 기능
- [ ] **입력 요구사항**
  - [ ] 주제 입력 필수
  - [ ] 모델 선택 (Midjourney, DALL-E, Stable Diffusion 등)
  - [ ] 아트 스타일 선택
  - [ ] 구도, 조명, 색상 설정
  - [ ] 기술적 설정 (해상도, 품질, 아스펙트 비율)

- [ ] **출력 요구사항**
  - [ ] 모델별 최적화된 프롬프트 생성
  - [ ] 모델별 파라미터 포함 (예: Midjourney --v, --style)
  - [ ] 네거티브 프롬프트 제안
  - [ ] Native English 버전 제공

#### 동영상 프롬프트 생성 기능
- [ ] **입력 요구사항**
  - [ ] 전체 스타일 설정 (장르, 분위기, 색감)
  - [ ] 스토리보드 구성 (여러 장면 추가 가능)
  - [ ] 각 장면별 상세 설정 (카메라, 모션, 길이)
  - [ ] 기술적 설정 (프레임레이트, 해상도, 총 길이)

- [ ] **출력 요구사항**
  - [ ] 전체 프롬프트 생성
  - [ ] 장면별 개별 프롬프트 생성
  - [ ] 장면별 Native English 버전 제공
  - [ ] 장르/분위기별 자동 상세 묘사 추가

#### 프롬프트 엔지니어링 기능
- [ ] **입력 요구사항**
  - [ ] 엔지니어링 방법 선택 (Zero-shot, CoT, Few-shot, Role-based, Optimize)
  - [ ] 기본 프롬프트 입력
  - [ ] 방법별 추가 설정 입력

- [ ] **출력 요구사항**
  - [ ] 엔지니어링된 프롬프트 생성
  - [ ] 최적화 점수 제공 (Optimize 방법 사용 시)
  - [ ] 개선 사항 및 제안 사항 목록
  - [ ] Native English 버전 제공

#### Admin 대시보드 기능
- [ ] **인증 요구사항**
  - [ ] JWT 기반 인증
  - [ ] ADMIN_EMAIL 환경 변수 기반 권한 부여
  - [ ] 로그인 세션 관리

- [ ] **통계 대시보드**
  - [ ] 총 방문수 표시
  - [ ] 총 프롬프트 생성 건수
  - [ ] 카테고리별 생성 건수
  - [ ] 실시간 통계 업데이트 (5초마다)

- [ ] **프롬프트 생성 기록**
  - [ ] 모든 생성 기록 저장 (최대 1000개)
  - [ ] 카테고리별 필터링
  - [ ] 상세 옵션 표시
  - [ ] 기록 검색 기능

### ✅ API 명세서

- [ ] **인증 API**
  - [ ] `POST /api/auth/register` - 사용자 등록
  - [ ] `POST /api/auth/login` - 로그인
  - [ ] `GET /api/auth/me` - 현재 사용자 정보

- [ ] **프롬프트 API**
  - [ ] `GET /api/prompts` - 프롬프트 목록 조회 (필터링, 페이지네이션)
  - [ ] `POST /api/prompts` - 프롬프트 생성
  - [ ] `GET /api/prompts/:id` - 프롬프트 상세 조회
  - [ ] `PUT /api/prompts/:id` - 프롬프트 수정
  - [ ] `DELETE /api/prompts/:id` - 프롬프트 삭제

- [ ] **템플릿 API**
  - [ ] `GET /api/templates` - 템플릿 목록 조회
  - [ ] `POST /api/templates` - 템플릿 생성
  - [ ] `GET /api/templates/:id` - 템플릿 상세 조회

- [ ] **Admin API**
  - [ ] `GET /api/admin/stats` - 통계 조회
  - [ ] `GET /api/admin/prompts` - 모든 프롬프트 기록 조회
  - [ ] `GET /api/admin/guides/latest` - 최신 가이드 조회
  - [ ] `GET /api/admin/guides/history` - 가이드 수집 이력

- [ ] **AI 서비스 API**
  - [ ] `GET /api/ai-services` - AI 서비스 목록 조회
  - [ ] `GET /api/ai-services/:id` - AI 서비스 상세 조회
  - [ ] `GET /api/ai-services/category/:category` - 카테고리별 조회

- [ ] **가이드 API**
  - [ ] `GET /api/guides/public/latest` - 공개 최신 가이드 조회
  - [ ] `POST /api/guides/collect` - 가이드 수집 트리거
  - [ ] `POST /api/guides/collect/:modelName` - 특정 모델 가이드 수집

### ✅ 데이터베이스 스키마 명세서

- [ ] **사용자/권한 관련**
  - [ ] User 모델 (id, email, password, role, createdAt, updatedAt)
  - [ ] Workspace 모델 (id, name, ownerId, createdAt)
  - [ ] WorkspaceMember 모델 (workspaceId, userId, role)

- [ ] **프롬프트 관련**
  - [ ] Prompt 모델 (id, userId, category, content, metadata, createdAt)
  - [ ] PromptVersion 모델 (id, promptId, version, content, createdAt)
  - [ ] Folder 모델 (id, userId, name, parentId)
  - [ ] PromptTag 모델 (id, name, color)
  - [ ] PromptTagRelation 모델 (promptId, tagId)

- [ ] **템플릿/가이드 관련**
  - [ ] Template 모델 (id, name, category, content, metadata)
  - [ ] PromptGuide 모델 (id, modelName, category, title, content, confidence, version)
  - [ ] GuideSource 모델 (id, guideId, url, type)
  - [ ] GuideCollectionJob 모델 (id, status, startedAt, completedAt)
  - [ ] GuideCollectionResult 모델 (id, jobId, modelName, success, result)

- [ ] **자동화/메타데이터**
  - [ ] AIService 모델 (id, name, category, url, status, metadata)
  - [ ] Analytics 모델 (id, eventType, metadata, createdAt)
  - [ ] AdminAuditLog 모델 (id, userId, action, resource, metadata, createdAt)

---

## 3. 기술 구현 계획 (Planning)

### ✅ 기술 스택 결정

- [ ] **프론트엔드**
  - [x] React 18 (선택 완료)
  - [x] TypeScript (선택 완료)
  - [x] Vite (선택 완료)
  - [ ] 테스트 라이브러리 선택 (Jest + React Testing Library)

- [ ] **백엔드**
  - [x] Express 5 (선택 완료)
  - [x] Prisma (선택 완료)
  - [x] PostgreSQL (선택 완료)
  - [ ] 캐싱 레이어 (Redis 고려)

- [ ] **인증/보안**
  - [x] JWT (선택 완료)
  - [ ] bcryptjs (비밀번호 해싱) - 이미 사용 중
  - [ ] CORS 설정 검토 및 최적화

- [ ] **배포/인프라**
  - [ ] Railway 배포 설정 검토
  - [ ] Vercel 프론트엔드 배포 설정 검토
  - [ ] 환경 변수 관리 전략
  - [ ] CI/CD 파이프라인 구축

### ✅ 아키텍처 설계

- [ ] **프론트엔드 아키텍처**
  - [x] 컴포넌트 기반 구조 (완료)
  - [x] 타입 시스템 구축 (완료)
  - [x] 상태 관리 (로컬 상태 + Context API) (완료)
  - [ ] 전역 상태 관리 라이브러리 고려 (필요시 Zustand/Redux)

- [ ] **백엔드 아키텍처**
  - [x] RESTful API 설계 (완료)
  - [x] 라우트 모듈화 (완료)
  - [x] 미들웨어 구조 (완료)
  - [ ] API 버전 관리 전략

- [ ] **데이터베이스 설계**
  - [x] Prisma 스키마 정의 (완료)
  - [ ] 인덱스 최적화
  - [ ] 마이그레이션 전략
  - [ ] 백업 전략

### ✅ 라이브러리 및 도구 선택

- [ ] **개발 도구**
  - [x] TypeScript (선택 완료)
  - [x] ESLint/Prettier 설정 필요
  - [ ] Husky (Git hooks)
  - [ ] lint-staged (커밋 전 린트)

- [ ] **테스트 도구**
  - [ ] Jest (단위 테스트)
  - [ ] React Testing Library (컴포넌트 테스트)
  - [ ] Supertest (API 테스트)
  - [ ] Playwright (E2E 테스트)

- [ ] **모니터링/로깅**
  - [ ] Vercel Analytics (이미 사용 중)
  - [ ] Vercel Speed Insights (이미 사용 중)
  - [ ] 에러 추적 도구 (Sentry 고려)

---

## 4. 작업 목록 생성 (Tasks)

### ✅ 우선순위별 작업 분류

#### P0 (Critical - 즉시 필요)
- [ ] **보안 강화**
  - [ ] 환경 변수 검증 강화
  - [ ] SQL Injection 방지 (Prisma 사용으로 이미 방지됨)
  - [ ] XSS 방지 (입력 검증 및 sanitization)
  - [ ] CSRF 토큰 구현

- [ ] **에러 처리 개선**
  - [ ] 전역 에러 핸들러 구현
  - [ ] 에러 로깅 시스템 구축
  - [ ] 사용자 친화적 에러 메시지

- [ ] **기본 테스트 작성**
  - [ ] 핵심 API 엔드포인트 테스트
  - [ ] 프롬프트 생성 로직 테스트

#### P1 (High - 단기간 내 필요)
- [ ] **성능 최적화**
  - [ ] 데이터베이스 쿼리 최적화
  - [ ] 프론트엔드 번들 크기 최적화
  - [ ] 이미지/에셋 최적화

- [ ] **기능 개선**
  - [ ] 프롬프트 저장 기능 (워크스페이스 연동)
  - [ ] 프롬프트 공유 기능
  - [ ] 프롬프트 버전 관리 UI

- [ ] **문서화**
  - [ ] API 문서 작성 (Swagger/OpenAPI)
  - [ ] 개발자 가이드 작성
  - [ ] 사용자 가이드 작성

#### P2 (Medium - 중기간 내 필요)
- [ ] **고급 기능**
  - [ ] 프롬프트 A/B 테스트 기능
  - [ ] 멀티모델 생성 기능
  - [ ] 프롬프트 템플릿 라이브러리 확장

- [ ] **분석 및 모니터링**
  - [ ] 사용자 행동 분석
  - [ ] 성능 모니터링 대시보드
  - [ ] 에러 추적 시스템

#### P3 (Low - 장기간 내 필요)
- [ ] **확장 기능**
  - [ ] 프롬프트 협업 기능
  - [ ] 프롬프트 마켓플레이스
  - [ ] API 키 관리 시스템

### ✅ 작업 세부 분해

#### 프롬프트 저장 기능 구현
- [ ] **백엔드 작업**
  - [ ] `POST /api/prompts` 엔드포인트 구현
  - [ ] 워크스페이스 권한 검증 로직
  - [ ] 프롬프트 버전 생성 로직
  - [ ] 폴더/태그 연동 로직

- [ ] **프론트엔드 작업**
  - [ ] 프롬프트 저장 UI 컴포넌트
  - [ ] 워크스페이스 선택 UI
  - [ ] 폴더/태그 선택 UI
  - [ ] 저장 성공/실패 피드백

- [ ] **테스트**
  - [ ] API 엔드포인트 테스트
  - [ ] 권한 검증 테스트
  - [ ] UI 컴포넌트 테스트

#### 프롬프트 공유 기능 구현
- [ ] **백엔드 작업**
  - [ ] `POST /api/prompts/:id/share` 엔드포인트
  - [ ] 공유 링크 생성 로직
  - [ ] 공유 권한 관리

- [ ] **프론트엔드 작업**
  - [ ] 공유 버튼 UI
  - [ ] 공유 링크 복사 기능
  - [ ] 공유된 프롬프트 조회 UI

---

## 5. 구현 및 테스트 (Implementation)

### ✅ 개발 워크플로우

- [ ] **브랜치 전략**
  - [ ] main: 프로덕션 브랜치
  - [ ] develop: 개발 브랜치
  - [ ] feature/*: 기능 개발 브랜치
  - [ ] bugfix/*: 버그 수정 브랜치
  - [ ] hotfix/*: 긴급 수정 브랜치

- [ ] **커밋 컨벤션**
  - [ ] Conventional Commits 사용
  - [ ] 커밋 메시지 형식: `type(scope): description`
  - [ ] 타입: feat, fix, docs, style, refactor, test, chore

- [ ] **코드 리뷰 프로세스**
  - [ ] Pull Request 필수
  - [ ] 최소 1명의 리뷰어 승인
  - [ ] CI/CD 통과 필수

### ✅ 테스트 전략

- [ ] **단위 테스트**
  - [ ] 유틸리티 함수 테스트
  - [ ] 비즈니스 로직 테스트
  - [ ] API 라우트 테스트

- [ ] **통합 테스트**
  - [ ] API 엔드포인트 통합 테스트
  - [ ] 데이터베이스 통합 테스트
  - [ ] 인증 플로우 테스트

- [ ] **E2E 테스트**
  - [ ] 주요 사용자 시나리오
  - [ ] 프롬프트 생성 플로우
  - [ ] Admin 대시보드 플로우

### ✅ 배포 전 체크리스트

- [ ] **코드 품질**
  - [ ] 린트 에러 없음
  - [ ] 타입 에러 없음
  - [ ] 테스트 통과 (커버리지 70% 이상)

- [ ] **보안**
  - [ ] 환경 변수 검증
  - [ ] 민감 정보 제거 확인
  - [ ] 의존성 취약점 검사

- [ ] **성능**
  - [ ] Lighthouse 점수 확인
  - [ ] 번들 크기 확인
  - [ ] API 응답 시간 확인

- [ ] **문서**
  - [ ] README 업데이트
  - [ ] API 문서 업데이트
  - [ ] 변경 사항 문서화

---

## 6. 문서화 및 유지보수 (Documentation)

### ✅ 코드 문서화

- [ ] **주석 및 JSDoc**
  - [ ] 모든 공개 함수에 JSDoc 주석
  - [ ] 복잡한 로직에 인라인 주석
  - [ ] 타입 정의에 설명 추가

- [ ] **README 문서**
  - [x] 프로젝트 개요 (완료)
  - [x] 설치 및 실행 가이드 (완료)
  - [ ] 기여 가이드
  - [ ] 라이선스 정보

### ✅ API 문서화

- [ ] **OpenAPI/Swagger**
  - [ ] API 엔드포인트 문서화
  - [ ] 요청/응답 스키마 정의
  - [ ] 인증 방법 문서화
  - [ ] 예제 요청/응답 제공

### ✅ 사용자 문서화

- [ ] **사용자 가이드**
  - [ ] 기능별 사용 방법
  - [ ] FAQ 작성
  - [ ] 스크린샷/동영상 가이드

- [ ] **개발자 가이드**
  - [ ] 개발 환경 설정
  - [ ] 아키텍처 설명
  - [ ] 기여 가이드라인

### ✅ 유지보수 계획

- [ ] **정기 업데이트**
  - [ ] 의존성 업데이트 (월 1회)
  - [ ] 보안 패치 적용 (즉시)
  - [ ] 성능 모니터링 (주 1회)

- [ ] **버전 관리**
  - [ ] Semantic Versioning 준수
  - [ ] CHANGELOG 유지
  - [ ] 릴리즈 노트 작성

- [ ] **모니터링 및 로깅**
  - [ ] 에러 로그 모니터링
  - [ ] 성능 메트릭 수집
  - [ ] 사용자 피드백 수집

---

## 📝 체크리스트 사용 방법

1. **새 기능 개발 시**
   - 2번 "명세서 작성" 섹션에서 해당 기능 명세 작성
   - 3번 "기술 구현 계획"에서 기술 스택 및 아키텍처 결정
   - 4번 "작업 목록 생성"에서 작업 세부 분해
   - 5번 "구현 및 테스트"에서 개발 및 테스트 수행

2. **기존 기능 개선 시**
   - 1번 "프로젝트 원칙"에서 관련 기준 확인
   - 2번 "명세서 작성"에서 변경 사항 명세
   - 5번 "구현 및 테스트"에서 개선 작업 수행

3. **정기 점검**
   - 월 1회 전체 체크리스트 검토
   - 완료된 항목 체크
   - 미완료 항목 우선순위 재평가

---

## 🔄 업데이트 이력

- **2025-01-XX**: 초기 체크리스트 작성 (Spec-Kit 원칙 기반)

---

## 📚 참고 자료

- [GitHub Spec-Kit](https://github.com/github/spec-kit)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [WCAG 접근성 가이드라인](https://www.w3.org/WAI/WCAG21/quickref/)

