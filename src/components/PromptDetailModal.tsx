import { useState, useEffect } from 'react'
import { adminAPI } from '../utils/api'
import { showNotification } from '../utils/notifications'
import './PromptDetailModal.css'

interface Prompt {
  id: string
  title?: string | null
  content: string
  category: string
  model?: string | null
  user?: {
    id: string
    email: string
    name?: string | null
  } | null
  createdAt: string
  updatedAt: string
  options?: any
}

interface PromptDetailModalProps {
  isOpen: boolean
  promptId: string | null
  promptData?: Prompt | null
  onClose: () => void
}

function PromptDetailModal({ isOpen, promptId, promptData, onClose }: PromptDetailModalProps) {
  const [prompt, setPrompt] = useState<Prompt | null>(promptData || null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && promptId && !promptData) {
      loadPrompt()
    } else if (promptData) {
      setPrompt(promptData)
    } else {
      setPrompt(null)
    }
  }, [isOpen, promptId, promptData])

  const loadPrompt = async () => {
    if (!promptId) return

    setLoading(true)
    try {
      // 프롬프트 상세 API가 없으므로, 목록에서 가져온 데이터를 사용
      // 필요시 서버에 상세 API를 추가할 수 있음
      setPrompt(null)
      showNotification('프롬프트 정보를 불러오는데 실패했습니다.', 'error')
    } catch (error: any) {
      console.error('프롬프트 정보 로드 실패:', error)
      showNotification('프롬프트 정보를 불러오는데 실패했습니다.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const renderOptions = () => {
    if (!prompt?.options) return null

    const options = prompt.options
    const rows: Array<{ label: string; value: string | number | boolean | undefined }> = []

    const category = prompt.category.toLowerCase()
    if (category === 'text') {
      if (options.contentType) rows.push({ label: '콘텐츠 타입', value: options.contentType })
      if (options.age) rows.push({ label: '나이', value: options.age })
      if (options.gender) rows.push({ label: '성별', value: options.gender })
      if (options.occupation) rows.push({ label: '직업', value: options.occupation })
      if (options.conversational !== undefined)
        rows.push({ label: '대화체', value: options.conversational ? '예' : '아니오' })
    } else if (category === 'image') {
      if (options.artStyle) rows.push({ label: '아트 스타일', value: options.artStyle })
      if (options.framing) rows.push({ label: '프레이밍', value: options.framing })
      if (options.lighting) rows.push({ label: '조명', value: options.lighting })
      if (options.colorMood) rows.push({ label: '색상 무드', value: options.colorMood })
      if (options.aspectRatio) rows.push({ label: '종횡비', value: options.aspectRatio })
      if (options.quality) rows.push({ label: '품질', value: options.quality })
      if (options.negativePrompt && Array.isArray(options.negativePrompt) && options.negativePrompt.length > 0) {
        rows.push({ label: '네거티브 프롬프트', value: options.negativePrompt.join(', ') })
      }
    } else if (category === 'video') {
      if (options.genre) rows.push({ label: '장르', value: options.genre })
      if (options.mood) rows.push({ label: '무드', value: options.mood })
      if (options.totalDuration) rows.push({ label: '총 길이', value: `${options.totalDuration}초` })
      if (options.fps) rows.push({ label: 'FPS', value: options.fps })
      if (options.resolution) rows.push({ label: '해상도', value: options.resolution })
      if (options.sceneCount) rows.push({ label: '장면 수', value: options.sceneCount })
      if (options.hasReferenceImage !== undefined)
        rows.push({ label: '참조 이미지', value: options.hasReferenceImage ? '예' : '아니오' })
    } else if (category === 'engineering') {
      if (options.method) rows.push({ label: '엔지니어링 방법', value: options.method })
    }

    if (rows.length === 0) return null

    return (
      <div className="options-section">
        <h3>옵션</h3>
        <table className="options-table">
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <td className="options-label">{row.label}</td>
                <td className="options-value">{String(row.value || '-')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container prompt-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>프롬프트 상세</h2>
          <button className="modal-close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="modal-loading">로딩 중...</div>
          ) : prompt ? (
            <>
              <div className="prompt-info-section">
                <div className="info-row">
                  <label>제목</label>
                  <div className="info-value">{prompt.title || '-'}</div>
                </div>
                <div className="info-row">
                  <label>카테고리</label>
                  <div className="info-value">
                    <span className={`category-badge category-${prompt.category.toLowerCase()}`}>
                      {prompt.category}
                    </span>
                  </div>
                </div>
                {prompt.model && (
                  <div className="info-row">
                    <label>모델</label>
                    <div className="info-value">{prompt.model}</div>
                  </div>
                )}
                {prompt.user && (
                  <div className="info-row">
                    <label>사용자</label>
                    <div className="info-value">
                      {prompt.user.email} {prompt.user.name ? `(${prompt.user.name})` : ''}
                    </div>
                  </div>
                )}
                <div className="info-row">
                  <label>생성일</label>
                  <div className="info-value">
                    {new Date(prompt.createdAt).toLocaleString('ko-KR')}
                  </div>
                </div>
                <div className="info-row">
                  <label>수정일</label>
                  <div className="info-value">
                    {new Date(prompt.updatedAt).toLocaleString('ko-KR')}
                  </div>
                </div>
              </div>

              <div className="content-section">
                <h3>프롬프트 내용</h3>
                <div className="content-text">{prompt.content}</div>
              </div>

              {renderOptions()}
            </>
          ) : (
            <div className="modal-error">프롬프트 정보를 불러올 수 없습니다.</div>
          )}
        </div>

        <div className="modal-footer">
          <button className="modal-button primary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

export default PromptDetailModal

