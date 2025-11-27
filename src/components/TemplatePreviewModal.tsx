import { useState, useEffect } from 'react'
import { templateAPI } from '../utils/api'
import { showNotification } from '../utils/notifications'
import './TemplatePreviewModal.css'

interface TemplatePreviewModalProps {
  template: {
    id: string
    name: string
    description?: string
    content: any
    variables: string[]
  }
  onClose: () => void
}

export default function TemplatePreviewModal({ template, onClose }: TemplatePreviewModalProps) {
  const [prompt, setPrompt] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 템플릿 적용 (변수가 없으면 빈 객체로, 있으면 기본값 사용)
    const applyTemplate = async () => {
      try {
        setLoading(true)
        setError(null)

        // 변수가 있으면 기본값으로 채우기
        const variables: Record<string, string> = {}
        template.variables.forEach(variable => {
          // 기본값 설정 (사용자가 나중에 수정할 수 있도록)
          variables[variable] = `[${variable} 입력 필요]`
        })

        const result = await templateAPI.apply(template.id, variables)
        setPrompt(result.prompt || '')
      } catch (err: any) {
        console.error('[TemplatePreviewModal] 템플릿 적용 실패:', err)
        setError(err?.message || '템플릿을 불러오는데 실패했습니다.')
        
        // 에러 발생 시에도 템플릿 내용을 직접 표시
        try {
          const templateContent = typeof template.content === 'string' 
            ? JSON.parse(template.content) 
            : template.content
          
          let fallbackPrompt = templateContent.title || ''
          if (templateContent.description) {
            fallbackPrompt += '\n\n' + templateContent.description
          }
          templateContent.sections?.forEach((section: any) => {
            fallbackPrompt += `\n\n## ${section.title}\n${section.content}`
          })
          setPrompt(fallbackPrompt)
        } catch (parseError) {
          console.error('[TemplatePreviewModal] 템플릿 파싱 실패:', parseError)
        }
      } finally {
        setLoading(false)
      }
    }

    applyTemplate()
  }, [template])

  const handleCopy = async () => {
    if (!prompt) return

    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      
      // 사용 카운트 증가 (복사 시에만)
      try {
        await templateAPI.recordUsage(template.id, { variables: {} })
        console.log('[TemplatePreviewModal] 사용 카운트 증가 완료')
      } catch (err) {
        console.warn('[TemplatePreviewModal] 사용 카운트 기록 실패:', err)
        // 사용 카운트 기록 실패해도 복사는 계속 진행
      }

      showNotification('프롬프트가 복사되었습니다!', 'success')
      
      // 1.5초 후 자동으로 닫기
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      console.error('[TemplatePreviewModal] 복사 실패:', err)
      showNotification('복사에 실패했습니다. 텍스트를 직접 선택하여 복사해주세요.', 'error')
    }
  }

  // ESC 키로 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // 배경 클릭으로 닫기 방지 (모달 내부 클릭만 허용)
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="template-preview-modal-overlay" onClick={handleBackdropClick}>
      <div className="template-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="template-preview-modal-header">
          <div>
            <h3>{template.name}</h3>
            {template.description && (
              <p className="template-preview-description">{template.description}</p>
            )}
          </div>
          <button 
            className="template-preview-close-button"
            onClick={onClose}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="template-preview-modal-body">
          {loading ? (
            <div className="template-preview-loading">
              <div className="spinner"></div>
              <p>프롬프트를 생성하는 중...</p>
            </div>
          ) : error ? (
            <div className="template-preview-error">
              <p>⚠️ {error}</p>
              {prompt && (
                <div className="template-preview-content">
                  <pre>{prompt}</pre>
                </div>
              )}
            </div>
          ) : (
            <div className="template-preview-content">
              <pre>{prompt}</pre>
            </div>
          )}
        </div>

        <div className="template-preview-modal-footer">
          <button
            onClick={handleCopy}
            className={`template-preview-copy-button ${copied ? 'copied' : ''}`}
            disabled={loading || !prompt}
          >
            {copied ? '✓ 복사됨' : '📋 복사하기'}
          </button>
          <button
            onClick={onClose}
            className="template-preview-close-footer-button"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

