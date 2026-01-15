import { useState, useEffect, useRef } from 'react'
import { templateAPI } from '../utils/api'
import { showNotification } from '../utils/notifications'
import { PromptTemplate } from '../types/prompt.types'
import './TemplatePreviewModal.css'

// 개발 모드 체크
const isDev = import.meta.env.DEV

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

interface TemplatePreviewModalProps {
  template: {
    id: string
    name: string
    description?: string
    content: PromptTemplate | string
    variables: string[]
  }
  onClose: () => void
}

export default function TemplatePreviewModal({ template, onClose }: TemplatePreviewModalProps) {
  const [prompt, setPrompt] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // 새로운 AbortController 생성
    const abortController = new AbortController()
    abortControllerRef.current = abortController

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

        const result = await templateAPI.apply(template.id, variables, abortController.signal)
        
        // 컴포넌트가 언마운트되었거나 요청이 취소되었는지 확인
        if (abortController.signal.aborted) {
          return
        }

        setPrompt(result.prompt || '')
      } catch (err: unknown) {
        // 요청이 취소된 경우 상태 업데이트를 건너뜀
        if (abortController.signal.aborted) {
          devLog('[TemplatePreviewModal] 요청 취소됨 - 상태 업데이트 건너뜀')
          return
        }

        // AbortError는 조용히 처리 (요청 취소는 정상적인 동작)
        // 실제 abort만 처리: AbortError name 또는 DOMException (where available)
        const isAbortError = 
          (err instanceof Error && err.name === 'AbortError') ||
          (typeof DOMException !== 'undefined' && err instanceof DOMException && err.name === 'AbortError')
        
        if (isAbortError) {
          devLog('[TemplatePreviewModal] 요청 취소됨')
          return
        }

        devError('[TemplatePreviewModal] 템플릿 적용 실패:', err)
        
        // 에러 타입별 처리
        if (err instanceof Error) {
          // 인증 오류인 경우 특별 처리 (공개 템플릿이므로 폴백으로 처리)
          if (err.message.includes('인증') || err.message.includes('로그인')) {
            devWarn('[TemplatePreviewModal] 인증 오류 - 폴백으로 템플릿 내용 표시')
            setError(null) // 인증 오류는 에러로 표시하지 않음
          } else {
            setError(err.message || '템플릿을 불러오는데 실패했습니다.')
          }
        } else {
          setError('템플릿을 불러오는데 실패했습니다.')
        }
        
        // 에러 발생 시에도 템플릿 내용을 직접 표시
        try {
          const templateContent: PromptTemplate = typeof template.content === 'string' 
            ? JSON.parse(template.content) 
            : template.content
          
          let fallbackPrompt = templateContent.title || ''
          if (templateContent.description) {
            fallbackPrompt += '\n\n' + templateContent.description
          }
          templateContent.sections?.forEach((section) => {
            fallbackPrompt += `\n\n## ${section.title}\n${section.content}`
          })
          setPrompt(fallbackPrompt)
        } catch (parseError) {
          devError('[TemplatePreviewModal] 템플릿 파싱 실패:', parseError)
        }
      } finally {
        // 요청이 취소되지 않은 경우에만 로딩 상태 업데이트
        if (!abortController.signal.aborted) {
          setLoading(false)
        }
      }
    }

    applyTemplate()

    // 클린업 함수: 컴포넌트 언마운트 시 요청 취소
    return () => {
      abortController.abort()
    }
  }, [template])

  const closeTimeoutRef = useRef<number | null>(null)

  const handleCopy = async () => {
    if (!prompt) return

    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      
      // 사용 카운트 증가 (복사 시에만)
      try {
        await templateAPI.recordUsage(template.id, { variables: {} })
        devLog('[TemplatePreviewModal] 사용 카운트 증가 완료')
      } catch (err) {
        devWarn('[TemplatePreviewModal] 사용 카운트 기록 실패:', err)
        // 사용 카운트 기록 실패해도 복사는 계속 진행
      }

      showNotification('프롬프트가 복사되었습니다!', 'success')
      
      // 이전 타이머 취소
      if (closeTimeoutRef.current !== null) {
        clearTimeout(closeTimeoutRef.current)
      }
      
      // 1.5초 후 자동으로 닫기
      closeTimeoutRef.current = window.setTimeout(() => {
        onClose()
        closeTimeoutRef.current = null
      }, 1500)
    } catch (err) {
      devError('[TemplatePreviewModal] 복사 실패:', err)
      showNotification('복사에 실패했습니다. 텍스트를 직접 선택하여 복사해주세요.', 'error')
    }
  }

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== null) {
        clearTimeout(closeTimeoutRef.current)
      }
    }
  }, [])

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

