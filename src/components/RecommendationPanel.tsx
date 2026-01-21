// 추천 패널 컴포넌트
import { useState, useEffect } from 'react'
import { generateRecommendations, findSimilarPrompts, Recommendation } from '../utils/personalization'
import { PromptRecord } from '../utils/storage'
import { showNotification } from '../utils/notifications'
import './RecommendationPanel.css'

interface RecommendationPanelProps {
  userInput: string
  currentOptions?: Partial<PromptRecord['options']>
  onApplyRecommendation?: (type: Recommendation['type'], value: string) => void
  onSelectSimilarPrompt?: (prompt: PromptRecord) => void
}

function RecommendationPanel({ 
  userInput, 
  currentOptions,
  onApplyRecommendation,
  onSelectSimilarPrompt 
}: RecommendationPanelProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [similarPrompts, setSimilarPrompts] = useState<PromptRecord[]>([])
  const [showSimilar, setShowSimilar] = useState(false)

  useEffect(() => {
    if (userInput.trim().length >= 3) {
      const recs = generateRecommendations(userInput, currentOptions)
      setRecommendations(recs)

      const similar = findSimilarPrompts(userInput, currentOptions, 3)
      setSimilarPrompts(similar)
    } else {
      setRecommendations([])
      setSimilarPrompts([])
    }
  }, [userInput, currentOptions])

  const handleApply = (rec: Recommendation) => {
    onApplyRecommendation?.(rec.type, rec.value)
    showNotification(`"${rec.value}" 적용됨`, 'success')
  }

  const getRecommendationLabel = (type: Recommendation['type']): string => {
    const labels: Record<Recommendation['type'], string> = {
      contentType: '콘텐츠 타입',
      toneStyle: '톤 스타일',
      goal: '목표',
      tag: '태그',
      template: '템플릿',
    }
    return labels[type] || type
  }

  if (recommendations.length === 0 && similarPrompts.length === 0) {
    return null
  }

  return (
    <div className="recommendation-panel">
      {recommendations.length > 0 && (
        <div className="recommendations-section">
          <h4 className="recommendations-title">💡 추천</h4>
          <div className="recommendations-list">
            {recommendations.map((rec, index) => (
              <div key={index} className="recommendation-item">
                <div className="recommendation-content">
                  <span className="recommendation-type">{getRecommendationLabel(rec.type)}</span>
                  <span className="recommendation-value">{rec.value}</span>
                  <span className="recommendation-reason">{rec.reason}</span>
                </div>
                <button
                  className="recommendation-apply-button"
                  onClick={() => handleApply(rec)}
                >
                  적용
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {similarPrompts.length > 0 && (
        <div className="similar-prompts-section">
          <button
            className="similar-toggle"
            onClick={() => setShowSimilar(!showSimilar)}
          >
            {showSimilar ? '▼' : '▶'} 유사한 프롬프트 ({similarPrompts.length}개)
          </button>
          {showSimilar && (
            <div className="similar-prompts-list">
              {similarPrompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className="similar-prompt-item"
                  onClick={() => onSelectSimilarPrompt?.(prompt)}
                >
                  <div className="similar-prompt-preview">
                    {prompt.title || prompt.userInput?.substring(0, 100)}
                  </div>
                  <div className="similar-prompt-meta">
                    <span className="similar-prompt-category">{prompt.category}</span>
                    <span className="similar-prompt-date">
                      {new Date(prompt.timestamp).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default RecommendationPanel
