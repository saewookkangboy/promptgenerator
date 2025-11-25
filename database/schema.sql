-- 프롬프트 생성기 데이터베이스 스키마
-- PostgreSQL 기반
-- Tier 1 (Basic Premium) 및 Tier 2 (Professional) 지원

-- 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- 텍스트 검색용

-- ============================================
-- 1. Users (사용자)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  tier VARCHAR(50) DEFAULT 'free' CHECK (tier IN ('free', 'basic', 'professional', 'enterprise')),
  subscription_status VARCHAR(50) DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'expired', 'trial')),
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
CREATE INDEX idx_users_subscription_status ON users(subscription_status);

-- ============================================
-- 2. Workspaces (워크스페이스 - Tier 2)
-- ============================================
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- ============================================
-- 3. Workspace Members (워크스페이스 멤버 - Tier 2)
-- ============================================
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  permissions JSONB DEFAULT '{}',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);

-- ============================================
-- 4. Folders (폴더 - Tier 1)
-- ============================================
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- ============================================
-- 5. Prompt Tags (프롬프트 태그 - Tier 1)
-- ============================================
CREATE TABLE prompt_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, user_id, workspace_id)
);

CREATE INDEX idx_prompt_tags_user ON prompt_tags(user_id);
CREATE INDEX idx_prompt_tags_workspace ON prompt_tags(workspace_id);

-- ============================================
-- 6. Prompts (프롬프트)
-- ============================================
CREATE TABLE prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  parent_version_id UUID, -- Self-reference, will be set after prompt_versions table
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
CREATE INDEX idx_prompts_favorite ON prompts(is_favorite) WHERE is_favorite = TRUE;

-- Add foreign key for parent_version_id after prompt_versions table is created
-- ALTER TABLE prompts ADD CONSTRAINT fk_prompts_parent_version 
--   FOREIGN KEY (parent_version_id) REFERENCES prompt_versions(id) ON DELETE SET NULL;

-- ============================================
-- 7. Prompt Versions (프롬프트 버전 관리 - Tier 1)
-- ============================================
CREATE TABLE prompt_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Now add the foreign key constraint
ALTER TABLE prompts ADD CONSTRAINT fk_prompts_parent_version 
  FOREIGN KEY (parent_version_id) REFERENCES prompt_versions(id) ON DELETE SET NULL;

-- ============================================
-- 8. Prompt Tag Relations (프롬프트-태그 관계)
-- ============================================
CREATE TABLE prompt_tag_relations (
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES prompt_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (prompt_id, tag_id)
);

CREATE INDEX idx_prompt_tag_relations_prompt ON prompt_tag_relations(prompt_id);
CREATE INDEX idx_prompt_tag_relations_tag ON prompt_tag_relations(tag_id);

-- ============================================
-- 9. Templates (템플릿 라이브러리 - Tier 1)
-- ============================================
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  version INTEGER DEFAULT 1,
  history JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_public ON templates(is_public);
CREATE INDEX idx_templates_premium ON templates(is_premium);
CREATE INDEX idx_templates_rating ON templates(rating);
CREATE INDEX idx_templates_tier ON templates(tier_required);

-- ============================================
-- 10. AB Tests (A/B 테스트 - Tier 1)
-- ============================================
CREATE TABLE ab_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
CREATE INDEX idx_ab_tests_workspace ON ab_tests(workspace_id);

-- ============================================
-- 11. AB Test Variants (A/B 테스트 변형)
-- ============================================
CREATE TABLE ab_test_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- ============================================
-- 12. Test Results (실시간 테스트 결과 - Tier 2)
-- ============================================
CREATE TABLE test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
CREATE INDEX idx_test_results_test_type ON test_results(test_type);

-- ============================================
-- 13. Model Optimizations (모델별 최적화 - Tier 2)
-- ============================================
CREATE TABLE model_optimizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- ============================================
-- 14. Multi Model Generations (멀티 모델 생성 - Tier 2)
-- ============================================
CREATE TABLE multi_model_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
CREATE INDEX idx_multi_model_generations_workspace ON multi_model_generations(workspace_id);

-- ============================================
-- 15. Multi Model Results (멀티 모델 결과)
-- ============================================
CREATE TABLE multi_model_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- ============================================
-- 16. Analytics (분석 데이터 - Tier 2)
-- ============================================
CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- ============================================
-- 17. Comments (댓글 - Tier 2 협업)
-- ============================================
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
CREATE INDEX idx_comments_deleted ON comments(deleted_at) WHERE deleted_at IS NULL;

-- ============================================
-- 18. Prompt Shares (프롬프트 공유 - Tier 2)
-- ============================================
CREATE TABLE prompt_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- ============================================
-- 19. Admin Audit Log (관리자 감사 로그)
-- ============================================
CREATE TABLE admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  details JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_audit_logs_admin ON admin_audit_logs(admin_user_id);
CREATE INDEX idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX idx_admin_audit_logs_created ON admin_audit_logs(created_at);

-- ============================================
-- 트리거: updated_at 자동 업데이트
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON folders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompts_updated_at BEFORE UPDATE ON prompts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ab_tests_updated_at BEFORE UPDATE ON ab_tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 뷰: 사용자 통계 (Admin용)
-- ============================================
CREATE OR REPLACE VIEW user_stats AS
SELECT 
  u.id,
  u.email,
  u.tier,
  u.subscription_status,
  COUNT(DISTINCT p.id) as prompt_count,
  COUNT(DISTINCT w.id) as workspace_count,
  COUNT(DISTINCT t.id) as template_count,
  MAX(p.created_at) as last_prompt_at
FROM users u
LEFT JOIN prompts p ON p.user_id = u.id AND p.deleted_at IS NULL
LEFT JOIN workspaces w ON w.owner_id = u.id
LEFT JOIN templates t ON t.author_id = u.id
GROUP BY u.id, u.email, u.tier, u.subscription_status;

-- ============================================
-- 뷰: 프롬프트 통계 (Admin용)
-- ============================================
CREATE OR REPLACE VIEW prompt_stats AS
SELECT 
  category,
  COUNT(*) as total_count,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(LENGTH(content)) as avg_length,
  MAX(created_at) as latest_created
FROM prompts
WHERE deleted_at IS NULL
GROUP BY category;

