import { useState, useEffect } from 'react'
import { templateAPI } from '../utils/api'
import { PromptTemplate } from '../types/prompt.types'
import TemplatePreviewModal from './TemplatePreviewModal'
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
  onSelect?: (template: Template) => void // 선택적 (레거시 호환성, 현재 사용하지 않음)
  onClose?: () => void
  showCloseButton?: boolean
}

export default function TemplateGallery({ onSelect: _onSelect, onClose, showCloseButton = false }: TemplateGalleryProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  useEffect(() => {
    filterTemplates()
  }, [templates, selectedCategory, searchQuery])

  const loadTemplates = async () => {
    try {
      console.log('[TemplateGallery] 템플릿 로드 시작...')
      console.log('[TemplateGallery] API_BASE_URL:', (window as any).API_BASE_URL || '확인 필요')
      
      const data = await templateAPI.getPublic({
        page: 1,
        limit: 100
      })
      
      console.log('[TemplateGallery] 템플릿 데이터 수신:', data)
      console.log('[TemplateGallery] 템플릿 배열:', data?.templates)
      console.log('[TemplateGallery] 템플릿 개수:', data?.templates?.length || 0)
      
      if (!data) {
        console.error('[TemplateGallery] 데이터가 null 또는 undefined입니다')
        setTemplates([])
        setLoading(false)
        return
      }
      
      if (!data.templates) {
        console.warn('[TemplateGallery] templates 속성이 없습니다. 전체 데이터:', data)
        setTemplates([])
        setLoading(false)
        return
      }

      if (!Array.isArray(data.templates)) {
        console.error('[TemplateGallery] templates가 배열이 아닙니다:', typeof data.templates, data.templates)
        setTemplates([])
        setLoading(false)
        return
      }

      const templatesWithContent = data.templates.map((t: any) => {
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
      setError(null)
    } catch (error: any) {
      console.error('[TemplateGallery] 템플릿 로드 실패:', error)
      console.error('[TemplateGallery] 에러 타입:', typeof error)
      console.error('[TemplateGallery] 에러 메시지:', error?.message)
      console.error('[TemplateGallery] 에러 스택:', error?.stack)
      
      // 네트워크 에러인 경우
      if (error?.message?.includes('fetch') || error?.message?.includes('network') || error?.message?.includes('서버에 연결')) {
        setError('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.')
      } else {
        setError(error?.message || '템플릿을 불러오는데 실패했습니다.')
      }
      
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

  // 에러 상태 표시 (에러가 있고 템플릿이 없을 때)
  if (error && templates.length === 0 && !loading) {
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
          <p style={{ fontSize: '16px', marginBottom: '8px', color: '#c33' }}>템플릿을 불러올 수 없습니다</p>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
            {error}
          </p>
          <button 
            onClick={() => {
              setError(null)
              setLoading(true)
              loadTemplates()
            }}
            style={{
              padding: '8px 16px',
              background: '#000',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            다시 시도
          </button>
          <p style={{ fontSize: '12px', color: '#999', marginTop: '16px' }}>
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

