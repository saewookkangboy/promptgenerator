/**
 * 가이드모드용 모델 선택 컴포넌트
 * 간단한 라디오 버튼 스타일로 용도 중심의 모델 선택 제공
 */

import { useState, useMemo, useEffect } from 'react'
import { ImageModel } from '../types/image.types'
import { VideoModel } from '../types/video.types'
import { getRecommendedModelsForGuide, getModelMetadata } from '../config/model-metadata'
import './ModelSelectorGuide.css'

type ModelSelectorGuideProps = {
  category: 'image' | 'video'
  selectedModel: ImageModel | VideoModel | null
  onModelSelect: (model: ImageModel | VideoModel) => void
  userPrompt?: string // AI 추천을 위한 프롬프트
}

type GuideOption = {
  id: string
  label: string
  description: string
  modelId: string
  icon?: string
}

function ModelSelectorGuide({
  category,
  selectedModel,
  onModelSelect,
  userPrompt = '',
}: ModelSelectorGuideProps) {
  const [recommendedModelId, setRecommendedModelId] = useState<string | null>(null)

  // 가이드모드용 옵션 생성
  const guideOptions = useMemo((): GuideOption[] => {
    const recommended = getRecommendedModelsForGuide(category)

    if (category === 'image') {
      return [
        {
          id: 'recommended',
          label: '추천 모델 (자동 선택)',
          description: 'AI가 프롬프트를 분석하여 최적의 모델을 추천합니다',
          modelId: recommended.recommended,
          icon: '✨',
        },
        {
          id: 'fast',
          label: '빠른 생성',
          description: '즉시 결과를 확인하고 싶을 때',
          modelId: recommended.fast,
          icon: '⚡',
        },
        {
          id: 'high-quality',
          label: '고품질 사진',
          description: '사진 같은 리얼리즘이 필요할 때',
          modelId: recommended.highQuality,
          icon: '📸',
        },
        ...(recommended.artistic ? [{
          id: 'artistic',
          label: '예술적 스타일',
          description: '창의적이고 예술적인 표현이 필요할 때',
          modelId: recommended.artistic,
          icon: '🎨',
        }] : []),
      ]
    } else {
      return [
        {
          id: 'recommended',
          label: '추천 모델 (자동 선택)',
          description: 'AI가 프롬프트를 분석하여 최적의 모델을 추천합니다',
          modelId: recommended.recommended,
          icon: '✨',
        },
        {
          id: 'fast',
          label: '빠른 생성 (짧은 클립)',
          description: '즉시 미리보기를 확인하고 싶을 때',
          modelId: recommended.fast,
          icon: '⚡',
        },
        {
          id: 'high-quality',
          label: '고품질 영화적',
          description: '영화 같은 고품질 영상이 필요할 때',
          modelId: recommended.highQuality,
          icon: '🎬',
        },
        {
          id: 'audio',
          label: '오디오 포함',
          description: '음향이 동기화된 영상이 필요할 때',
          modelId: recommended.audio || '',
          icon: '🔊',
        },
      ]
    }
  }, [category])

  // AI 추천 모델 계산 (간단한 키워드 기반)
  const calculateRecommendedModel = useMemo(() => {
    if (!userPrompt || userPrompt.trim().length === 0) {
      return null
    }

    const prompt = userPrompt.toLowerCase()
    const recommended = getRecommendedModelsForGuide(category)

    if (category === 'image') {
      // 텍스트 관련 키워드
      if (
        prompt.includes('텍스트') ||
        prompt.includes('text') ||
        prompt.includes('글자') ||
        prompt.includes('포스터') ||
        prompt.includes('poster') ||
        prompt.includes('로고') ||
        prompt.includes('logo')
      ) {
        return 'nano-banana-pro'
      }

      // 예술적 키워드
      if (
        prompt.includes('예술') ||
        prompt.includes('art') ||
        prompt.includes('일러스트') ||
        prompt.includes('illustration') ||
        prompt.includes('컨셉') ||
        prompt.includes('concept')
      ) {
        return 'midjourney'
      }

      // 사진/리얼리즘 키워드
      if (
        prompt.includes('사진') ||
        prompt.includes('photo') ||
        prompt.includes('리얼') ||
        prompt.includes('realistic') ||
        prompt.includes('실제')
      ) {
        return 'imagen-3'
      }

      // 기본 추천
      return recommended.recommended
    } else {
      // 오디오 관련 키워드
      if (
        prompt.includes('음악') ||
        prompt.includes('music') ||
        prompt.includes('소리') ||
        prompt.includes('sound') ||
        prompt.includes('오디오') ||
        prompt.includes('audio')
      ) {
        return 'kling-2.6'
      }

      // 빠른 생성 키워드
      if (
        prompt.includes('빠르') ||
        prompt.includes('fast') ||
        prompt.includes('즉시') ||
        prompt.includes('quick') ||
        prompt.includes('짧은') ||
        prompt.includes('short')
      ) {
        return 'pika-2'
      }

      // 고품질 키워드
      if (
        prompt.includes('영화') ||
        prompt.includes('cinematic') ||
        prompt.includes('프로') ||
        prompt.includes('professional') ||
        prompt.includes('고품질') ||
        prompt.includes('high quality')
      ) {
        return 'sora-2'
      }

      // 기본 추천
      return recommended.recommended
    }
  }, [userPrompt, category])

  // 추천 모델이 계산되면 업데이트
  useEffect(() => {
    if (calculateRecommendedModel) {
      setRecommendedModelId(calculateRecommendedModel)
    }
  }, [calculateRecommendedModel])

  const handleOptionSelect = (option: GuideOption) => {
    if (option.id === 'recommended' && recommendedModelId) {
      onModelSelect(recommendedModelId as ImageModel | VideoModel)
    } else if (option.modelId) {
      onModelSelect(option.modelId as ImageModel | VideoModel)
    }
  }

  const getSelectedOptionId = () => {
    if (!selectedModel) {
      return null
    }

    // 추천 모델이 선택된 경우
    if (selectedModel === recommendedModelId) {
      return 'recommended'
    }

    // 다른 옵션과 매칭
    const option = guideOptions.find((opt) => opt.modelId === selectedModel)
    return option?.id || null
  }

  const selectedOptionId = getSelectedOptionId()

  return (
    <div className="model-selector-guide">
      <label className="model-selector-guide__label">생성 모델 선택 (선택사항)</label>
      <div className="model-selector-guide__cards-grid">
        {guideOptions.map((option) => {
          const isSelected = selectedOptionId === option.id

          // 추천 모델인 경우 계산된 모델 사용
          const displayModelId = option.id === 'recommended' && recommendedModelId 
            ? recommendedModelId 
            : option.modelId
          const displayMetadata = displayModelId ? getModelMetadata(displayModelId) : null

          return (
            <div
              key={option.id}
              className={`model-selector-guide__card ${isSelected ? 'selected' : ''}`}
              onClick={() => handleOptionSelect(option)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleOptionSelect(option)
                }
              }}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
            >
              <div className="model-selector-guide__card-header">
                <span className="model-selector-guide__card-icon">{option.icon}</span>
                {isSelected && (
                  <span className="model-selector-guide__checkmark">✓</span>
                )}
              </div>
              <div className="model-selector-guide__card-content">
                <div className="model-selector-guide__card-title">{option.label}</div>
                <div className="model-selector-guide__card-description">{option.description}</div>
                {displayMetadata && (
                  <div className="model-selector-guide__card-model">
                    {displayMetadata.name}
                  </div>
                )}
                {option.id === 'recommended' && recommendedModelId && (
                  <div className="model-selector-guide__card-badge">
                    ✨ 추천
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {selectedModel && (
        <div className="model-selector-guide__selected-info">
          선택된 모델: <strong>{getModelMetadata(selectedModel)?.name || selectedModel}</strong>
        </div>
      )}
    </div>
  )
}

export default ModelSelectorGuide
