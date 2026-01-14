import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { templateAPI } from '../utils/api'
import { PromptTemplate } from '../types/prompt.types'
import { Template, TemplateListResponse } from '../types/template.types'
import TemplatePreviewModal from './TemplatePreviewModal'
import './TemplateGallery.css'

// 상수 정의
const TEMPLATE_PREFIXES = {
  AI_RECOMMENDED: '[AI 추천]',
  TOP_5: '[Top',
} as const

const DEFAULT_PAGINATION = {
  page: 1,
  limit: 100,
} as const

// 캐시 및 업데이트 상수
const CACHE_KEY = 'template_gallery_cache'
const CACHE_EXPIRY_MS = 30 * 60 * 1000 // 30분 (캐시 시간 증가)
const STALE_CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24시간 (만료된 캐시도 최대 24시간까지 사용)
const AUTO_REFRESH_INTERVAL_MS = 10 * 60 * 1000 // 10분마다 자동 새로고침
const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY_MS = 1000 // 초기 재시도 지연
const SEARCH_DEBOUNCE_MS = 300 // 검색 디바운스

// 유틸리티 함수
const isAITemplate = (name: string | undefined): boolean => 
  (name?.includes(TEMPLATE_PREFIXES.AI_RECOMMENDED) ?? false)

const isTop5Template = (name: string | undefined): boolean =>
  (name?.includes(TEMPLATE_PREFIXES.TOP_5) ?? false)

// 개발 모드 체크
const isDev = import.meta.env.DEV

// 개발 모드에서만 로깅
const devLog = (...args: unknown[]) => {
  if (isDev) {
    console.log(...args)
  }
}

const devError = (...args: unknown[]) => {
  if (isDev) {
    console.error(...args)
  }
}

const devWarn = (...args: unknown[]) => {
  if (isDev) {
    console.warn(...args)
  }
}

// 캐시 유틸리티
interface CacheData {
  templates: Template[]
  timestamp: number
}

const getCachedTemplates = (): Template[] | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null
    
    const data: CacheData = JSON.parse(cached)
    const now = Date.now()
    const cacheAge = now - data.timestamp
    
    // 캐시가 완전히 만료되지 않았으면 반환 (최대 24시간까지)
    if (cacheAge < STALE_CACHE_EXPIRY_MS) {
      if (cacheAge < CACHE_EXPIRY_MS) {
        devLog('[TemplateGallery] 신선한 캐시에서 템플릿 로드:', data.templates.length)
      } else {
        devLog('[TemplateGallery] 만료된 캐시에서 템플릿 로드 (백그라운드 업데이트 예정):', data.templates.length)
      }
      return data.templates
    }
    
    // 완전히 오래된 캐시 삭제
    localStorage.removeItem(CACHE_KEY)
    return null
  } catch (error) {
    devError('[TemplateGallery] 캐시 읽기 실패:', error)
    return null
  }
}

// 캐시가 오래되었는지 확인 (백그라운드 업데이트 필요 여부)
const isCacheStale = (): boolean => {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return true
    
    const data: CacheData = JSON.parse(cached)
    const now = Date.now()
    const cacheAge = now - data.timestamp
    
    return cacheAge >= CACHE_EXPIRY_MS
  } catch {
    return true
  }
}

const setCachedTemplates = (templates: Template[]): void => {
  try {
    const data: CacheData = {
      templates,
      timestamp: Date.now(),
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
    devLog('[TemplateGallery] 템플릿 캐시 저장:', templates.length)
  } catch (error) {
    devError('[TemplateGallery] 캐시 저장 실패:', error)
  }
}

// 재시도 로직 (exponential backoff)
const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms))

const retryWithBackoff = async <T,>(
  fn: () => Promise<T>,
  maxAttempts: number = MAX_RETRY_ATTEMPTS,
  delay: number = RETRY_DELAY_MS
): Promise<T> => {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // 마지막 시도가 아니면 재시도
      if (attempt < maxAttempts) {
        const backoffDelay = delay * Math.pow(2, attempt - 1)
        devWarn(`[TemplateGallery] 재시도 ${attempt}/${maxAttempts} (${backoffDelay}ms 후)`)
        await sleep(backoffDelay)
      }
    }
  }
  
  throw lastError || new Error('알 수 없는 오류')
}


interface TemplateGalleryProps {
  onClose?: () => void
  showCloseButton?: boolean
}

export default function TemplateGallery({ onClose, showCloseButton = false }: TemplateGalleryProps) {
  // 캐시에서 즉시 로드하여 초기 상태 설정
  const initialCachedTemplates = getCachedTemplates()
  const [templates, setTemplates] = useState<Template[]>(initialCachedTemplates || [])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  // 캐시가 있으면 loading을 false로 시작 (즉시 표시)
  const [loading, setLoading] = useState(!initialCachedTemplates || initialCachedTemplates.length === 0)
  const [error, setError] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  
  // AbortController와 인터벌을 위한 ref
  const abortControllerRef = useRef<AbortController | null>(null)
  const refreshIntervalRef = useRef<number | null>(null)
  const isMountedRef = useRef(true)

  // 검색 쿼리 디바운싱
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const filteredTemplates = useMemo(() => {
    let filtered = [...templates]

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory)
    }

    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      )
    }

    // 정렬: Top 5 > AI 추천 > 사용 횟수
    filtered.sort((a, b) => {
      const aIsTop5 = a.isTop5 ?? false
      const bIsTop5 = b.isTop5 ?? false
      const aIsAI = a.isAI ?? isAITemplate(a.name)
      const bIsAI = b.isAI ?? isAITemplate(b.name)
      
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
  }, [templates, selectedCategory, debouncedSearchQuery])

  const loadTemplates = useCallback(async (background: boolean = false) => {
    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // 새로운 AbortController 생성
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      if (!background) {
        devLog('[TemplateGallery] 템플릿 로드 시작...')
        setLoading(true)
        setError(null)
      }
      
      // 재시도 로직과 함께 API 호출
      const data: TemplateListResponse = await retryWithBackoff(async () => {
        return await templateAPI.getPublic({
          page: DEFAULT_PAGINATION.page,
          limit: DEFAULT_PAGINATION.limit,
        })
      })
      
      // 요청이 취소되었으면 중단
      if (abortController.signal.aborted || !isMountedRef.current) {
        return
      }
      
      devLog('[TemplateGallery] 템플릿 데이터 수신:', data)
      devLog('[TemplateGallery] 템플릿 개수:', data?.templates?.length || 0)
      
      if (!data) {
        devError('[TemplateGallery] 데이터가 null 또는 undefined입니다')
        if (!background) {
          setTemplates([])
          setLoading(false)
        }
        return
      }
      
      if (!data.templates) {
        devWarn('[TemplateGallery] templates 속성이 없습니다. 전체 데이터:', data)
        if (!background) {
          setTemplates([])
          setLoading(false)
        }
        return
      }

      if (!Array.isArray(data.templates)) {
        devError('[TemplateGallery] templates가 배열이 아닙니다:', typeof data.templates, data.templates)
        if (!background) {
          setTemplates([])
          setLoading(false)
        }
        return
      }

      const templatesWithContent = data.templates
        .map((t: Template) => {
          try {
            const parsedContent: PromptTemplate = typeof t.content === 'string' 
              ? JSON.parse(t.content) 
              : t.content

            return {
              ...t,
              content: parsedContent,
              isTop5: isTop5Template(t.name) ?? false,
              isAI: isAITemplate(t.name) ?? false,
            } as Template
          } catch (parseError) {
            devError('[TemplateGallery] 템플릿 파싱 오류:', parseError, t)
            return null
          }
        })
        .filter((t): t is Template => t !== null) as Template[]
      
      // 요청이 취소되었으면 중단
      if (abortController.signal.aborted || !isMountedRef.current) {
        return
      }

      devLog('[TemplateGallery] 처리된 템플릿 수:', templatesWithContent.length)
      setTemplates(templatesWithContent)
      setCachedTemplates(templatesWithContent) // 캐시 저장
      setError(null)
    } catch (error: unknown) {
      // 요청이 취소되었으면 에러 처리 안 함
      if (abortController.signal.aborted || !isMountedRef.current) {
        return
      }

      devError('[TemplateGallery] 템플릿 로드 실패:', error)
      
      // 에러 타입별 처리
      let errorMessage = '템플릿을 불러오는데 실패했습니다.'
      
      if (error instanceof Error) {
        devError('[TemplateGallery] 에러 메시지:', error.message)
        devError('[TemplateGallery] 에러 스택:', error.stack)
        
        // 네트워크 에러인 경우
        const message = error.message.toLowerCase()
        if (message.includes('fetch') || message.includes('network') || message.includes('서버에 연결')) {
          errorMessage = '서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.'
        } else {
          errorMessage = error.message || errorMessage
        }
      }
      
      // 백그라운드 업데이트 실패 시 에러 표시 안 함
      if (!background) {
        setError(errorMessage)
        setTemplates([])
      }
    } finally {
      if (abortController.signal.aborted || !isMountedRef.current) {
        return
      }

      if (!background) {
        setLoading(false)
      }
    }
  }, [])

  // 초기 로드: 캐시가 있으면 즉시 표시, 없거나 오래되었으면 로드
  useEffect(() => {
    isMountedRef.current = true
    
    // 캐시가 있고 신선하면 백그라운드에서만 업데이트
    // 캐시가 없거나 오래되었으면 즉시 로드
    const needsImmediateLoad = !initialCachedTemplates || initialCachedTemplates.length === 0 || isCacheStale()
    
    if (needsImmediateLoad) {
      // 캐시가 없거나 오래되었으면 즉시 로드
      loadTemplates(false)
    } else {
      // 캐시가 신선하면 백그라운드에서만 업데이트 (사용자 경험 방해 안 함)
      loadTemplates(true)
    }

    return () => {
      isMountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 정기적인 자동 새로고침
  useEffect(() => {
    // 페이지가 포커스를 받을 때만 새로고침
    const handleFocus = () => {
      const cachedTemplates = getCachedTemplates()
      if (cachedTemplates) {
        const cacheData = localStorage.getItem(CACHE_KEY)
        if (cacheData) {
          try {
            const parsed = JSON.parse(cacheData) as CacheData
            const cacheAge = Date.now() - parsed.timestamp
            // 캐시가 5분 이상 오래되었으면 새로고침
            if (cacheAge > CACHE_EXPIRY_MS) {
              devLog('[TemplateGallery] 포커스 시 오래된 캐시 새로고침')
              loadTemplates(true)
            }
          } catch (e) {
            // 캐시 파싱 실패 시 무시
          }
        }
      }
    }

    // 인터벌 기반 자동 새로고침 (백그라운드에서 조용히)
    refreshIntervalRef.current = window.setInterval(() => {
      if (document.hasFocus()) {
        devLog('[TemplateGallery] 정기 자동 새로고침')
        loadTemplates(true)
      }
    }, AUTO_REFRESH_INTERVAL_MS)

    window.addEventListener('focus', handleFocus)

    return () => {
      if (refreshIntervalRef.current !== null) {
        clearInterval(refreshIntervalRef.current)
      }
      window.removeEventListener('focus', handleFocus)
    }
  }, [loadTemplates])


  if (loading) {
    return (
      <div className="template-gallery-loading">
        <div className="spinner"></div>
        <p>템플릿을 불러오는 중...</p>
      </div>
    )
  }

  // 에러 상태 표시 (에러가 있고 템플릿이 없을 때)
  if (error && templates.length === 0 && !loading) {
    return (
      <div className="template-gallery">
        {showCloseButton && onClose && (
          <button 
            className="template-gallery-close" 
            onClick={onClose}
            aria-label="갤러리 닫기"
          >
            ✕
          </button>
        )}
        <div className="template-gallery-header">
          <h2>프롬프트 템플릿 갤러리</h2>
          <p>원하는 템플릿을 선택하여 빠르게 프롬프트를 생성하세요</p>
        </div>
        <div className="template-gallery-error">
          <p className="template-gallery-error-title">템플릿을 불러올 수 없습니다</p>
          <p className="template-gallery-error-message">
            {error}
          </p>
          <button 
            className="template-gallery-error-button"
            onClick={() => {
              setError(null)
              loadTemplates(false)
            }}
          >
            다시 시도
          </button>
          <p className="template-gallery-error-hint">
            브라우저 콘솔(F12)에서 자세한 로그를 확인할 수 있습니다.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="template-gallery">
      {showCloseButton && onClose && (
        <button className="template-gallery-close" onClick={onClose}>
          ✕
        </button>
      )}
      <div className="template-gallery-header">
        <h2>프롬프트 템플릿 갤러리</h2>
        <p>원하는 템플릿을 선택하여 빠르게 프롬프트를 생성하세요</p>
        <p className="template-gallery-header-hint">
          💡 AI가 자동으로 추천하는 템플릿과 수동으로 등록된 템플릿을 모두 확인할 수 있습니다
        </p>
      </div>

      <div className="template-gallery-filters">
        <div className="category-filters">
          <button
            className={selectedCategory === 'all' ? 'active' : ''}
            onClick={() => setSelectedCategory('all')}
          >
            전체
          </button>
          <button
            className={selectedCategory === 'text' ? 'active' : ''}
            onClick={() => setSelectedCategory('text')}
          >
            텍스트
          </button>
          <button
            className={selectedCategory === 'image' ? 'active' : ''}
            onClick={() => setSelectedCategory('image')}
          >
            이미지
          </button>
          <button
            className={selectedCategory === 'video' ? 'active' : ''}
            onClick={() => setSelectedCategory('video')}
          >
            비디오
          </button>
          <button
            className={selectedCategory === 'engineering' ? 'active' : ''}
            onClick={() => setSelectedCategory('engineering')}
          >
            엔지니어링
          </button>
        </div>

        <div className="search-box">
          <input
            type="text"
            placeholder="템플릿 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="template-grid">
        {filteredTemplates.map(template => (
          <TemplateCard
            key={template.id}
            template={template}
            onClick={() => setSelectedTemplate(template)}
          />
        ))}
      </div>

      {selectedTemplate && (
        <TemplatePreviewModal
          template={{
            id: selectedTemplate.id,
            name: selectedTemplate.name,
            description: selectedTemplate.description ?? undefined,
            content: selectedTemplate.content,
            variables: selectedTemplate.variables,
          }}
          onClose={() => setSelectedTemplate(null)}
        />
      )}

      {filteredTemplates.length === 0 && (
        <div className="template-gallery-empty">
          검색 결과가 없습니다.
        </div>
      )}
    </div>
  )
}

function TemplateCard({ template, onClick }: { template: Template; onClick: () => void }) {
  const isAI = template.isAI ?? isAITemplate(template.name)
  
  return (
    <div className="template-card" onClick={onClick}>
      <div className="template-card-header">
        <h3>{template.name}</h3>
        <div className="template-badges">
          {template.isTop5 && <span className="badge top5">Top 5</span>}
          {isAI && <span className="badge ai">🤖 AI 추천</span>}
          {template.isPremium && <span className="badge premium">프리미엄</span>}
        </div>
      </div>
      <p className="template-description">{template.description}</p>
      <div className="template-meta">
        <span className="template-category">{template.category.toUpperCase()}</span>
        <span className="template-usage">사용 {template.usageCount || 0}회</span>
        {template.rating > 0 && (
          <span className="template-rating">⭐ {template.rating.toFixed(1)}</span>
        )}
      </div>
      {template.variables && template.variables.length > 0 && (
        <div className="template-variables-preview">
          변수: {template.variables.slice(0, 3).join(', ')}
          {template.variables.length > 3 && ` +${template.variables.length - 3}`}
        </div>
      )}
    </div>
  )
}

