/**
 * 고급모드용 모델 선택 컴포넌트
 * 드롭다운 + 모델 정보 카드 + 비교 기능
 */

import { useState, useMemo } from 'react'
import { ImageModel } from '../types/image.types'
import { VideoModel } from '../types/video.types'
import { MODEL_OPTIONS } from '../config/model-options'
import { getModelMetadata, getModelsByCategory } from '../config/model-metadata'
import './ModelSelectorAdvanced.css'

type ModelSelectorAdvancedProps = {
  category: 'image' | 'video'
  selectedModel: ImageModel | VideoModel | null
  onModelSelect: (model: ImageModel | VideoModel) => void
}

function ModelSelectorAdvanced({
  category,
  selectedModel,
  onModelSelect,
}: ModelSelectorAdvancedProps) {
  const [showComparison, setShowComparison] = useState(false)

  // 카테고리별 모델 목록
  const availableModels = useMemo(() => {
    return MODEL_OPTIONS.filter((option) => option.category === category)
  }, [category])

  // 선택된 모델의 메타데이터
  const selectedMetadata = useMemo(() => {
    if (!selectedModel) return null
    return getModelMetadata(selectedModel)
  }, [selectedModel])

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const modelId = e.target.value
    if (modelId) {
      onModelSelect(modelId as ImageModel | VideoModel)
    }
  }

  // 모델 비교 데이터
  const comparisonData = useMemo(() => {
    const models = getModelsByCategory(category)
    return models.map((model) => ({
      name: model.name,
      speed: model.speed,
      cost: model.cost,
      maxResolution: model.maxResolution || '-',
      maxDuration: model.maxDuration,
      supportsAudio: model.supportsAudio,
      supportsReferenceImage: model.supportsReferenceImage,
      maxReferenceImages: model.maxReferenceImages,
    }))
  }, [category])

  return (
    <div className="model-selector-advanced">
      <div className="model-selector-advanced__header">
        <label className="model-selector-advanced__label">
          생성 모델 선택 *
        </label>
        <button
          type="button"
          className="model-selector-advanced__compare-btn"
          onClick={() => setShowComparison(!showComparison)}
        >
          {showComparison ? '비교 닫기' : '모델 비교 보기'}
        </button>
      </div>

      <div className="model-selector-advanced__cards-grid">
        {availableModels.map((modelOption) => {
          const isSelected = selectedModel === modelOption.value
          const metadata = getModelMetadata(modelOption.value)

          return (
            <div
              key={modelOption.value}
              className={`model-selector-advanced__card ${isSelected ? 'selected' : ''}`}
              onClick={() => {
                if (modelOption.value) {
                  handleModelChange({
                    target: { value: modelOption.value }
                  } as React.ChangeEvent<HTMLSelectElement>)
                }
              }}
            >
              <div className="model-selector-advanced__card-header">
                <div className="model-selector-advanced__card-vendor">
                  {modelOption.vendor || 'AI'}
                </div>
                {isSelected && (
                  <span className="model-selector-advanced__checkmark">✓</span>
                )}
              </div>
              <div className="model-selector-advanced__card-content">
                <div className="model-selector-advanced__card-title">
                  {modelOption.label}
                </div>
                {metadata && (
                  <>
                    <div className="model-selector-advanced__card-features">
                      {metadata.features.slice(0, 2).map((feature, idx) => (
                        <span key={idx} className="model-selector-advanced__feature-tag">
                          {feature}
                        </span>
                      ))}
                    </div>
                    <div className="model-selector-advanced__card-specs">
                      {metadata.maxResolution && (
                        <span className="model-selector-advanced__spec">
                          📐 {metadata.maxResolution}
                        </span>
                      )}
                      <span className="model-selector-advanced__spec">
                        {metadata.speed === 'very-fast' && '⚡ 매우 빠름'}
                        {metadata.speed === 'fast' && '⚡ 빠름'}
                        {metadata.speed === 'medium' && '⚡ 보통'}
                        {metadata.speed === 'slow' && '⚡ 느림'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {selectedModel && selectedMetadata && (
        <div className="model-selector-advanced__info-card">
          <div className="model-selector-advanced__info-header">
            <h4 className="model-selector-advanced__info-title">선택된 모델: {selectedMetadata.name}</h4>
          </div>
          <div className="model-selector-advanced__info-content">
            <div className="model-selector-advanced__info-section">
              <h5 className="model-selector-advanced__info-section-title">특징</h5>
              <ul className="model-selector-advanced__features-list">
                {selectedMetadata.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>

            <div className="model-selector-advanced__info-grid">
              {selectedMetadata.maxResolution && (
                <div className="model-selector-advanced__info-item">
                  <span className="model-selector-advanced__info-label">해상도</span>
                  <span className="model-selector-advanced__info-value">
                    {selectedMetadata.maxResolution}
                  </span>
                </div>
              )}

              <div className="model-selector-advanced__info-item">
                <span className="model-selector-advanced__info-label">처리 속도</span>
                <span className="model-selector-advanced__info-value">
                  {selectedMetadata.speed === 'very-fast' && '매우 빠름'}
                  {selectedMetadata.speed === 'fast' && '빠름'}
                  {selectedMetadata.speed === 'medium' && '보통'}
                  {selectedMetadata.speed === 'slow' && '느림'}
                </span>
              </div>

              <div className="model-selector-advanced__info-item">
                <span className="model-selector-advanced__info-label">비용</span>
                <span className="model-selector-advanced__info-value">
                  {selectedMetadata.cost === 'low' && '낮음'}
                  {selectedMetadata.cost === 'medium' && '중간'}
                  {selectedMetadata.cost === 'high' && '높음'}
                  {selectedMetadata.cost === 'very-high' && '매우 높음'}
                </span>
              </div>

              {selectedMetadata.maxDuration && (
                <div className="model-selector-advanced__info-item">
                  <span className="model-selector-advanced__info-label">최대 길이</span>
                  <span className="model-selector-advanced__info-value">
                    {selectedMetadata.maxDuration}초
                  </span>
                </div>
              )}

              {category === 'video' && (
                <>
                  {selectedMetadata.supportsAudio !== undefined && (
                    <div className="model-selector-advanced__info-item">
                      <span className="model-selector-advanced__info-label">오디오 지원</span>
                      <span className="model-selector-advanced__info-value">
                        {selectedMetadata.supportsAudio ? '✓' : '✗'}
                      </span>
                    </div>
                  )}

                  {selectedMetadata.supportsReferenceImage !== undefined && (
                    <div className="model-selector-advanced__info-item">
                      <span className="model-selector-advanced__info-label">참조 이미지</span>
                      <span className="model-selector-advanced__info-value">
                        {selectedMetadata.supportsReferenceImage
                          ? selectedMetadata.maxReferenceImages
                            ? `${selectedMetadata.maxReferenceImages}개까지`
                            : '✓'
                          : '✗'}
                      </span>
                    </div>
                  )}

                  {selectedMetadata.supportsVertical && (
                    <div className="model-selector-advanced__info-item">
                      <span className="model-selector-advanced__info-label">세로 영상</span>
                      <span className="model-selector-advanced__info-value">✓</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="model-selector-advanced__info-section">
              <h5 className="model-selector-advanced__info-section-title">설명</h5>
              <p className="model-selector-advanced__description">{selectedMetadata.description}</p>
            </div>

            {selectedMetadata.recommendedFor.length > 0 && (
              <div className="model-selector-advanced__info-section">
                <h5 className="model-selector-advanced__info-section-title">추천 용도</h5>
                <div className="model-selector-advanced__recommended-tags">
                  {selectedMetadata.recommendedFor.map((use, index) => (
                    <span key={index} className="model-selector-advanced__tag">
                      {use}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showComparison && (
        <div className="model-selector-advanced__comparison">
          <h4 className="model-selector-advanced__comparison-title">모델 비교</h4>
          <div className="model-selector-advanced__comparison-table-wrapper">
            <table className="model-selector-advanced__comparison-table">
              <thead>
                <tr>
                  <th>모델</th>
                  <th>속도</th>
                  <th>비용</th>
                  <th>해상도</th>
                  {category === 'video' && (
                    <>
                      <th>최대 길이</th>
                      <th>오디오</th>
                      <th>참조 이미지</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((model, index) => (
                  <tr
                    key={index}
                    className={
                      selectedMetadata?.name === model.name
                        ? 'selected'
                        : ''
                    }
                  >
                    <td>{model.name}</td>
                    <td>
                      {model.speed === 'very-fast' && '매우 빠름'}
                      {model.speed === 'fast' && '빠름'}
                      {model.speed === 'medium' && '보통'}
                      {model.speed === 'slow' && '느림'}
                    </td>
                    <td>
                      {model.cost === 'low' && '낮음'}
                      {model.cost === 'medium' && '중간'}
                      {model.cost === 'high' && '높음'}
                      {model.cost === 'very-high' && '매우 높음'}
                    </td>
                    <td>{model.maxResolution}</td>
                    {category === 'video' && (
                      <>
                        <td>{model.maxDuration ? `${model.maxDuration}초` : '-'}</td>
                        <td>{model.supportsAudio ? '✓' : '✗'}</td>
                        <td>
                          {model.supportsReferenceImage
                            ? model.maxReferenceImages
                              ? `${model.maxReferenceImages}개`
                              : '✓'
                            : '✗'}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default ModelSelectorAdvanced
