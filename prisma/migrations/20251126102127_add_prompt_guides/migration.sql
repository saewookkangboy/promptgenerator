-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'TRIAL');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "PromptCategory" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'ENGINEERING');

-- CreateEnum
CREATE TYPE "ABTestStatus" AS ENUM ('DRAFT', 'RUNNING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ABVariantLetter" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "TestType" AS ENUM ('MANUAL', 'AUTOMATED', 'BENCHMARK');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SharePermission" AS ENUM ('VIEW', 'EDIT', 'COMMENT');

-- CreateEnum
CREATE TYPE "GuideCategory" AS ENUM ('LLM', 'IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "GuideStatus" AS ENUM ('ACTIVE', 'DEPRECATED', 'DRAFT');

-- CreateEnum
CREATE TYPE "GuideSourceType" AS ENUM ('STATIC', 'SEARCH', 'MANUAL', 'API');

-- CreateEnum
CREATE TYPE "GuideSourceStatus" AS ENUM ('SUCCESS', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "GuideCollectedBy" AS ENUM ('SCRAPER', 'MANUAL', 'API');

-- CreateEnum
CREATE TYPE "GuideFeedbackType" AS ENUM ('USAGE_SUCCESS', 'USAGE_FAILURE', 'MANUAL_REVIEW', 'AUTO_EVAL');

-- CreateEnum
CREATE TYPE "GuideJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "tier" "Tier" NOT NULL DEFAULT 'FREE',
    "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "subscription_started_at" TIMESTAMP(3),
    "subscription_ends_at" TIMESTAMP(3),
    "api_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "owner_id" TEXT NOT NULL,
    "tier" "Tier" NOT NULL DEFAULT 'FREE',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" TEXT,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "user_id" TEXT,
    "workspace_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompts" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "user_id" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "category" "PromptCategory" NOT NULL,
    "model" TEXT,
    "input_text" TEXT,
    "options" JSONB NOT NULL DEFAULT '{}',
    "folder_id" TEXT,
    "is_template" BOOLEAN NOT NULL DEFAULT false,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "parent_version_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_versions" (
    "id" TEXT NOT NULL,
    "prompt_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "options" JSONB NOT NULL DEFAULT '{}',
    "score" INTEGER,
    "predicted_performance" JSONB,
    "token_estimate" INTEGER,
    "cost_estimate" DECIMAL(10,4),
    "change_summary" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_tag_relations" (
    "prompt_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "prompt_tag_relations_pkey" PRIMARY KEY ("prompt_id","tag_id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "model" TEXT,
    "content" TEXT NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "tier_required" "Tier" NOT NULL DEFAULT 'FREE',
    "author_id" TEXT,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "history" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ab_tests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "base_prompt_id" TEXT,
    "status" "ABTestStatus" NOT NULL DEFAULT 'DRAFT',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ab_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ab_test_variants" (
    "id" TEXT NOT NULL,
    "ab_test_id" TEXT NOT NULL,
    "prompt_id" TEXT NOT NULL,
    "variant_name" TEXT,
    "variant_letter" "ABVariantLetter" NOT NULL,
    "predicted_score" INTEGER,
    "actual_score" INTEGER,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ab_test_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_results" (
    "id" TEXT NOT NULL,
    "prompt_id" TEXT NOT NULL,
    "prompt_version_id" TEXT,
    "model" TEXT NOT NULL,
    "input_text" TEXT,
    "response_text" TEXT,
    "response_time_ms" INTEGER,
    "token_count" INTEGER,
    "cost" DECIMAL(10,6),
    "quality_score" INTEGER,
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "error_message" TEXT,
    "test_type" "TestType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_optimizations" (
    "id" TEXT NOT NULL,
    "prompt_id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "optimized_content" TEXT NOT NULL,
    "optimization_rules" JSONB NOT NULL DEFAULT '{}',
    "performance_improvement" DECIMAL(5,2),
    "before_score" INTEGER,
    "after_score" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_optimizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "multi_model_generations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "input_text" TEXT NOT NULL,
    "base_options" JSONB NOT NULL DEFAULT '{}',
    "status" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "multi_model_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "multi_model_results" (
    "id" TEXT NOT NULL,
    "generation_id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "prompt_id" TEXT,
    "response_text" TEXT,
    "response_time_ms" INTEGER,
    "token_count" INTEGER,
    "cost" DECIMAL(10,6),
    "quality_score" INTEGER,
    "comparison_rank" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "multi_model_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "workspace_id" TEXT,
    "event_type" TEXT NOT NULL,
    "event_data" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "prompt_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parent_comment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_shares" (
    "id" TEXT NOT NULL,
    "prompt_id" TEXT NOT NULL,
    "shared_by" TEXT NOT NULL,
    "shared_with_workspace_id" TEXT,
    "shared_with_user_id" TEXT,
    "permission" "SharePermission" NOT NULL DEFAULT 'VIEW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource_type" TEXT,
    "resource_id" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_guides" (
    "id" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "category" "GuideCategory" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "best_practices" JSONB,
    "prompt_structure" TEXT,
    "examples" JSONB,
    "parameters" JSONB,
    "tips" JSONB,
    "metadata" JSONB DEFAULT '{}',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "status" "GuideStatus" NOT NULL DEFAULT 'ACTIVE',
    "collected_by" "GuideCollectedBy" NOT NULL DEFAULT 'SCRAPER',
    "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_to_service" BOOLEAN NOT NULL DEFAULT false,
    "applied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prompt_guides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_sources" (
    "id" TEXT NOT NULL,
    "guide_id" TEXT,
    "model_name" TEXT NOT NULL,
    "query" TEXT,
    "url" TEXT NOT NULL,
    "type" "GuideSourceType" NOT NULL,
    "status" "GuideSourceStatus" NOT NULL DEFAULT 'SUCCESS',
    "metadata" JSONB DEFAULT '{}',
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guide_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_feedbacks" (
    "id" TEXT NOT NULL,
    "guide_id" TEXT NOT NULL,
    "prompt_id" TEXT,
    "user_id" TEXT,
    "feedback_type" "GuideFeedbackType" NOT NULL,
    "score" INTEGER,
    "notes" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guide_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_collection_jobs" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "status" "GuideJobStatus" NOT NULL DEFAULT 'PENDING',
    "models" JSONB DEFAULT '[]',
    "progress" JSONB DEFAULT '{}',
    "error" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guide_collection_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_api_key_key" ON "users"("api_key");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_tier_idx" ON "users"("tier");

-- CreateIndex
CREATE INDEX "users_api_key_idx" ON "users"("api_key");

-- CreateIndex
CREATE INDEX "users_subscription_status_idx" ON "users"("subscription_status");

-- CreateIndex
CREATE INDEX "workspaces_owner_id_idx" ON "workspaces"("owner_id");

-- CreateIndex
CREATE INDEX "workspaces_tier_idx" ON "workspaces"("tier");

-- CreateIndex
CREATE INDEX "workspace_members_workspace_id_idx" ON "workspace_members"("workspace_id");

-- CreateIndex
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_workspace_id_user_id_key" ON "workspace_members"("workspace_id", "user_id");

-- CreateIndex
CREATE INDEX "folders_user_id_idx" ON "folders"("user_id");

-- CreateIndex
CREATE INDEX "folders_workspace_id_idx" ON "folders"("workspace_id");

-- CreateIndex
CREATE INDEX "folders_parent_id_idx" ON "folders"("parent_id");

-- CreateIndex
CREATE INDEX "prompt_tags_user_id_idx" ON "prompt_tags"("user_id");

-- CreateIndex
CREATE INDEX "prompt_tags_workspace_id_idx" ON "prompt_tags"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_tags_name_user_id_workspace_id_key" ON "prompt_tags"("name", "user_id", "workspace_id");

-- CreateIndex
CREATE INDEX "prompts_user_id_idx" ON "prompts"("user_id");

-- CreateIndex
CREATE INDEX "prompts_workspace_id_idx" ON "prompts"("workspace_id");

-- CreateIndex
CREATE INDEX "prompts_category_idx" ON "prompts"("category");

-- CreateIndex
CREATE INDEX "prompts_folder_id_idx" ON "prompts"("folder_id");

-- CreateIndex
CREATE INDEX "prompts_created_at_idx" ON "prompts"("created_at");

-- CreateIndex
CREATE INDEX "prompts_deleted_at_idx" ON "prompts"("deleted_at");

-- CreateIndex
CREATE INDEX "prompts_is_favorite_idx" ON "prompts"("is_favorite");

-- CreateIndex
CREATE INDEX "prompt_versions_prompt_id_idx" ON "prompt_versions"("prompt_id");

-- CreateIndex
CREATE INDEX "prompt_versions_score_idx" ON "prompt_versions"("score");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_versions_prompt_id_version_number_key" ON "prompt_versions"("prompt_id", "version_number");

-- CreateIndex
CREATE INDEX "prompt_tag_relations_prompt_id_idx" ON "prompt_tag_relations"("prompt_id");

-- CreateIndex
CREATE INDEX "prompt_tag_relations_tag_id_idx" ON "prompt_tag_relations"("tag_id");

-- CreateIndex
CREATE INDEX "templates_category_idx" ON "templates"("category");

-- CreateIndex
CREATE INDEX "templates_is_public_idx" ON "templates"("is_public");

-- CreateIndex
CREATE INDEX "templates_is_premium_idx" ON "templates"("is_premium");

-- CreateIndex
CREATE INDEX "templates_rating_idx" ON "templates"("rating");

-- CreateIndex
CREATE INDEX "templates_tier_required_idx" ON "templates"("tier_required");

-- CreateIndex
CREATE INDEX "ab_tests_user_id_idx" ON "ab_tests"("user_id");

-- CreateIndex
CREATE INDEX "ab_tests_status_idx" ON "ab_tests"("status");

-- CreateIndex
CREATE INDEX "ab_tests_workspace_id_idx" ON "ab_tests"("workspace_id");

-- CreateIndex
CREATE INDEX "ab_test_variants_ab_test_id_idx" ON "ab_test_variants"("ab_test_id");

-- CreateIndex
CREATE INDEX "ab_test_variants_prompt_id_idx" ON "ab_test_variants"("prompt_id");

-- CreateIndex
CREATE INDEX "test_results_prompt_id_idx" ON "test_results"("prompt_id");

-- CreateIndex
CREATE INDEX "test_results_model_idx" ON "test_results"("model");

-- CreateIndex
CREATE INDEX "test_results_created_at_idx" ON "test_results"("created_at");

-- CreateIndex
CREATE INDEX "test_results_test_type_idx" ON "test_results"("test_type");

-- CreateIndex
CREATE INDEX "model_optimizations_prompt_id_idx" ON "model_optimizations"("prompt_id");

-- CreateIndex
CREATE INDEX "model_optimizations_model_idx" ON "model_optimizations"("model");

-- CreateIndex
CREATE UNIQUE INDEX "model_optimizations_prompt_id_model_key" ON "model_optimizations"("prompt_id", "model");

-- CreateIndex
CREATE INDEX "multi_model_generations_user_id_idx" ON "multi_model_generations"("user_id");

-- CreateIndex
CREATE INDEX "multi_model_generations_status_idx" ON "multi_model_generations"("status");

-- CreateIndex
CREATE INDEX "multi_model_generations_workspace_id_idx" ON "multi_model_generations"("workspace_id");

-- CreateIndex
CREATE INDEX "multi_model_results_generation_id_idx" ON "multi_model_results"("generation_id");

-- CreateIndex
CREATE INDEX "multi_model_results_model_idx" ON "multi_model_results"("model");

-- CreateIndex
CREATE INDEX "analytics_user_id_idx" ON "analytics"("user_id");

-- CreateIndex
CREATE INDEX "analytics_workspace_id_idx" ON "analytics"("workspace_id");

-- CreateIndex
CREATE INDEX "analytics_event_type_idx" ON "analytics"("event_type");

-- CreateIndex
CREATE INDEX "analytics_created_at_idx" ON "analytics"("created_at");

-- CreateIndex
CREATE INDEX "comments_prompt_id_idx" ON "comments"("prompt_id");

-- CreateIndex
CREATE INDEX "comments_user_id_idx" ON "comments"("user_id");

-- CreateIndex
CREATE INDEX "comments_parent_comment_id_idx" ON "comments"("parent_comment_id");

-- CreateIndex
CREATE INDEX "comments_deleted_at_idx" ON "comments"("deleted_at");

-- CreateIndex
CREATE INDEX "prompt_shares_prompt_id_idx" ON "prompt_shares"("prompt_id");

-- CreateIndex
CREATE INDEX "prompt_shares_shared_with_workspace_id_idx" ON "prompt_shares"("shared_with_workspace_id");

-- CreateIndex
CREATE INDEX "prompt_shares_shared_with_user_id_idx" ON "prompt_shares"("shared_with_user_id");

-- CreateIndex
CREATE INDEX "admin_audit_logs_admin_user_id_idx" ON "admin_audit_logs"("admin_user_id");

-- CreateIndex
CREATE INDEX "admin_audit_logs_action_idx" ON "admin_audit_logs"("action");

-- CreateIndex
CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "prompt_guides_model_name_idx" ON "prompt_guides"("model_name");

-- CreateIndex
CREATE INDEX "prompt_guides_status_idx" ON "prompt_guides"("status");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_guides_model_name_version_key" ON "prompt_guides"("model_name", "version");

-- CreateIndex
CREATE INDEX "guide_sources_guide_id_idx" ON "guide_sources"("guide_id");

-- CreateIndex
CREATE INDEX "guide_sources_model_name_idx" ON "guide_sources"("model_name");

-- CreateIndex
CREATE INDEX "guide_feedbacks_guide_id_idx" ON "guide_feedbacks"("guide_id");

-- CreateIndex
CREATE INDEX "guide_feedbacks_prompt_id_idx" ON "guide_feedbacks"("prompt_id");

-- CreateIndex
CREATE INDEX "guide_feedbacks_user_id_idx" ON "guide_feedbacks"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "guide_collection_jobs_job_id_key" ON "guide_collection_jobs"("job_id");

-- CreateIndex
CREATE INDEX "guide_collection_jobs_status_idx" ON "guide_collection_jobs"("status");

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_tags" ADD CONSTRAINT "prompt_tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_tags" ADD CONSTRAINT "prompt_tags_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_parent_version_id_fkey" FOREIGN KEY ("parent_version_id") REFERENCES "prompt_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_versions" ADD CONSTRAINT "prompt_versions_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_versions" ADD CONSTRAINT "prompt_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_tag_relations" ADD CONSTRAINT "prompt_tag_relations_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_tag_relations" ADD CONSTRAINT "prompt_tag_relations_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "prompt_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ab_tests" ADD CONSTRAINT "ab_tests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ab_tests" ADD CONSTRAINT "ab_tests_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ab_tests" ADD CONSTRAINT "ab_tests_base_prompt_id_fkey" FOREIGN KEY ("base_prompt_id") REFERENCES "prompts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ab_test_variants" ADD CONSTRAINT "ab_test_variants_ab_test_id_fkey" FOREIGN KEY ("ab_test_id") REFERENCES "ab_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ab_test_variants" ADD CONSTRAINT "ab_test_variants_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_prompt_version_id_fkey" FOREIGN KEY ("prompt_version_id") REFERENCES "prompt_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_optimizations" ADD CONSTRAINT "model_optimizations_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "multi_model_generations" ADD CONSTRAINT "multi_model_generations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "multi_model_generations" ADD CONSTRAINT "multi_model_generations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "multi_model_results" ADD CONSTRAINT "multi_model_results_generation_id_fkey" FOREIGN KEY ("generation_id") REFERENCES "multi_model_generations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "multi_model_results" ADD CONSTRAINT "multi_model_results_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "prompts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_shares" ADD CONSTRAINT "prompt_shares_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_shares" ADD CONSTRAINT "prompt_shares_shared_by_fkey" FOREIGN KEY ("shared_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_shares" ADD CONSTRAINT "prompt_shares_shared_with_workspace_id_fkey" FOREIGN KEY ("shared_with_workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_shares" ADD CONSTRAINT "prompt_shares_shared_with_user_id_fkey" FOREIGN KEY ("shared_with_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_sources" ADD CONSTRAINT "guide_sources_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "prompt_guides"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_feedbacks" ADD CONSTRAINT "guide_feedbacks_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "prompt_guides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_feedbacks" ADD CONSTRAINT "guide_feedbacks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_feedbacks" ADD CONSTRAINT "guide_feedbacks_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "prompts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
