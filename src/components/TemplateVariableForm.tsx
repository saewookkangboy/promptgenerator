import { useState } from 'react'
import { PromptTemplate } from '../types/prompt.types'
import { VARIABLE_DESCRIPTIONS } from '../utils/templateUtils'
import './TemplateVariableForm.css'

interface TemplateVariableFormProps {
  template: {
    name: string
    description?: string
    content: PromptTemplate
    variables: string[]
  }
  onSubmit: (variables: Record<string, string>) => void
  onCancel: () => void
}

export default function TemplateVariableForm({ template, onSubmit, onCancel }: TemplateVariableFormProps) {
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {}
    
    // 필수 변수 검증
    template.variables.forEach(variable => {
      if (!variableValues[variable]?.trim()) {
        newErrors[variable] = '이 변수는 필수입니다'
      }
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSubmit(variableValues)
  }

  return (
    <div className="template-variable-form-overlay">
      <div className="template-variable-form">
        <div className="template-variable-form-header">
          <h3>{template.name}</h3>
          {template.description && (
            <p className="template-description">{template.description}</p>
          )}
        </div>

        <div className="template-variable-form-body">
          <p className="form-instruction">아래 변수들을 입력하여 템플릿을 완성하세요</p>
          
          {template.variables.map(variable => (
            <div key={variable} className="variable-input-group">
              <label>
                {variable}
                {VARIABLE_DESCRIPTIONS[variable] && (
                  <span className="variable-hint">({VARIABLE_DESCRIPTIONS[variable]})</span>
                )}
              </label>
              <textarea
                value={variableValues[variable] || ''}
                onChange={(e) => {
                  setVariableValues(prev => ({ ...prev, [variable]: e.target.value }))
                  if (errors[variable]) {
                    setErrors(prev => {
                      const newErrors = { ...prev }
                      delete newErrors[variable]
                      return newErrors
                    })
                  }
                }}
                placeholder={`{{${variable}}} 값을 입력하세요`}
                rows={3}
                className={errors[variable] ? 'error' : ''}
              />
              {errors[variable] && (
                <span className="error-message">{errors[variable]}</span>
              )}
            </div>
          ))}
        </div>

        <div className="template-variable-form-footer">
          <button onClick={onCancel} className="btn-secondary">취소</button>
          <button onClick={handleSubmit} className="btn-primary">템플릿 적용</button>
        </div>
      </div>
    </div>
  )
}

