# 데이터베이스 및 Admin 설계 문서

## 목차
1. [시스템 개요](#시스템-개요)
2. [데이터베이스 스키마](#데이터베이스-스키마)
3. [Admin 기능 설계](#admin-기능-설계)
4. [API 엔드포인트](#api-엔드포인트)
5. [마이그레이션 계획](#마이그레이션-계획)

---

## 시스템 개요

### 목표
Tier 1 (Basic Premium)과 Tier 2 (Professional) 기능을 지원하는 데이터베이스 및 Admin 시스템 구축

### 주요 기능 범위

#### Tier 1 (Basic Premium)
- 고급 프롬프트 최적화 (A/B 테스트, 점수 예측, 버전 관리)
- 확장된 저장 공간 (무제한 프롬프트 히스토리)
- 프롬프트 폴더/태그 시스템
- 고급 템플릿 라이브러리

#### Tier 2 (Professional)
- AI 모델별 최적화
- 멀티 모델 동시 생성
- 실시간 프롬프트 테스트
- 팀 협업 기능
- 고급 분석 및 리포트

---

## 데이터베이스 스키마

### 기술 스택
- **데이터베이스**: PostgreSQL (또는 SQLite for MVP)
- **ORM**: Prisma (또는 TypeORM)
- **캐싱**: Redis
- **파일 저장**: AWS S3 (또는 로컬 저장소)

### ERD (Entity Relationship Diagram)

```
┌─────────────┐
│   Users     │
│─────────────│
│ id (PK)     │
│ email       │
│ password    │
│ tier        │
│ createdAt   │
└──────┬──────┘
       │
       │ 1:N
       ▼
┌─────────────┐      ┌─────────────┐
│  Workspaces │      │  Templates  │
│─────────────│      │─────────────│
│ id (PK)     │      │ id (PK)     │
│ name        │      │ name        │
│ ownerId(FK) │      │ category    │
│ tier        │      │ content      │
└──────┬──────┘      │ isPublic    │
       │             └─────────────┘
       │ 1:N
       ▼
┌─────────────┐
│  Prompts    │
│─────────────│
│ id (PK)     │
│ workspaceId │
│ content     │
│ category    │
│ model       │
│ version     │
└──────┬──────┘
       │
       │ 1:N
       ▼
┌─────────────┐      ┌─────────────┐
│  Versions   │      │  TestResults │
│─────────────│      │─────────────│
│ id (PK)     │      │ id (PK)     │
│ promptId    │      │ promptId    │
│ content     │      │ model       │
│ score       │      │ response    │
│ createdAt   │      │ metrics     │
└─────────────┘      └─────────────┘
```

---

## 상세 스키마 설계

### 1. Users (사용자)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  tier VARCHAR(50) DEFAULT 'free' CHECK (tier IN ('free', 'basic', 'professional', 'enterprise')),
  subscription_status VARCHAR(50) DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'expired')),
  subscription_started_at TIMESTAMP,
  subscription_ends_at TIMESTAMP,
  api_key VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tier ON users(tier);
CREATE INDEX idx_users_api_key ON users(api_key);
```

### 2. Workspaces (워크스페이스 - Tier 2)

```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier VARCHAR(50) DEFAULT 'free' CHECK (tier IN ('free', 'basic', 'professional', 'enterprise')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX idx_workspaces_tier ON workspaces(tier);
```

### 3. Workspace Members (워크스페이스 멤버 - Tier 2)

```sql
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  permissions JSONB DEFAULT '{}',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
```

### 4. Prompts (프롬프트)

```sql
CREATE TABLE prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  content TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('text', 'image', 'video', 'engineering')),
  model VARCHAR(100),
  input_text TEXT,
  options JSONB DEFAULT '{}',
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  is_template BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,
  is_favorite BOOLEAN DEFAULT FALSE,
  version_number INTEGER DEFAULT 1,
  parent_version_id UUID REFERENCES prompt_versions(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_prompts_user ON prompts(user_id);
CREATE INDEX idx_prompts_workspace ON prompts(workspace_id);
CREATE INDEX idx_prompts_category ON prompts(category);
CREATE INDEX idx_prompts_folder ON prompts(folder_id);
CREATE INDEX idx_prompts_created ON prompts(created_at);
CREATE INDEX idx_prompts_deleted ON prompts(deleted_at) WHERE deleted_at IS NULL;
```

### 5. Prompt Versions (프롬프트 버전 관리 - Tier 1)

```sql
CREATE TABLE prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  options JSONB DEFAULT '{}',
  score INTEGER CHECK (score >= 0 AND score <= 100),
  predicted_performance JSONB,
  token_estimate INTEGER,
  cost_estimate DECIMAL(10, 4),
  change_summary TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(prompt_id, version_number)
);

CREATE INDEX idx_prompt_versions_prompt ON prompt_versions(prompt_id);
CREATE INDEX idx_prompt_versions_score ON prompt_versions(score);
```

### 6. Prompt Tags (프롬프트 태그 - Tier 1)

```sql
CREATE TABLE prompt_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, user_id)
);

CREATE INDEX idx_prompt_tags_user ON prompt_tags(user_id);
```

### 7. Prompt Tag Relations (프롬프트-태그 관계)

```sql
CREATE TABLE prompt_tag_relations (
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES prompt_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (prompt_id, tag_id)
);

CREATE INDEX idx_prompt_tag_relations_prompt ON prompt_tag_relations(prompt_id);
CREATE INDEX idx_prompt_tag_relations_tag ON prompt_tag_relations(tag_id);
```

### 8. Folders (폴더 - Tier 1)

```sql
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  color VARCHAR(7),
  icon VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_folders_user ON folders(user_id);
CREATE INDEX idx_folders_workspace ON folders(workspace_id);
CREATE INDEX idx_folders_parent ON folders(parent_id);
```

### 9. Templates (템플릿 라이브러리 - Tier 1)

```sql
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  model VARCHAR(100),
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  is_public BOOLEAN DEFAULT FALSE,
  is_premium BOOLEAN DEFAULT FALSE,
  tier_required VARCHAR(50) DEFAULT 'free',
  author_id UUID REFERENCES users(id),
  usage_count INTEGER DEFAULT 0,
  rating DECIMAL(3, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_public ON templates(is_public);
CREATE INDEX idx_templates_premium ON templates(is_premium);
CREATE INDEX idx_templates_rating ON templates(rating);
```

### 10. AB Tests (A/B 테스트 - Tier 1)

```sql
CREATE TABLE ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  base_prompt_id UUID REFERENCES prompts(id),
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed', 'cancelled')),
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ab_tests_user ON ab_tests(user_id);
CREATE INDEX idx_ab_tests_status ON ab_tests(status);
```

### 11. AB Test Variants (A/B 테스트 변형)

```sql
CREATE TABLE ab_test_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ab_test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  variant_name VARCHAR(100),
  variant_letter VARCHAR(1) CHECK (variant_letter IN ('A', 'B', 'C', 'D')),
  predicted_score INTEGER,
  actual_score INTEGER,
  impressions INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ab_test_variants_test ON ab_test_variants(ab_test_id);
CREATE INDEX idx_ab_test_variants_prompt ON ab_test_variants(prompt_id);
```

### 12. Test Results (실시간 테스트 결과 - Tier 2)

```sql
CREATE TABLE test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  prompt_version_id UUID REFERENCES prompt_versions(id) ON DELETE SET NULL,
  model VARCHAR(100) NOT NULL,
  input_text TEXT,
  response_text TEXT,
  response_time_ms INTEGER,
  token_count INTEGER,
  cost DECIMAL(10, 6),
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  metrics JSONB DEFAULT '{}',
  error_message TEXT,
  test_type VARCHAR(50) CHECK (test_type IN ('manual', 'automated', 'benchmark')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_test_results_prompt ON test_results(prompt_id);
CREATE INDEX idx_test_results_model ON test_results(model);
CREATE INDEX idx_test_results_created ON test_results(created_at);
```

### 13. Model Optimizations (모델별 최적화 - Tier 2)

```sql
CREATE TABLE model_optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  model VARCHAR(100) NOT NULL,
  optimized_content TEXT NOT NULL,
  optimization_rules JSONB DEFAULT '{}',
  performance_improvement DECIMAL(5, 2),
  before_score INTEGER,
  after_score INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(prompt_id, model)
);

CREATE INDEX idx_model_optimizations_prompt ON model_optimizations(prompt_id);
CREATE INDEX idx_model_optimizations_model ON model_optimizations(model);
```

### 14. Multi Model Generations (멀티 모델 생성 - Tier 2)

```sql
CREATE TABLE multi_model_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  input_text TEXT NOT NULL,
  base_options JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_multi_model_generations_user ON multi_model_generations(user_id);
CREATE INDEX idx_multi_model_generations_status ON multi_model_generations(status);
```

### 15. Multi Model Results (멀티 모델 결과)

```sql
CREATE TABLE multi_model_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID NOT NULL REFERENCES multi_model_generations(id) ON DELETE CASCADE,
  model VARCHAR(100) NOT NULL,
  prompt_id UUID REFERENCES prompts(id),
  response_text TEXT,
  response_time_ms INTEGER,
  token_count INTEGER,
  cost DECIMAL(10, 6),
  quality_score INTEGER,
  comparison_rank INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_multi_model_results_generation ON multi_model_results(generation_id);
CREATE INDEX idx_multi_model_results_model ON multi_model_results(model);
```

### 16. Analytics (분석 데이터 - Tier 2)

```sql
CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analytics_user ON analytics(user_id);
CREATE INDEX idx_analytics_workspace ON analytics(workspace_id);
CREATE INDEX idx_analytics_event_type ON analytics(event_type);
CREATE INDEX idx_analytics_created ON analytics(created_at);
```

### 17. Comments (댓글 - Tier 2 협업)

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_comments_prompt ON comments(prompt_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id);
```

### 18. Prompt Shares (프롬프트 공유 - Tier 2)

```sql
CREATE TABLE prompt_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_with_workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  permission VARCHAR(50) DEFAULT 'view' CHECK (permission IN ('view', 'edit', 'comment')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_prompt_shares_prompt ON prompt_shares(prompt_id);
CREATE INDEX idx_prompt_shares_workspace ON prompt_shares(shared_with_workspace_id);
CREATE INDEX idx_prompt_shares_user ON prompt_shares(shared_with_user_id);
```

---

## Admin 기능 설계

### 1. 사용자 관리

#### 기능
- 사용자 목록 조회 (필터링: tier, status)
- 사용자 상세 정보
- Tier 변경
- 구독 상태 관리
- API 키 관리
- 사용 통계

#### UI 구성
```
┌─────────────────────────────────────┐
│ 사용자 관리                          │
├─────────────────────────────────────┤
│ [검색] [Tier 필터] [상태 필터]      │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 이메일 | Tier | 상태 | 액션    │ │
│ ├─────────────────────────────────┤ │
│ │ user@example.com | Pro | 활성 │ │
│ │   [상세] [Tier 변경] [정지]   │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 2. 워크스페이스 관리 (Tier 2)

#### 기능
- 워크스페이스 목록
- 멤버 관리
- 권한 설정
- 워크스페이스 통계

#### UI 구성
```
┌─────────────────────────────────────┐
│ 워크스페이스 관리                    │
├─────────────────────────────────────┤
│ [워크스페이스 목록]                  │
│ ┌─────────────────────────────────┐ │
│ │ 이름 | 소유자 | 멤버수 | Tier   │ │
│ ├─────────────────────────────────┤ │
│ │ Team A | user@ex.com | 5 | Pro │ │
│ │   [상세] [멤버 관리] [설정]     │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 3. 프롬프트 관리

#### 기능
- 전체 프롬프트 목록
- 카테고리별 필터링
- 사용자별 필터링
- 삭제된 프롬프트 관리
- 프롬프트 통계

#### UI 구성
```
┌─────────────────────────────────────┐
│ 프롬프트 관리                        │
├─────────────────────────────────────┤
│ [검색] [카테고리] [사용자] [날짜]  │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 제목 | 카테고리 | 사용자 | 날짜 │ │
│ ├─────────────────────────────────┤ │
│ │ Blog Post | text | user@ex.com  │ │
│ │   [상세] [버전] [삭제]          │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 4. 템플릿 관리 (Tier 1)

#### 기능
- 템플릿 목록
- 템플릿 생성/수정/삭제
- 프리미엄 템플릿 설정
- 템플릿 사용 통계
- 템플릿 승인/거부

#### UI 구성
```
┌─────────────────────────────────────┐
│ 템플릿 관리                          │
├─────────────────────────────────────┤
│ [새 템플릿] [프리미엄 필터]         │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 이름 | 카테고리 | 사용 | 평점   │ │
│ ├─────────────────────────────────┤ │
│ │ Blog Template | text | 150 | 4.5│ │
│ │   [편집] [삭제] [프리미엄 설정] │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 5. A/B 테스트 관리 (Tier 1)

#### 기능
- A/B 테스트 목록
- 테스트 상세 정보
- 결과 분석
- 테스트 승인/거부

#### UI 구성
```
┌─────────────────────────────────────┐
│ A/B 테스트 관리                      │
├─────────────────────────────────────┤
│ [테스트 목록]                        │
│ ┌─────────────────────────────────┐ │
│ │ 이름 | 상태 | 변형수 | 결과      │ │
│ ├─────────────────────────────────┤ │
│ │ Test 1 | 진행중 | 3 | A 승리    │ │
│ │   [상세] [결과 분석] [중지]     │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 6. 분석 대시보드

#### 기능
- 전체 사용 통계
- Tier별 통계
- 프롬프트 생성 추이
- 모델별 사용 통계
- 수익 분석

#### UI 구성
```
┌─────────────────────────────────────┐
│ 분석 대시보드                        │
├─────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌────────┐│
│ │ 총 사용자│ │ 프리미엄 │ │ 수익   ││
│ │  1,234  │ │   456    │ │ $12,345││
│ └─────────┘ └─────────┘ └────────┘│
│                                     │
│ [프롬프트 생성 추이 그래프]          │
│ [Tier별 분포 차트]                  │
│ [모델별 사용 통계]                  │
└─────────────────────────────────────┘
```

### 7. 시스템 설정

#### 기능
- Tier별 기능 설정
- 가격 설정
- 기능 플래그 관리
- 시스템 알림 설정

---

## API 엔드포인트

### 사용자 관리
```
GET    /api/admin/users              # 사용자 목록
GET    /api/admin/users/:id          # 사용자 상세
PATCH  /api/admin/users/:id/tier     # Tier 변경
PATCH  /api/admin/users/:id/status   # 상태 변경
GET    /api/admin/users/:id/stats    # 사용자 통계
```

### 워크스페이스 관리
```
GET    /api/admin/workspaces          # 워크스페이스 목록
GET    /api/admin/workspaces/:id     # 워크스페이스 상세
GET    /api/admin/workspaces/:id/members  # 멤버 목록
POST   /api/admin/workspaces/:id/members  # 멤버 추가
DELETE /api/admin/workspaces/:id/members/:userId  # 멤버 제거
```

### 프롬프트 관리
```
GET    /api/admin/prompts            # 프롬프트 목록
GET    /api/admin/prompts/:id        # 프롬프트 상세
GET    /api/admin/prompts/:id/versions  # 버전 목록
DELETE /api/admin/prompts/:id        # 프롬프트 삭제
GET    /api/admin/prompts/stats      # 프롬프트 통계
```

### 템플릿 관리
```
GET    /api/admin/templates          # 템플릿 목록
POST   /api/admin/templates         # 템플릿 생성
PATCH  /api/admin/templates/:id     # 템플릿 수정
DELETE /api/admin/templates/:id     # 템플릿 삭제
PATCH  /api/admin/templates/:id/premium  # 프리미엄 설정
```

### A/B 테스트 관리
```
GET    /api/admin/ab-tests           # 테스트 목록
GET    /api/admin/ab-tests/:id      # 테스트 상세
GET    /api/admin/ab-tests/:id/results  # 결과 분석
```

### 분석
```
GET    /api/admin/analytics/overview  # 전체 통계
GET    /api/admin/analytics/users     # 사용자 통계
GET    /api/admin/analytics/revenue  # 수익 분석
GET    /api/admin/analytics/trends    # 추이 분석
```

---

## 마이그레이션 계획

### Phase 1: 기본 구조 구축 (2주)
1. 데이터베이스 스키마 생성
2. 기본 Admin UI 구성
3. 사용자 관리 기능
4. 프롬프트 기본 관리

### Phase 2: Tier 1 기능 (4주)
1. 프롬프트 버전 관리
2. 폴더/태그 시스템
3. 템플릿 라이브러리
4. A/B 테스트 기본 기능

### Phase 3: Tier 2 기능 (6주)
1. 워크스페이스 시스템
2. 협업 기능 (댓글, 공유)
3. 멀티 모델 생성
4. 실시간 테스트
5. 고급 분석

### Phase 4: 최적화 및 확장 (4주)
1. 성능 최적화
2. 캐싱 전략
3. API 최적화
4. 보안 강화

---

## 보안 고려사항

### 1. 데이터 접근 제어
- Role-Based Access Control (RBAC)
- Row-Level Security (RLS)
- API 키 기반 인증

### 2. 데이터 암호화
- 민감 정보 암호화 (비밀번호, API 키)
- 전송 중 암호화 (HTTPS)
- 저장 데이터 암호화

### 3. 감사 로그
- 모든 Admin 작업 로깅
- 사용자 활동 추적
- 데이터 변경 이력

---

## 성능 최적화

### 1. 인덱싱 전략
- 자주 조회되는 컬럼 인덱싱
- 복합 인덱스 활용
- 부분 인덱스 (WHERE 조건)

### 2. 캐싱 전략
- Redis를 활용한 자주 조회되는 데이터 캐싱
- 템플릿 캐싱
- 통계 데이터 캐싱

### 3. 쿼리 최적화
- N+1 쿼리 방지
- 페이지네이션
- 배치 처리

---

## 모니터링 및 알림

### 1. 시스템 모니터링
- 데이터베이스 성능 모니터링
- API 응답 시간 추적
- 에러 로그 수집

### 2. 비즈니스 알림
- Tier 업그레이드 알림
- 구독 만료 알림
- 사용량 임계값 알림

---

**작성일**: 2025-01-XX
**버전**: 1.0.0

