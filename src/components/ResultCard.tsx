import { useState, useCallback } from 'react'
import { showNotification } from '../utils/notifications'
import './ResultCard.css'

interface ResultCardProps {
  title: string
  content: string
}

function ResultCard({ title, content }: ResultCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      showNotification('복사에 실패했습니다. 텍스트를 직접 선택하여 복사해주세요.', 'error')
    }
  }, [content])

  return (
    <div className="result-card">
      <div className="result-card-header">
        <h3>{title}</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={handleCopy}
            className={`copy-button ${copied ? 'copied' : ''}`}
          >
            {copied ? '✓ 복사됨' : '복사'}
          </button>
        </div>
      </div>
      <div className="result-card-content">
        <pre>{content}</pre>
      </div>
    </div>
  )
}

export default ResultCard
