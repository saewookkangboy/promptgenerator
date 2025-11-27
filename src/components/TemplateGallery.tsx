import { useState, useEffect } from 'react'
import { templateAPI } from '../utils/api'
import { PromptTemplate } from '../types/prompt.types'
import './TemplateGallery.css'

interface Template {
  id: string
  name: string
  description: string
  category: string
  isPremium: boolean
  isTop5: boolean
  isAI?: boolean
  usageCount: number
  rating: number
  content: PromptTemplate
  variables: string[]
}

interface TemplateGalleryProps {
  onSelect: (template: Template) => void
  onClose?: () => void
  showCloseButton?: boolean
}

export default function TemplateGallery({ onSelect, onClose, showCloseButton = false }: TemplateGalleryProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTemplates()
  }, [])

  useEffect(() => {
    filterTemplates()
  }, [templates, selectedCategory, searchQuery])

  const loadTemplates = async () => {
    try {
      console.log('[TemplateGallery] 템플릿 로드 시작...')
      const data = await templateAPI.getPublic({
        page: 1,
        limit: 100
      })
      console.log('[TemplateGallery] 템플릿 데이터 수신:', data)
      
      if (!data || !data.templates) {
        console.warn('[TemplateGallery] 템플릿 데이터가 없습니다:', data)
        setTemplates([])
        setLoading(false)
        return
      }

      const templatesWithContent = (data.templates || []).map((t: any) => {
        try {
          return {
            ...t,
            content: typeof t.content === 'string' ? JSON.parse(t.content) : t.content,
            isTop5: t.name?.includes('[Top') || false,
            isAI: t.name?.includes('[AI 추천]') || false,
          }
        } catch (parseError) {
          console.error('[TemplateGallery] 템플릿 파싱 오류:', parseError, t)
          return null
        }
      }).filter((t: any) => t !== null)
      
      console.log('[TemplateGallery] 처리된 템플릿 수:', templatesWithContent.length)
      setTemplates(templatesWithContent)
    } catch (error: any) {
      console.error('[TemplateGallery] 템플릿 로드 실패:', error)
      console.error('[TemplateGallery] 에러 상세:', {
        message: error.message,
        stack: error.stack,
        response: error.response
      })
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }

  const filterTemplates = () => {
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
      const aIsTop5 = a.isTop5
      const bIsTop5 = b.isTop5
      const aIsAI = a.name?.includes('[AI 추천]') || false
      const bIsAI = b.name?.includes('[AI 추천]') || false
      
      // Top 5 우선
      if (aIsTop5 && !bIsTop5) return -1
      if (!aIsTop5 && bIsTop5) return 1
      
      // AI 추천 다음
      if (aIsAI && !bIsAI) return -1
      if (!aIsAI && bIsAI) return 1
      
      // 사용 횟수 순
      return (b.usageCount || 0) - (a.usageCount || 0)
    })

    setFilteredTemplates(filtered)
  }

  if (loading) {
    return (
      <div className="template-gallery-loading">
        <div className="spinner"></div>
        <p>템플릿을 불러오는 중...</p>
      </div>
    )
  }

  // 에러 상태 표시
  if (templates.length === 0 && !loading) {
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
        </div>
        <div className="template-gallery-empty" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>템플릿이 없습니다</p>
          <p style={{ fontSize: '14px', color: '#666' }}>
            템플릿을 생성하거나 데이터베이스를 확인해주세요.
          </p>
          <p style={{ fontSize: '12px', color: '#999', marginTop: '16px' }}>
            콘솔을 확인하여 자세한 오류 정보를 확인할 수 있습니다.
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
        <p style={{ fontSize: '13px', color: '#999', marginTop: '8px' }}>
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
            onClick={() => onSelect(template)}
          />
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="template-gallery-empty">
          검색 결과가 없습니다.
        </div>
      )}
    </div>
  )
}

function TemplateCard({ template, onClick }: { template: Template; onClick: () => void }) {
  const isAI = template.name?.includes('[AI 추천]') || false
  
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

