import { useEffect, useMemo, useState } from 'react'
import { adminAPI } from '../utils/api'
import { showNotification } from '../utils/notifications'
import StructuredPromptCard from './StructuredPromptCard'
import { PromptTemplate } from '../types/prompt.types'
import './TemplateManager.css'

type TemplateHistoryEntry = {
  version: number
  name: string
  description?: string | null
  category: string
  model?: string | null
  updatedAt: string
  authorId?: string | null
  changeSummary?: string | null
}

type TemplatePreset = {
  id: string
  name: string
  description?: string | null
  category: string
  model?: string | null
  version: number
  isPublic: boolean
  isPremium: boolean
  tierRequired: string
  updatedAt: string
  content: PromptTemplate | null
  history: TemplateHistoryEntry[]
}

const DEFAULT_TEMPLATE: PromptTemplate = {
  title: '새 템플릿',
  description: '템플릿 설명을 입력하세요.',
  sections: [
    { key: 'objective', title: '목표', content: '콘텐츠의 핵심 목적을 명확히 설명합니다.' },
    { key: 'audience', title: '타겟', content: '대상 독자의 특성을 기술합니다.' },
    { key: 'constraints', title: '제약 조건', content: '톤, 길이, 형식 등 필수 제약 사항.' },
    { key: 'structure', title: '출력 구조', content: '제목, 본문, CTA 등 구성 요소를 나열합니다.' },
  ],
}

const tierOptions = ['FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE']
const categoryOptions = ['text', 'image', 'video', 'engineering']

interface FormState {
  name: string
  description: string
  category: string
  model: string
  isPublic: boolean
  isPremium: boolean
  tierRequired: string
  templateJson: string
  changeSummary: string
}

const emptyForm: FormState = {
  name: '',
  description: '',
  category: 'text',
  model: '',
  isPublic: false,
  isPremium: false,
  tierRequired: 'FREE',
  templateJson: JSON.stringify(DEFAULT_TEMPLATE, null, 2),
  changeSummary: '',
}

function TemplateManager() {
  const [templates, setTemplates] = useState<TemplatePreset[]>([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplatePreset | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const loadTemplates = async (page = 1) => {
    setLoading(true)
    try {
      const data = await adminAPI.getTemplates({ page, limit: 50 })
      setTemplates(data.templates || [])
      setPagination({
        page: data.pagination?.page || 1,
        totalPages: data.pagination?.totalPages || 1,
      })
    } catch (error) {
      console.error('템플릿 로드 실패:', error)
      showNotification('템플릿을 불러오는데 실패했습니다.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const resetForm = () => {
    setSelectedTemplate(null)
    setForm({
      ...emptyForm,
      templateJson: JSON.stringify(DEFAULT_TEMPLATE, null, 2),
    })
    setJsonError(null)
  }

  const handleSelectTemplate = (template: TemplatePreset) => {
    setSelectedTemplate(template)
    setForm({
      name: template.name,
      description: template.description || '',
      category: template.category,
      model: template.model || '',
      isPublic: template.isPublic,
      isPremium: template.isPremium,
      tierRequired: template.tierRequired,
      templateJson: JSON.stringify(template.content ?? DEFAULT_TEMPLATE, null, 2),
      changeSummary: '',
    })
    setJsonError(null)
  }

  const parsedTemplate = useMemo(() => {
    try {
      return JSON.parse(form.templateJson) as PromptTemplate
    } catch {
      return null
    }
  }, [form.templateJson])

  const handleInputChange = (field: keyof FormState, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setJsonError(null)
    let templateData: PromptTemplate
    try {
      templateData = JSON.parse(form.templateJson)
    } catch {
      setJsonError('템플릿 JSON 형식이 올바르지 않습니다.')
      return
    }

    const payload = {
      name: form.name,
      description: form.description,
      category: form.category,
      model: form.model || undefined,
      template: templateData,
      isPublic: form.isPublic,
      isPremium: form.isPremium,
      tierRequired: form.tierRequired,
      changeSummary: form.changeSummary || undefined,
    }

    setIsSaving(true)
    try {
      if (selectedTemplate) {
        await adminAPI.updateTemplate(selectedTemplate.id, payload)
        showNotification('템플릿이 업데이트되었습니다.', 'success')
      } else {
        await adminAPI.createTemplate(payload)
        showNotification('새 템플릿이 생성되었습니다.', 'success')
      }
      await loadTemplates(pagination.page)
      resetForm()
    } catch (error) {
      console.error('템플릿 저장 실패:', error)
      showNotification('템플릿 저장에 실패했습니다.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedTemplate) return
    if (!confirm('선택한 템플릿을 삭제하시겠습니까?')) return
    try {
      await adminAPI.deleteTemplate(selectedTemplate.id)
      showNotification('템플릿이 삭제되었습니다.', 'success')
      await loadTemplates(pagination.page)
      resetForm()
    } catch (error) {
      console.error('템플릿 삭제 실패:', error)
      showNotification('템플릿 삭제에 실패했습니다.', 'error')
    }
  }

  const handleRollback = async (version: number) => {
    if (!selectedTemplate) return
    if (!confirm(`버전 ${version}으로 롤백하시겠습니까?`)) return
    try {
      await adminAPI.rollbackTemplate(selectedTemplate.id, version)
      showNotification(`버전 ${version}으로 롤백했습니다.`, 'success')
      await loadTemplates(pagination.page)
      const refreshed = await adminAPI.getTemplate(selectedTemplate.id)
      handleSelectTemplate(refreshed)
    } catch (error) {
      console.error('롤백 실패:', error)
      showNotification('템플릿 롤백에 실패했습니다.', 'error')
    }
  }

  return (
    <div className="template-manager">
      <div className="template-manager__list">
        <div className="template-manager__list-header">
          <h3>템플릿 프리셋</h3>
          <button className="template-button" onClick={resetForm}>
            + 새 템플릿
          </button>
        </div>
        {loading ? (
          <p className="helper-text">템플릿을 불러오는 중...</p>
        ) : templates.length === 0 ? (
          <p className="helper-text">등록된 템플릿이 없습니다.</p>
        ) : (
          <table className="template-table">
            <thead>
              <tr>
                <th>이름</th>
                <th>카테고리</th>
                <th>버전</th>
                <th>공개</th>
                <th>업데이트</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr key={template.id}>
                  <td>{template.name}</td>
                  <td>
                    <span className={`category-badge category-${template.category}`}>
                      {template.category.toUpperCase()}
                    </span>
                  </td>
                  <td>v{template.version}</td>
                  <td>{template.isPublic ? '공개' : '비공개'}</td>
                  <td>{new Date(template.updatedAt).toLocaleString('ko-KR')}</td>
                  <td>
                    <button className="template-button secondary" onClick={() => handleSelectTemplate(template)}>
                      편집
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="template-manager__editor">
        <div className="template-manager__editor-header">
          <h3>{selectedTemplate ? `템플릿 편집 : ${selectedTemplate.name}` : '새 템플릿 생성'}</h3>
          {selectedTemplate && (
            <button className="template-button warn" onClick={handleDelete}>
              삭제
            </button>
          )}
        </div>

        <div className="template-form-grid">
          <div className="form-group">
            <label>이름</label>
            <input value={form.name} onChange={(e) => handleInputChange('name', e.target.value)} />
          </div>
          <div className="form-group">
            <label>카테고리</label>
            <select value={form.category} onChange={(e) => handleInputChange('category', e.target.value)}>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>모델</label>
            <input value={form.model} onChange={(e) => handleInputChange('model', e.target.value)} />
          </div>
          <div className="form-group">
            <label>티어 제한</label>
            <select value={form.tierRequired} onChange={(e) => handleInputChange('tierRequired', e.target.value)}>
              {tierOptions.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="template-form-grid">
          <div className="form-group">
            <label>설명</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
            />
          </div>
          <div className="form-group checkbox-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.isPublic}
                onChange={(e) => handleInputChange('isPublic', e.target.checked)}
              />
              공개 템플릿
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.isPremium}
                onChange={(e) => handleInputChange('isPremium', e.target.checked)}
              />
              프리미엄 전용
            </label>
          </div>
        </div>

        <div className="template-editor-columns">
          <div className="form-group">
            <label>템플릿 JSON</label>
            <textarea
              className={`template-json-textarea ${jsonError ? 'error' : ''}`}
              rows={16}
              value={form.templateJson}
              onChange={(e) => handleInputChange('templateJson', e.target.value)}
            />
            {jsonError && <p className="error-text">{jsonError}</p>}
            <p className="helper-text">프리뷰는 자동으로 갱신됩니다.</p>
          </div>

          <div className="template-preview-column">
            <label>프리뷰</label>
            {parsedTemplate ? (
              <StructuredPromptCard title={parsedTemplate.title || '템플릿 프리뷰'} template={parsedTemplate} />
            ) : (
              <div className="template-preview-placeholder">유효한 JSON을 입력하면 프리뷰가 표시됩니다.</div>
            )}

            {selectedTemplate && selectedTemplate.history.length > 0 && (
              <div className="template-history-panel">
                <h4>버전 히스토리</h4>
                <ul>
                  {selectedTemplate.history.map((entry) => (
                    <li key={entry.version}>
                      <div>
                        <strong>v{entry.version}</strong> ·{' '}
                        {new Date(entry.updatedAt).toLocaleString('ko-KR')}
                      </div>
                      {entry.changeSummary && <p className="helper-text">{entry.changeSummary}</p>}
                      <button className="template-button secondary" onClick={() => handleRollback(entry.version)}>
                        롤백
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="form-group">
          <label>변경 요약 (선택)</label>
          <input
            value={form.changeSummary}
            onChange={(e) => handleInputChange('changeSummary', e.target.value)}
            placeholder="예: CTA 개선, 톤 수정"
          />
        </div>

        <div className="template-form-actions">
          <button className="template-button secondary" onClick={resetForm} disabled={isSaving}>
            초기화
          </button>
          <button className="template-button" onClick={handleSave} disabled={isSaving || !parsedTemplate || !form.name}>
            {isSaving ? '저장 중...' : selectedTemplate ? '템플릿 업데이트' : '템플릿 생성'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default TemplateManager

