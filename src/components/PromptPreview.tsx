// 실시간 프리뷰 컴포넌트
import { useState, useEffect, useMemo } from 'react'
import { generatePrompts } from '../utils/promptGenerator'
import { ContentType, DetailedOptions } from '../types'
import ResultCard from './ResultCard'
import StructuredPromptCard from './StructuredPromptCard'
import './PromptPreview.css'

interface PromptPreviewProps {
  userPrompt: string
  contentType: ContentType
  options: DetailedOptions
  guideInsight?: any
  onVariantSelect?: (variant: 'original' | 'short' | 'long' | 'formal' | 'casual') => void
}

function PromptPreview({ 
  userPrompt, 
  contentType, 
  options, 
  guideInsight,
  onVariantSelect 
}: PromptPreviewProps) {
  const [selectedVariant, setSelectedVariant] = useState<'original' | 'short' | 'long' | 'formal' | 'casual'>('original')
  const [showABTest, setShowABTest] = useState(false)

  const variants = useMemo(() => {
    if (!userPrompt.trim() || userPrompt.trim().length < 3) {
      return null
    }

    try {
      const baseResult = generatePrompts(userPrompt, contentType, options, guideInsight)
      
      // 변형 생성
      const shortOptions = { ...options, goal: 'engagement' as any }
      const longOptions = { ...options, goal: 'education' as any }
      const formalOptions = { 
        ...options, 
        toneStyles: [...(options.toneStyles || []), 'formal' as any].filter(t => t !== 'casual')
      }
      const casualOptions = { 
        ...options, 
        toneStyles: [...(options.toneStyles || []), 'casual' as any].filter(t => t !== 'formal')
      }

      return {
        original: baseResult,
        short: generatePrompts(userPrompt, contentType, shortOptions, guideInsight),
        long: generatePrompts(userPrompt, contentType, longOptions, guideInsight),
        formal: generatePrompts(userPrompt, contentType, formalOptions, guideInsight),
        casual: generatePrompts(userPrompt, contentType, casualOptions, guideInsight),
      }
    } catch (error) {
      console.warn('프리뷰 생성 실패:', error)
      return null
    }
  }, [userPrompt, contentType, options, guideInsight])

  const currentVariant = variants?.[selectedVariant]

  useEffect(() => {
    if (onVariantSelect && currentVariant) {
      onVariantSelect(selectedVariant)
    }
  }, [selectedVariant, currentVariant, onVariantSelect])

  if (!variants || !currentVariant) {
    return null
  }

  return (
    <div className="prompt-preview">
      <div className="preview-header">
        <h3>실시간 프리뷰</h3>
        <div className="preview-controls">
          <button
            className={`preview-toggle ${showABTest ? 'active' : ''}`}
            onClick={() => setShowABTest(!showABTest)}
          >
            {showABTest ? '단일 보기' : 'A/B 테스트'}
          </button>
        </div>
      </div>

      {!showABTest ? (
        <div className="preview-single">
          <div className="variant-selector">
            <button
              className={`variant-button ${selectedVariant === 'original' ? 'active' : ''}`}
              onClick={() => setSelectedVariant('original')}
            >
              기본
            </button>
            <button
              className={`variant-button ${selectedVariant === 'short' ? 'active' : ''}`}
              onClick={() => setSelectedVariant('short')}
            >
              짧은 버전
            </button>
            <button
              className={`variant-button ${selectedVariant === 'long' ? 'active' : ''}`}
              onClick={() => setSelectedVariant('long')}
            >
              긴 버전
            </button>
            <button
              className={`variant-button ${selectedVariant === 'formal' ? 'active' : ''}`}
              onClick={() => setSelectedVariant('formal')}
            >
              공식적
            </button>
            <button
              className={`variant-button ${selectedVariant === 'casual' ? 'active' : ''}`}
              onClick={() => setSelectedVariant('casual')}
            >
              비공식적
            </button>
          </div>

          <div className="preview-content">
            {currentVariant.metaTemplate && (
              <StructuredPromptCard
                title="메타 프롬프트"
                template={currentVariant.metaTemplate}
              />
            )}
            <ResultCard
              title="메타 프롬프트"
              content={currentVariant.metaPrompt}
            />
            {currentVariant.contextTemplate && (
              <StructuredPromptCard
                title="컨텍스트 프롬프트"
                template={currentVariant.contextTemplate}
              />
            )}
            <ResultCard
              title="컨텍스트 프롬프트"
              content={currentVariant.contextPrompt}
            />
          </div>
        </div>
      ) : (
        <div className="preview-ab-test">
          <div className="ab-test-grid">
            <div className="ab-test-variant">
              <h4>기본 버전</h4>
              <ResultCard
                title="메타 프롬프트"
                content={variants.original.metaPrompt}
              />
            </div>
            <div className="ab-test-variant">
              <h4>짧은 버전</h4>
              <ResultCard
                title="메타 프롬프트"
                content={variants.short.metaPrompt}
              />
            </div>
            <div className="ab-test-variant">
              <h4>긴 버전</h4>
              <ResultCard
                title="메타 프롬프트"
                content={variants.long.metaPrompt}
              />
            </div>
            <div className="ab-test-variant">
              <h4>공식적 버전</h4>
              <ResultCard
                title="메타 프롬프트"
                content={variants.formal.metaPrompt}
              />
            </div>
            <div className="ab-test-variant">
              <h4>비공식적 버전</h4>
              <ResultCard
                title="메타 프롬프트"
                content={variants.casual.metaPrompt}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PromptPreview
