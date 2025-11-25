import { useState, useCallback, useMemo } from 'react'
import { ContentType, DetailedOptions } from '../types'
import { generatePrompts } from '../utils/promptGenerator'
import { validatePrompt } from '../utils/validation'
import { savePromptRecord } from '../utils/storage'
import { promptAPI } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { showNotification } from '../utils/notifications'
import ResultCard from './ResultCard'
import ErrorMessage from './ErrorMessage'
import LoadingSpinner from './LoadingSpinner'
import './PromptGenerator.css'

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: 'blog', label: '블로그 콘텐츠' },
  { value: 'linkedin', label: '링크드인 뉴스피드' },
  { value: 'facebook', label: '페이스북 뉴스피드' },
  { value: 'instagram', label: '인스타그램 뉴스피드' },
  { value: 'youtube', label: '유튜브 영상' },
]

const AGE_OPTIONS = [
  { value: '', label: '선택 안함' },
  { value: '10대', label: '10대' },
  { value: '20대', label: '20대' },
  { value: '30대', label: '30대' },
  { value: '40대', label: '40대' },
  { value: '50대', label: '50대' },
  { value: '60대 이상', label: '60대 이상' },
]

const GENDER_OPTIONS = [
  { value: '', label: '선택 안함' },
  { value: '남성', label: '남성' },
  { value: '여성', label: '여성' },
  { value: '무관', label: '무관' },
]

const OCCUPATION_OPTIONS = [
  { value: '', label: '선택 안함' },
  { value: '학생', label: '학생' },
  { value: '직장인', label: '직장인' },
  { value: '개발자/프로그래머', label: '개발자/프로그래머' },
  { value: '디자이너', label: '디자이너' },
  { value: '마케터', label: '마케터' },
  { value: '기획자', label: '기획자' },
  { value: '경영진/CEO', label: '경영진/CEO' },
  { value: '자영업자', label: '자영업자' },
  { value: '프리랜서', label: '프리랜서' },
  { value: '전문직', label: '전문직' },
  { value: '기타', label: '기타' },
]

function PromptGenerator() {
  const { user } = useAuth()
  const [userPrompt, setUserPrompt] = useState('')
  const [contentType, setContentType] = useState<ContentType>('blog')
  const [showDetailedOptions, setShowDetailedOptions] = useState(false)
  const [detailedOptions, setDetailedOptions] = useState<DetailedOptions>({
    age: '',
    gender: '',
    occupation: '',
    conversational: false,
  })
  const [results, setResults] = useState<ReturnType<typeof generatePrompts> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = useCallback(() => {
    // 입력 검증
    const validation = validatePrompt(userPrompt)
    if (!validation.isValid) {
      setError(validation.error || '프롬프트를 입력해주세요.')
      return
    }

    setError(null)
    setIsGenerating(true)

    // 비동기 처리 시뮬레이션 (실제로는 즉시 생성되지만 UX를 위해)
    setTimeout(async () => {
      try {
        const options: DetailedOptions = {
          age: detailedOptions.age || undefined,
          gender: detailedOptions.gender || undefined,
          occupation: detailedOptions.occupation || undefined,
          conversational: detailedOptions.conversational,
        }

        const generated = generatePrompts(userPrompt, contentType, options)
        setResults(generated)
        
        // 로컬 스토리지에 저장 (Admin 기록용)
        savePromptRecord({
          category: 'text',
          userInput: userPrompt,
          options: {
            contentType,
            age: detailedOptions.age,
            gender: detailedOptions.gender,
            occupation: detailedOptions.occupation,
            conversational: detailedOptions.conversational,
          },
        })

        // 서버에 저장 (로그인된 사용자인 경우)
        if (user) {
          try {
            await promptAPI.create({
              title: `${contentType} 프롬프트`,
              content: generated.metaPrompt,
              category: 'TEXT',
              inputText: userPrompt,
              options: {
                contentType,
                age: detailedOptions.age,
                gender: detailedOptions.gender,
                occupation: detailedOptions.occupation,
                conversational: detailedOptions.conversational,
                contextPrompt: generated.contextPrompt,
                hashtags: generated.hashtags,
              },
            })
            // 서버 저장 성공 (조용히 처리, 사용자에게 알림 없음)
          } catch (serverError) {
            // 서버 저장 실패해도 계속 진행 (로컬 저장은 성공)
            console.warn('서버 저장 실패:', serverError)
          }
        }
      } catch (err) {
        setError('프롬프트 생성 중 오류가 발생했습니다.')
        showNotification('프롬프트 생성 중 오류가 발생했습니다.', 'error')
      } finally {
        setIsGenerating(false)
      }
    }, 300)
  }, [userPrompt, contentType, detailedOptions])

  const handleDismissError = useCallback(() => {
    setError(null)
  }, [])

  const isFormValid = useMemo(() => {
    return userPrompt.trim().length >= 3
  }, [userPrompt])

  return (
    <div className="prompt-generator">
      {error && <ErrorMessage message={error} onDismiss={handleDismissError} />}
      
      <div className="input-section">
        <div className="form-group">
          <label htmlFor="content-type">콘텐츠 유형 선택</label>
          <select
            id="content-type"
            value={contentType}
            onChange={(e) => setContentType(e.target.value as ContentType)}
            className="content-type-select"
          >
            {CONTENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="user-prompt">자연어 프롬프트 입력</label>
          <textarea
            id="user-prompt"
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="예: 인공지능의 미래와 사회적 영향에 대해 작성해주세요"
            className="prompt-input"
            rows={5}
          />
        </div>

        <div className="detailed-options-section">
          <button
            type="button"
            onClick={() => setShowDetailedOptions(!showDetailedOptions)}
            className="toggle-options-button"
          >
            {showDetailedOptions ? '▼' : '▶'} 상세 옵션 {showDetailedOptions ? '접기' : '펼치기'}
          </button>

          {showDetailedOptions && (
            <div className="detailed-options">
              <div className="options-grid">
                <div className="form-group">
                  <label htmlFor="age">나이</label>
                  <select
                    id="age"
                    value={detailedOptions.age}
                    onChange={(e) =>
                      setDetailedOptions({ ...detailedOptions, age: e.target.value })
                    }
                    className="option-select"
                  >
                    {AGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="gender">성별</label>
                  <select
                    id="gender"
                    value={detailedOptions.gender}
                    onChange={(e) =>
                      setDetailedOptions({ ...detailedOptions, gender: e.target.value })
                    }
                    className="option-select"
                  >
                    {GENDER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="occupation">타겟의 직업</label>
                  <select
                    id="occupation"
                    value={detailedOptions.occupation}
                    onChange={(e) =>
                      setDetailedOptions({ ...detailedOptions, occupation: e.target.value })
                    }
                    className="option-select"
                  >
                    {OCCUPATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={detailedOptions.conversational}
                      onChange={(e) =>
                        setDetailedOptions({
                          ...detailedOptions,
                          conversational: e.target.checked,
                        })
                      }
                      className="checkbox-input"
                    />
                    <span>대화체 사용</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={handleGenerate} 
          className="generate-button"
          disabled={!isFormValid || isGenerating}
          aria-busy={isGenerating}
        >
          {isGenerating ? '생성 중...' : '프롬프트 생성하기'}
        </button>
      </div>

      {isGenerating && <LoadingSpinner message="프롬프트를 생성하고 있습니다..." />}

      {results && !isGenerating && (
        <div className="results-section">
          <ResultCard
            title="메타 프롬프트"
            content={results.metaPrompt}
            englishVersion={results.englishMetaPrompt}
            showEnglishToggle={true}
          />
          <ResultCard
            title="컨텍스트 프롬프트"
            content={results.contextPrompt}
            englishVersion={results.englishContextPrompt}
            showEnglishToggle={true}
          />
          <div className="hashtags-card">
            <h3>해시태그</h3>
            <div className="hashtags-container">
              {results.hashtags.map((tag, index) => (
                <span key={index} className="hashtag">
                  {tag}
                </span>
              ))}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(results.hashtags.join(' '))
                alert('해시태그가 복사되었습니다!')
              }}
              className="copy-button"
            >
              해시태그 복사
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PromptGenerator

