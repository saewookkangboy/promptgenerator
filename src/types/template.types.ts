import { PromptTemplate } from './prompt.types'

/**
 * 템플릿 기본 인터페이스
 */
export interface Template {
  id: string
  name: string
  description?: string | null
  category: string
  isPremium: boolean
  isTop5?: boolean
  isAI?: boolean
  usageCount: number
  rating: number
  content: PromptTemplate
  variables: string[]
  tierRequired?: string
  isPublic?: boolean
  version?: number
  createdAt?: string
  updatedAt?: string
}

/**
 * 템플릿 목록 응답 인터페이스
 */
export interface TemplateListResponse {
  templates: Template[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * 템플릿 적용 요청 인터페이스
 */
export interface ApplyTemplateRequest {
  variables: Record<string, string>
}

/**
 * 템플릿 적용 응답 인터페이스
 */
export interface ApplyTemplateResponse {
  prompt: string
}

/**
 * 템플릿 사용 기록 요청 인터페이스
 */
export interface RecordUsageRequest {
  variables: Record<string, string>
}

/**
 * 템플릿 필터 옵션
 */
export interface TemplateFilterOptions {
  category?: string
  search?: string
  page?: number
  limit?: number
}

/**
 * 템플릿 정렬 옵션
 */
export type TemplateSortOption = 'usage' | 'rating' | 'created' | 'updated'
