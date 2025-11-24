import { useState, useMemo, useCallback } from 'react'
import { convertToNativeEnglish } from '../utils/englishTranslator'
import './ResultCard.css'

interface ResultCardProps {
  title: string
  content: string
  englishVersion?: string
  showEnglishToggle?: boolean
}

function ResultCard({ title, content, englishVersion, showEnglishToggle = false }: ResultCardProps) {
  const [copied, setCopied] = useState(false)
  const [showEnglish, setShowEnglish] = useState(false)
  const [englishContent, setEnglishContent] = useState<string | null>(null)

  const handleToggleEnglish = useCallback(() => {
    if (!showEnglish && !englishContent) {
      // 영어 버전이 없으면 생성
      const translated = convertToNativeEnglish(content)
      setEnglishContent(translated)
    }
    setShowEnglish(!showEnglish)
  }, [showEnglish, englishContent, content])

  const displayContent = useMemo(() => {
    return showEnglish 
      ? (englishVersion || englishContent || convertToNativeEnglish(content))
      : content
  }, [showEnglish, englishVersion, englishContent, content])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(displayContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      alert('복사에 실패했습니다. 텍스트를 직접 선택하여 복사해주세요.')
    }
  }, [displayContent])

  return (
    <div className="result-card">
      <div className="result-card-header">
        <h3>{title}</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {showEnglishToggle && (
            <button
              onClick={handleToggleEnglish}
              className="copy-button"
              style={{ fontSize: '0.85rem', padding: '6px 12px' }}
            >
              {showEnglish ? '한국어' : 'English'}
            </button>
          )}
          <button
            onClick={handleCopy}
            className={`copy-button ${copied ? 'copied' : ''}`}
          >
            {copied ? '✓ 복사됨' : '복사'}
          </button>
        </div>
      </div>
      <div className="result-card-content">
        <pre>{displayContent}</pre>
        {showEnglish && (
          <div style={{ marginTop: '12px', padding: '8px', background: '#f5f5f5', fontSize: '0.85rem', opacity: 0.8 }}>
            Native English Version
          </div>
        )}
      </div>
    </div>
  )
}

export default ResultCard
