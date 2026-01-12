import { useState, useEffect, useMemo } from 'react'
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

interface TemplateGalleryProps {
  onClose?: () => void
  showCloseButton?: boolean
}

export default function TemplateGallery({ onClose, showCloseButton = false }: TemplateGalleryProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  const filteredTemplates = useMemo(() => {
    let filtered = [...templates]

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
  }, [templates, selectedCategory, searchQuery])

  const loadTemplates = async () => {
    try {
      devLog('[TemplateGallery] 템플릿 로드 시작...')
      
      const data: TemplateListResponse = await templateAPI.getPublic({
        page: DEFAULT_PAGINATION.page,
        limit: DEFAULT_PAGINATION.limit,
      })
      
      devLog('[TemplateGallery] 템플릿 데이터 수신:', data)
      devLog('[TemplateGallery] 템플릿 개수:', data?.templates?.length || 0)
      
      if (!data) {
        devError('[TemplateGallery] 데이터가 null 또는 undefined입니다')
        setTemplates([])
        setLoading(false)
        return
      }
      
      if (!data.templates) {
        devWarn('[TemplateGallery] templates 속성이 없습니다. 전체 데이터:', data)
        setTemplates([])
        setLoading(false)
        return
      }

      if (!Array.isArray(data.templates)) {
        devError('[TemplateGallery] templates가 배열이 아닙니다:', typeof data.templates, data.templates)
        setTemplates([])
        setLoading(false)
        return
      }

      const templatesWithContent: Template[] = data.templates
        .map((t: Template) => {
          try {
            const parsedContent: PromptTemplate = typeof t.content === 'string' 
              ? JSON.parse(t.content) 
              : t.content

            return {
              ...t,
              content: parsedContent,
              isTop5: isTop5Template(t.name),
              isAI: isAITemplate(t.name),
            }
          } catch (parseError) {
            devError('[TemplateGallery] 템플릿 파싱 오류:', parseError, t)
            return null
          }
        })
        .filter((t): t is Template => t !== null)
      
      devLog('[TemplateGallery] 처리된 템플릿 수:', templatesWithContent.length)
      setTemplates(templatesWithContent)
      setError(null)
    } catch (error: unknown) {
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
      
      setError(errorMessage)
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }


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
              setLoading(true)
              loadTemplates()
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
          template={selectedTemplate}
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

