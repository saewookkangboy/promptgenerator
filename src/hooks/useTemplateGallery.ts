/**
 * 템플릿 갤러리 커스텀 훅
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { templateService } from '../services/templateService'
import { Template } from '../types/template.types'
import { logger } from '../utils/logger'
import { handleTemplateError } from '../utils/errorHandler'
import { TEMPLATE_CONSTANTS, TEMPLATE_SORT_PRIORITY } from '../constants/template.constants'

interface UseTemplateGalleryOptions {
  initialCategory?: string
  initialSearch?: string
  autoLoad?: boolean
}

interface UseTemplateGalleryReturn {
  templates: Template[]
  loading: boolean
  error: string | null
  selectedCategory: string
  searchQuery: string
  setSelectedCategory: (category: string) => void
  setSearchQuery: (query: string) => void
  reload: () => Promise<void>
  clearError: () => void
}

/**
 * 템플릿 갤러리 상태 및 로직 관리 훅
 */
export function useTemplateGallery(
  options: UseTemplateGalleryOptions = {}
): UseTemplateGalleryReturn {
  const {
    initialCategory = 'all',
    initialSearch = '',
    autoLoad = true,
  } = options

  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory)
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch)

  /**
   * 템플릿 로드
   */
  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      logger.debug('[useTemplateGallery] 템플릿 로드 시작', {
        category: selectedCategory,
        search: searchQuery,
      })

      const data = await templateService.getPublic({
        page: 1,
        limit: TEMPLATE_CONSTANTS.DEFAULT_PAGE_SIZE,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: searchQuery || undefined,
      })

      // 템플릿 데이터 처리 및 플래그 추가
      const processedTemplates = (data.templates || []).map((t: any) => {
        try {
          // content가 문자열인 경우 파싱
          const content = typeof t.content === 'string' 
            ? JSON.parse(t.content) 
            : t.content

          return {
            ...t,
            content,
            isTop5: t.name?.includes(TEMPLATE_CONSTANTS.TOP5_IDENTIFIER) || false,
            isAI: t.name?.includes(TEMPLATE_CONSTANTS.AI_IDENTIFIER) || false,
          }
        } catch (parseError) {
          logger.error('[useTemplateGallery] 템플릿 파싱 오류', parseError, t)
          return null
        }
      }).filter((t: any) => t !== null) as Template[]

      logger.debug('[useTemplateGallery] 템플릿 로드 성공', {
        count: processedTemplates.length,
        total: data.pagination?.total || 0,
      })

      setTemplates(processedTemplates)
      setError(null)
    } catch (err: any) {
      logger.error('[useTemplateGallery] 템플릿 로드 실패', err)
      const errorMessage = handleTemplateError(err)
      setError(errorMessage)
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, searchQuery])

  /**
   * 에러 초기화
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * 자동 로드
   */
  useEffect(() => {
    if (autoLoad) {
      loadTemplates()
    }
  }, [loadTemplates, autoLoad])

  /**
   * 필터링 및 정렬된 템플릿 목록
   */
  const filteredTemplates = useMemo(() => {
    let filtered = [...templates]

    // 클라이언트 사이드 추가 필터링 (서버에서 이미 필터링되었지만 이중 체크)
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      )
    }

    // 정렬: Top 5 > AI 추천 > 사용 횟수
    filtered.sort((a, b) => {
      const aIsTop5 = a.isTop5 || false
      const bIsTop5 = b.isTop5 || false
      const aIsAI = a.isAI || false
      const bIsAI = b.isAI || false

      // Top 5 우선
      if (aIsTop5 && !bIsTop5) return -1
      if (!aIsTop5 && bIsTop5) return 1

      // AI 추천 다음
      if (aIsAI && !bIsAI) return -1
      if (!aIsAI && bIsAI) return 1

      // 사용 횟수 순
      return (b.usageCount || 0) - (a.usageCount || 0)
    })

    return filtered
  }, [templates, selectedCategory, searchQuery])

  return {
    templates: filteredTemplates,
    loading,
    error,
    selectedCategory,
    searchQuery,
    setSelectedCategory,
    setSearchQuery,
    reload: loadTemplates,
    clearError,
  }
}
