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
  usageCount: number
  rating: number
  content: PromptTemplate
  variables: string[]
}

interface TemplateGalleryProps {
  onSelect: (template: Template) => void
  onClose?: () => void
}

export default function TemplateGallery({ onSelect, onClose }: TemplateGalleryProps) {
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
      const data = await templateAPI.getPublic({
        page: 1,
        limit: 100
      })
      const templatesWithContent = (data.templates || []).map((t: any) => ({
        ...t,
        content: typeof t.content === 'string' ? JSON.parse(t.content) : t.content,
        isTop5: t.name?.includes('[Top') || false,
      }))
      setTemplates(templatesWithContent)
    } catch (error) {
      console.error('템플릿 로드 실패:', error)
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

    // Top 5 우선 정렬
    filtered.sort((a, b) => {
      if (a.isTop5 && !b.isTop5) return -1
      if (!a.isTop5 && b.isTop5) return 1
      return b.usageCount - a.usageCount
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

  return (
    <div className="template-gallery">
      {onClose && (
        <button className="template-gallery-close" onClick={onClose}>
          ✕
        </button>
      )}
      <div className="template-gallery-header">
        <h2>프롬프트 템플릿 갤러리</h2>
        <p>원하는 템플릿을 선택하여 빠르게 프롬프트를 생성하세요</p>
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
  return (
    <div className="template-card" onClick={onClick}>
      <div className="template-card-header">
        <h3>{template.name}</h3>
        <div className="template-badges">
          {template.isTop5 && <span className="badge top5">Top 5</span>}
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

