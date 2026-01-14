import { useState, useMemo, useCallback } from 'react'
import { PromptTemplate } from '../types/prompt.types'
import { showNotification } from '../utils/notifications'
import './StructuredPromptCard.css'

interface StructuredPromptCardProps {
  title: string
  template: PromptTemplate
}

function StructuredPromptCard({ title, template }: StructuredPromptCardProps) {
  const [copied, setCopied] = useState(false)

  const serializedTemplate = useMemo(() => {
    const header = `${template.title}\n${template.description || ''}`.trim()
    const sections = template.sections
      .map((section) => `${section.title}:\n${section.content}`)
      .join('\n\n')
    return [header, sections].filter(Boolean).join('\n\n')
  }, [template])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(serializedTemplate)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error(error)
      showNotification('템플릿 복사에 실패했습니다.', 'error')
    }
  }, [serializedTemplate])

  return (
    <div className="structured-card">
      <div className="structured-card__header">
        <div>
          <h3>{title}</h3>
          {template.description && (
            <p className="structured-card__description">{template.description}</p>
          )}
        </div>
        <div className="structured-card__actions">
          <button
            className={`structured-card__button ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
          >
            {copied ? '✓ 복사됨' : '복사'}
          </button>
        </div>
      </div>

      <div className="structured-card__sections">
        {template.sections.map((section) => (
          <div key={`${section.key}-${section.title}`} className="structured-card__section">
            <div className="structured-card__section-header">
              <span className="structured-card__section-title">{section.title}</span>
              {section.helperText && (
                <span className="structured-card__section-helper">{section.helperText}</span>
              )}
            </div>
            <p className="structured-card__section-content">{section.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default StructuredPromptCard

