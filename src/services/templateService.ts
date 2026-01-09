/**
 * 템플릿 관련 API 서비스
 */
import { apiRequest } from '../utils/api'
import { 
  Template, 
  TemplateListResponse, 
  ApplyTemplateResponse,
  RecordUsageRequest,
  TemplateFilterOptions 
} from '../types/template.types'
import { logger } from '../utils/logger'
import { handleTemplateError, createErrorFromStatusCode } from '../utils/errorHandler'
import { TEMPLATE_CONSTANTS } from '../constants/template.constants'

/**
 * 쿼리 파라미터 빌더
 */
function buildQueryString(params?: TemplateFilterOptions): string {
  if (!params) return ''
  
  const queryParams = new URLSearchParams()
  
  if (params.page) {
    queryParams.append('page', params.page.toString())
  }
  if (params.limit) {
    queryParams.append('limit', params.limit.toString())
  }
  if (params.category && params.category !== 'all') {
    queryParams.append('category', params.category)
  }
  if (params.search) {
    queryParams.append('search', params.search)
  }
  
  const queryString = queryParams.toString()
  return queryString ? `?${queryString}` : ''
}

/**
 * 템플릿 서비스
 */
export const templateService = {
  /**
   * 공개 템플릿 목록 조회
   */
  async getPublic(params?: TemplateFilterOptions): Promise<TemplateListResponse> {
    try {
      logger.debug('[TemplateService] 공개 템플릿 조회 요청', params)
      
      const queryString = buildQueryString({
        ...params,
        limit: params?.limit || TEMPLATE_CONSTANTS.DEFAULT_PAGE_SIZE,
      })
      
      const url = `/api/templates/public${queryString}`
      const result = await apiRequest<TemplateListResponse>(url)
      
      logger.debug('[TemplateService] 공개 템플릿 조회 성공', {
        count: result.templates?.length || 0,
        total: result.pagination?.total || 0,
      })
      
      return result
    } catch (error: any) {
      logger.error('[TemplateService] 공개 템플릿 조회 실패', error)
      throw createErrorFromStatusCode(
        error?.status || 500,
        handleTemplateError(error)
      )
    }
  },

  /**
   * 템플릿 상세 조회
   */
  async getById(id: string): Promise<Template> {
    try {
      logger.debug('[TemplateService] 템플릿 상세 조회', { id })
      
      const result = await apiRequest<Template>(`/api/templates/${id}`)
      
      logger.debug('[TemplateService] 템플릿 상세 조회 성공', { id })
      
      return result
    } catch (error: any) {
      logger.error('[TemplateService] 템플릿 상세 조회 실패', error)
      throw createErrorFromStatusCode(
        error?.status || 500,
        handleTemplateError(error)
      )
    }
  },

  /**
   * 템플릿 적용 (변수 치환)
   */
  async apply(id: string, variables: Record<string, string>): Promise<ApplyTemplateResponse> {
    try {
      logger.debug('[TemplateService] 템플릿 적용 요청', { id, variableCount: Object.keys(variables).length })
      
      // 공개 템플릿은 인증 없이 사용 가능
      const normalizedEndpoint = `/api/templates/${id}/apply`
      const url = `${import.meta.env.VITE_API_BASE_URL || window.location.origin}${normalizedEndpoint}`
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      
      // 토큰이 있으면 추가 (프리미엄 템플릿용)
      const token = localStorage.getItem('auth_token')
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ variables }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: '알 수 없는 오류가 발생했습니다' 
        }))
        
        throw createErrorFromStatusCode(
          response.status,
          errorData.error || `HTTP ${response.status}`
        )
      }

      const result = await response.json()
      logger.debug('[TemplateService] 템플릿 적용 성공', { id, promptLength: result.prompt?.length || 0 })
      
      return result
    } catch (error: any) {
      logger.error('[TemplateService] 템플릿 적용 실패', error)
      
      // 네트워크 오류 처리
      if (error.name === 'TypeError' && 
          (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
        throw createErrorFromStatusCode(503, '서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.')
      }
      
      throw error instanceof Error ? error : createErrorFromStatusCode(500, handleTemplateError(error))
    }
  },

  /**
   * 템플릿 사용 기록
   */
  async recordUsage(id: string, data: RecordUsageRequest): Promise<void> {
    try {
      logger.debug('[TemplateService] 템플릿 사용 기록', { id })
      
      await apiRequest<void>('/api/analytics/template-used', {
        method: 'POST',
        body: JSON.stringify({
          templateId: id,
          ...data,
        }),
      })
      
      logger.debug('[TemplateService] 템플릿 사용 기록 성공', { id })
    } catch (error: any) {
      // 사용 기록 실패는 치명적이지 않으므로 경고만
      logger.warn('[TemplateService] 템플릿 사용 기록 실패', error)
      // 에러를 throw하지 않음 (사용자 경험에 영향 없도록)
    }
  },
}
