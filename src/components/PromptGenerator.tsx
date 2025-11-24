import { useState } from 'react'
import { ContentType, DetailedOptions } from '../types'
import { generatePrompts } from '../utils/promptGenerator'
import ResultCard from './ResultCard'
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

  const handleGenerate = () => {
    if (!userPrompt.trim()) {
      alert('프롬프트를 입력해주세요.')
      return
    }

    const options: DetailedOptions = {
      age: detailedOptions.age || undefined,
      gender: detailedOptions.gender || undefined,
      occupation: detailedOptions.occupation || undefined,
      conversational: detailedOptions.conversational,
    }

    const generated = generatePrompts(userPrompt, contentType, options)
    setResults(generated)
  }

  return (
    <div className="prompt-generator">
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

        <button onClick={handleGenerate} className="generate-button">
          프롬프트 생성하기
        </button>
      </div>

      {results && (
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

