// 온보딩 컴포넌트
import { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { updateUserPreferences, getUserPreferences } from '../utils/storage'
import './Onboarding.css'

interface OnboardingProps {
  onComplete: () => void
  onSkip: () => void
}

function Onboarding({ onComplete, onSkip }: OnboardingProps) {
  const { t } = useLanguage()
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>([])
  const [selectedToneStyles, setSelectedToneStyles] = useState<string[]>([])

  const totalSteps = 3

  const contentTypes = [
    { id: 'blog', label: '블로그', icon: '📝' },
    { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
    { id: 'twitter', label: 'X (Twitter)', icon: '🐦' },
    { id: 'instagram', label: 'Instagram', icon: '📸' },
    { id: 'youtube', label: 'YouTube', icon: '🎥' },
    { id: 'tiktok', label: 'TikTok', icon: '🎵' },
  ]

  const toneStyles = [
    { id: 'professional', label: '전문적', icon: '👔' },
    { id: 'friendly', label: '친근한', icon: '😊' },
    { id: 'casual', label: '캐주얼', icon: '👕' },
    { id: 'formal', label: '격식 있는', icon: '🎩' },
  ]

  const handleComplete = () => {
    // 사용자 선호도 저장
    updateUserPreferences({
      preferredContentTypes: selectedContentTypes,
      preferredToneStyles: selectedToneStyles,
    })
    onComplete()
  }

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // 이미 온보딩을 완료한 경우 스킵
  useEffect(() => {
    const prefs = getUserPreferences()
    if (prefs.preferredContentTypes && prefs.preferredContentTypes.length > 0) {
      onComplete()
    }
  }, [onComplete])

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-container">
        <div className="onboarding-header">
          <h2>환영합니다! 🎉</h2>
          <p>몇 가지 질문으로 맞춤형 경험을 설정하세요</p>
          <button className="skip-button" onClick={onSkip}>
            건너뛰기
          </button>
        </div>

        <div className="onboarding-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
          <span className="progress-text">
            {currentStep} / {totalSteps}
          </span>
        </div>

        <div className="onboarding-content">
          {currentStep === 1 && (
            <div className="onboarding-step">
              <h3>어떤 콘텐츠를 주로 만드시나요?</h3>
              <p className="step-description">자주 사용하는 플랫폼을 선택해주세요 (복수 선택 가능)</p>
              <div className="option-grid">
                {contentTypes.map((type) => (
                  <button
                    key={type.id}
                    className={`option-card ${selectedContentTypes.includes(type.id) ? 'selected' : ''}`}
                    onClick={() => {
                      if (selectedContentTypes.includes(type.id)) {
                        setSelectedContentTypes(selectedContentTypes.filter(id => id !== type.id))
                      } else {
                        setSelectedContentTypes([...selectedContentTypes, type.id])
                      }
                    }}
                  >
                    <span className="option-icon">{type.icon}</span>
                    <span className="option-label">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="onboarding-step">
              <h3>선호하는 톤 스타일은?</h3>
              <p className="step-description">자주 사용하는 어투를 선택해주세요 (복수 선택 가능)</p>
              <div className="option-grid">
                {toneStyles.map((tone) => (
                  <button
                    key={tone.id}
                    className={`option-card ${selectedToneStyles.includes(tone.id) ? 'selected' : ''}`}
                    onClick={() => {
                      if (selectedToneStyles.includes(tone.id)) {
                        setSelectedToneStyles(selectedToneStyles.filter(id => id !== tone.id))
                      } else {
                        setSelectedToneStyles([...selectedToneStyles, tone.id])
                      }
                    }}
                  >
                    <span className="option-icon">{tone.icon}</span>
                    <span className="option-label">{tone.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="onboarding-step">
              <h3>거의 다 왔어요! 🚀</h3>
              <p className="step-description">이제 프롬프트 메이커를 사용할 준비가 되었습니다</p>
              <div className="feature-highlights">
                <div className="feature-item">
                  <span className="feature-icon">✨</span>
                  <div>
                    <h4>스마트 추천</h4>
                    <p>사용 패턴을 학습하여 맞춤형 추천을 제공합니다</p>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">📊</span>
                  <div>
                    <h4>사용 통계</h4>
                    <p>생성한 프롬프트를 관리하고 통계를 확인할 수 있습니다</p>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🔄</span>
                  <div>
                    <h4>A/B 테스트</h4>
                    <p>여러 버전의 프롬프트를 비교하여 최적의 결과를 찾을 수 있습니다</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="onboarding-footer">
          <button
            className="nav-button prev-button"
            onClick={handlePrev}
            disabled={currentStep === 1}
          >
            이전
          </button>
          <button
            className="nav-button next-button"
            onClick={handleNext}
          >
            {currentStep === totalSteps ? '시작하기' : '다음'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Onboarding
