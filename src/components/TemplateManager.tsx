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
const modelOptions = [
  'openai-gpt-4',
  'openai-gpt-3.5',
  'claude-3',
  'claude-3.5',
  'gemini-pro',
  'gemini-ultra',
  'gemini-nano-banana-pro',
  'midjourney',
  'dalle-3',
  'stable-diffusion',
  'sora',
  'veo-3',
  'llama-3',
  'llama-3.1',
]

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

interface VariableValue {
  key: string
  value: string
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

// 템플릿에서 변수 추출 ({{variable}} 형태)
function extractVariables(template: PromptTemplate): string[] {
  const variables = new Set<string>()
  const regex = /\{\{(\w+)\}\}/g
  
  const checkText = (text: string) => {
    let match
    while ((match = regex.exec(text)) !== null) {
      variables.add(match[1])
    }
  }
  
  if (template.title) checkText(template.title)
  if (template.description) checkText(template.description)
  template.sections.forEach(section => {
    if (section.content) checkText(section.content)
    if (section.helperText) checkText(section.helperText)
  })
  
  return Array.from(variables)
}

// 변수를 실제 값으로 치환
function replaceVariables(template: PromptTemplate, variables: Record<string, string>): PromptTemplate {
  const replace = (text: string): string => {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match
    })
  }
  
  return {
    title: replace(template.title),
    description: template.description ? replace(template.description) : undefined,
    sections: template.sections.map(section => ({
      ...section,
      content: replace(section.content),
      helperText: section.helperText ? replace(section.helperText) : undefined,
    })),
  }
}

function TemplateManager() {
  const [templates, setTemplates] = useState<TemplatePreset[]>([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplatePreset | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'simulate'>('edit')
  const [variableValues, setVariableValues] = useState<VariableValue[]>([])
  const [simulatedTemplate, setSimulatedTemplate] = useState<PromptTemplate | null>(null)

  const loadTemplates = async (page = 1) => {
    setLoading(true)
    setLoadError(null)
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
      setLoadError('템플릿 목록을 불러올 수 없습니다. 네트워크/인증을 확인하고 다시 시도하세요.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const parsedTemplate = useMemo(() => {
    try {
      return JSON.parse(form.templateJson) as PromptTemplate
    } catch {
      return null
    }
  }, [form.templateJson])

  // 변수 추출 및 변수 값 초기화
  useEffect(() => {
    if (parsedTemplate) {
      const variables = extractVariables(parsedTemplate)
      setVariableValues(
        variables.map(key => ({
          key,
          value: variableValues.find(v => v.key === key)?.value || '',
        }))
      )
    }
  }, [parsedTemplate])

  // 시뮬레이션 템플릿 업데이트
  useEffect(() => {
    if (parsedTemplate && variableValues.length > 0) {
      const variablesMap = variableValues.reduce((acc, v) => {
        acc[v.key] = v.value
        return acc
      }, {} as Record<string, string>)
      
      const simulated = replaceVariables(parsedTemplate, variablesMap)
      setSimulatedTemplate(simulated)
    } else {
      setSimulatedTemplate(parsedTemplate)
    }
  }, [parsedTemplate, variableValues])

  const resetForm = () => {
    setSelectedTemplate(null)
    setForm({
      ...emptyForm,
      name: `새 템플릿 ${new Date().toLocaleTimeString('ko-KR')}`,
      templateJson: JSON.stringify(DEFAULT_TEMPLATE, null, 2),
    })
    setJsonError(null)
    setVariableValues([])
    setSimulatedTemplate(null)
    setActiveTab('edit')
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
    setActiveTab('edit')
  }

  const handleInputChange = (field: keyof FormState, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleVariableChange = (key: string, value: string) => {
    setVariableValues(prev => {
      const existing = prev.find(v => v.key === key)
      if (existing) {
        return prev.map(v => v.key === key ? { ...v, value } : v)
      }
      return [...prev, { key, value }]
    })
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
      name: form.name || `새 템플릿 ${new Date().toLocaleString('ko-KR')}`,
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

  const variables = parsedTemplate ? extractVariables(parsedTemplate) : []

  return (
    <div className="template-manager">
      <div className="template-manager__list">
        <div className="template-manager__list-header">
          <h3>템플릿 목록</h3>
        </div>
        {loading ? (
          <div className="template-loading">템플릿을 불러오는 중...</div>
        ) : loadError ? (
          <div className="template-empty">
            {loadError}
            <button className="template-button secondary" onClick={() => loadTemplates(pagination.page)} style={{ marginTop: 12 }}>
              다시 불러오기
            </button>
          </div>
        ) : templates.length === 0 ? (
          <div className="template-empty">등록된 템플릿이 없습니다. 우측에서 새 템플릿을 생성하세요.</div>
        ) : (
          <div className="template-list-container">
            {templates.map((template) => (
              <div
                key={template.id}
                className={`template-list-item ${selectedTemplate?.id === template.id ? 'active' : ''}`}
                onClick={() => handleSelectTemplate(template)}
              >
                <div className="template-list-item__header">
                  <h4>{template.name}</h4>
                  <span className={`category-badge category-${template.category}`}>
                    {template.category.toUpperCase()}
                  </span>
                </div>
                <div className="template-list-item__meta">
                  <span>v{template.version}</span>
                  <span>{template.isPublic ? '공개' : '비공개'}</span>
                  <span>{new Date(template.updatedAt).toLocaleDateString('ko-KR')}</span>
                </div>
                {template.description && (
                  <p className="template-list-item__description">{template.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="template-manager__editor">
        <div className="template-manager__editor-header">
          <h3>{selectedTemplate ? `템플릿 편집: ${selectedTemplate.name}` : '새 템플릿 생성'}</h3>
          <div className="editor-actions">
            <button className="template-button secondary" onClick={resetForm}>
              + 새 템플릿
            </button>
            {selectedTemplate && (
              <button className="template-button warn" onClick={handleDelete}>
                삭제
              </button>
            )}
          </div>
        </div>

        {selectedTemplate || form.name ? (
          <>
            <div className="template-tabs">
              <button
                className={`template-tab ${activeTab === 'edit' ? 'active' : ''}`}
                onClick={() => setActiveTab('edit')}
              >
                편집
              </button>
              <button
                className={`template-tab ${activeTab === 'preview' ? 'active' : ''}`}
                onClick={() => setActiveTab('preview')}
                disabled={!parsedTemplate}
              >
                미리보기
              </button>
              {variables.length > 0 && (
                <button
                  className={`template-tab ${activeTab === 'simulate' ? 'active' : ''}`}
                  onClick={() => setActiveTab('simulate')}
                  disabled={!parsedTemplate}
                >
                  시뮬레이션
                </button>
              )}
            </div>

            {activeTab === 'edit' && (
              <div className="template-edit-content">
                <div className="template-form-grid">
                  <div className="form-group">
                    <label>이름 *</label>
                    <input
                      value={form.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="템플릿 이름"
                    />
                  </div>
                  <div className="form-group">
                    <label>카테고리 *</label>
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
                    <select
                      value={form.model}
                      onChange={(e) => handleInputChange('model', e.target.value)}
                    >
                      <option value="">모델 선택</option>
                      {modelOptions.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
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

                <div className="form-group">
                  <label>설명</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="템플릿에 대한 설명을 입력하세요"
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

                <div className="template-editor-columns">
                  <div className="form-group">
                    <label>템플릿 JSON *</label>
                    <textarea
                      className={`template-json-textarea ${jsonError ? 'error' : ''}`}
                      rows={20}
                      value={form.templateJson}
                      onChange={(e) => handleInputChange('templateJson', e.target.value)}
                      placeholder={JSON.stringify(DEFAULT_TEMPLATE, null, 2)}
                    />
                    {jsonError && <p className="error-text">{jsonError}</p>}
                    <p className="helper-text">
                      변수를 사용하려면 {'{{'}변수명{'}}'} 형식을 사용하세요.
                    </p>
                  </div>

                  <div className="template-preview-column">
                    <label>실시간 미리보기</label>
                    {parsedTemplate ? (
                      <StructuredPromptCard
                        title={parsedTemplate.title || '템플릿 미리보기'}
                        template={parsedTemplate}
                      />
                    ) : (
                      <div className="template-preview-placeholder">
                        유효한 JSON을 입력하면 미리보기가 표시됩니다.
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

                {selectedTemplate && selectedTemplate.history.length > 0 && (
                  <div className="template-history-section">
                    <h4>버전 히스토리</h4>
                    <div className="template-history-list">
                      {selectedTemplate.history.map((entry) => (
                        <div key={entry.version} className="template-history-item">
                          <div className="template-history-item__header">
                            <strong>v{entry.version}</strong>
                            <span>{new Date(entry.updatedAt).toLocaleString('ko-KR')}</span>
                          </div>
                          {entry.changeSummary && (
                            <p className="template-history-item__summary">{entry.changeSummary}</p>
                          )}
                          <button
                            className="template-button secondary small"
                            onClick={() => handleRollback(entry.version)}
                          >
                            이 버전으로 롤백
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="template-form-actions">
                  <button className="template-button secondary" onClick={resetForm} disabled={isSaving}>
                    초기화
                  </button>
                  <button
                    className="template-button"
                    onClick={handleSave}
                    disabled={isSaving || !parsedTemplate || !form.name}
                  >
                    {isSaving ? '저장 중...' : selectedTemplate ? '템플릿 업데이트' : '템플릿 생성'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'preview' && parsedTemplate && (
              <div className="template-preview-content">
                <div className="template-preview-header">
                  <h4>템플릿 미리보기</h4>
                  <p className="helper-text">템플릿이 실제로 어떻게 표시되는지 확인하세요.</p>
                </div>
                <StructuredPromptCard
                  title={parsedTemplate.title || '템플릿 미리보기'}
                  template={parsedTemplate}
                />
              </div>
            )}

            {activeTab === 'simulate' && parsedTemplate && variables.length > 0 && (
              <div className="template-simulate-content">
                <div className="template-simulate-header">
                  <h4>템플릿 시뮬레이션</h4>
                  <p className="helper-text">
                    변수 값을 입력하여 실제 사용 시 템플릿이 어떻게 변환되는지 확인하세요.
                  </p>
                </div>
                <div className="template-variables-section">
                  <h5>변수 입력</h5>
                  <div className="template-variables-list">
                    {variables.map((variable) => (
                      <div key={variable} className="template-variable-item">
                        <label>{variable}</label>
                        <input
                          type="text"
                          value={variableValues.find(v => v.key === variable)?.value || ''}
                          onChange={(e) => handleVariableChange(variable, e.target.value)}
                          placeholder={`{{${variable}}} 값을 입력하세요`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="template-simulate-preview">
                  <h5>시뮬레이션 결과</h5>
                  {simulatedTemplate ? (
                    <StructuredPromptCard
                      title={simulatedTemplate.title || '시뮬레이션 결과'}
                      template={simulatedTemplate}
                    />
                  ) : (
                    <div className="template-preview-placeholder">
                      변수 값을 입력하면 시뮬레이션 결과가 표시됩니다.
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="template-empty-state">
            <p>왼쪽에서 템플릿을 선택하거나 새 템플릿을 생성하세요.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default TemplateManager
