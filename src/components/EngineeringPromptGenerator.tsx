// 프롬프트 엔지니어링 UI 컴포넌트

import { useState, useCallback } from 'react'
import { EngineeringPromptOptions, EngineeringConfig } from '../types/engineering.types'
import { PromptResult } from '../types/prompt.types'
import { PromptGeneratorFactory } from '../generators/factory/PromptGeneratorFactory'
import { validateRequired } from '../utils/validation'
import { savePromptRecord } from '../utils/storage'
import { promptAPI } from '../utils/api'
import { showNotification } from '../utils/notifications'
import { translateTextMap } from '../utils/translation'
import ResultCard from './ResultCard'
import ErrorMessage from './ErrorMessage'
import LoadingSpinner from './LoadingSpinner'
import './PromptGenerator.css'

type EngineeringMethod = 'cot' | 'few-shot' | 'role-based' | 'zero-shot' | 'optimize'

function EngineeringPromptGenerator() {
  const [method, setMethod] = useState<EngineeringMethod>('zero-shot')
  const [basePrompt, setBasePrompt] = useState('')
  const [config, setConfig] = useState<EngineeringConfig>({})
  const [results, setResults] = useState<PromptResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [hashtagsCopied, setHashtagsCopied] = useState(false)

  // Few-shot 예시 관리
  const [fewShotExamples, setFewShotExamples] = useState<Array<{ input: string; output: string; explanation?: string }>>([
    { input: '', output: '', explanation: '' },
  ])

  // CoT 단계 관리
  const [cotSteps, setCotSteps] = useState<string[]>(['', '', '', '', ''])

  // Role-based 설정
  const [role, setRole] = useState('')
  const [expertise, setExpertise] = useState<string[]>([''])
  const [perspective, setPerspective] = useState('')

  const handleGenerate = useCallback(() => {
    const validation = validateRequired(basePrompt, '기본 프롬프트')
    if (!validation.isValid) {
      setError(validation.error || '기본 프롬프트를 입력해주세요.')
      return
    }

    setError(null)
    setIsGenerating(true)

    setTimeout(async () => {
      try {
        const engineeringConfig: EngineeringConfig = {}

    // 방법별 설정 구성
    if (method === 'cot') {
      const validSteps = cotSteps.filter(s => s.trim())
      if (validSteps.length === 0) {
        setError('Chain of Thought 단계를 최소 1개 이상 입력해주세요.')
        setIsGenerating(false)
        return
      }
      engineeringConfig.cot = {
        steps: validSteps,
        reasoning: config.cot?.reasoning || false,
      }
    }

    if (method === 'few-shot') {
      const validExamples = fewShotExamples.filter(e => e.input.trim() && e.output.trim())
      if (validExamples.length === 0) {
        setError('Few-shot 예시를 최소 1개 이상 입력해주세요.')
        setIsGenerating(false)
        return
      }
      engineeringConfig.fewShot = {
        examples: validExamples,
        numExamples: validExamples.length,
      }
    }

    if (method === 'role-based') {
      if (!role.trim()) {
        setError('역할을 입력해주세요.')
        setIsGenerating(false)
        return
      }
      const validExpertise = expertise.filter(e => e.trim())
      if (validExpertise.length === 0) {
        setError('전문성을 최소 1개 이상 입력해주세요.')
        setIsGenerating(false)
        return
      }
      engineeringConfig.roleBased = {
        role: role.trim(),
        expertise: validExpertise.filter(e => e.trim()),
        perspective: perspective.trim() || undefined,
      }
    }

    if (method === 'optimize') {
      engineeringConfig.optimize = {
        clarity: config.optimize?.clarity !== false,
        structure: config.optimize?.structure !== false,
        keywords: config.optimize?.keywords !== false,
        length: config.optimize?.length || 'medium',
      }
    }

    const options: EngineeringPromptOptions = {
      category: 'engineering',
      userInput: basePrompt,
      method,
      basePrompt,
      engineeringConfig,
    }

        const generator = PromptGeneratorFactory.create('engineering')
        const generated = generator.generate(options)

        let enrichedResults = generated
        try {
          const translationTargets: Record<string, string | undefined> = {
            englishMetaPrompt: generated.metaPrompt,
            englishContextPrompt: generated.contextPrompt,
          }

          const primaryContent =
            (generated as any).fullPrompt ||
            (generated as any).prompt ||
            (generated as any).result ||
            ''

          if (typeof primaryContent === 'string' && primaryContent.trim().length > 0) {
            translationTargets.englishVersion = primaryContent
          }

          const translations = await translateTextMap(translationTargets)
          if (Object.keys(translations).length > 0) {
            enrichedResults = { ...generated, ...translations }
          }
        } catch (translationError) {
          console.warn('DeepL translation failed:', translationError)
          showNotification('프롬프트 엔지니어링 영문 번역에 실패했습니다. 기본 버전을 표시합니다.', 'warning')
        }

        setResults(enrichedResults)
        
        // 로컬 스토리지에 저장 (Admin 기록용)
        savePromptRecord({
          category: 'engineering',
          userInput: basePrompt,
          options: {
            method: method,
          },
        })

        // 서버에 저장 시도 (로그인 없이도 시도)
        try {
          const resultContent = (generated as any).prompt || (generated as any).result || JSON.stringify(generated)
          await promptAPI.create({
            title: `${method} 프롬프트 엔지니어링`,
            content: resultContent,
            category: 'ENGINEERING',
            inputText: basePrompt,
            options: {
              method: method,
              config: config,
              result: generated,
            },
          })
        } catch (serverError) {
          console.warn('서버 저장 실패:', serverError)
        }
      } catch (error: any) {
        setError(`프롬프트 생성 오류: ${error.message}`)
      } finally {
        setIsGenerating(false)
      }
    }, 300)
  }, [method, basePrompt, config, cotSteps, fewShotExamples, role, expertise, perspective])

  const addFewShotExample = () => {
    setFewShotExamples([...fewShotExamples, { input: '', output: '', explanation: '' }])
  }

  const removeFewShotExample = (index: number) => {
    setFewShotExamples(fewShotExamples.filter((_, i) => i !== index))
  }

  const updateFewShotExample = (index: number, field: 'input' | 'output' | 'explanation', value: string) => {
    const updated = [...fewShotExamples]
    updated[index] = { ...updated[index], [field]: value }
    setFewShotExamples(updated)
  }

  const addCotStep = () => {
    setCotSteps([...cotSteps, ''])
  }

  const removeCotStep = (index: number) => {
    setCotSteps(cotSteps.filter((_, i) => i !== index))
  }

  const updateCotStep = (index: number, value: string) => {
    const updated = [...cotSteps]
    updated[index] = value
    setCotSteps(updated)
  }

  const addExpertise = () => {
    setExpertise([...expertise, ''])
  }

  const removeExpertise = (index: number) => {
    setExpertise(expertise.filter((_, i) => i !== index))
  }

  const updateExpertise = (index: number, value: string) => {
    const updated = [...expertise]
    updated[index] = value
    setExpertise(updated)
  }

  const handleCopyHashtags = useCallback(async () => {
    if (!results?.hashtags?.length) return
    try {
      await navigator.clipboard.writeText(results.hashtags.join(' '))
      setHashtagsCopied(true)
      setTimeout(() => setHashtagsCopied(false), 2000)
    } catch (copyErr) {
      console.error('Failed to copy hashtags', copyErr)
      showNotification('해시태그 복사에 실패했습니다. 클립보드 권한을 확인해주세요.', 'error')
    }
  }, [results?.hashtags])

  return (
    <div className="prompt-generator">
      <div className="input-section">
        <div className="form-group">
          <label htmlFor="method">프롬프트 엔지니어링 방법</label>
          <select
            id="method"
            value={method}
            onChange={(e) => setMethod(e.target.value as EngineeringMethod)}
            className="content-type-select"
          >
            <option value="zero-shot">Zero-shot (기본)</option>
            <option value="cot">Chain of Thought (단계별 사고)</option>
            <option value="few-shot">Few-shot Learning (예시 기반)</option>
            <option value="role-based">Role-based (역할 기반)</option>
            <option value="optimize">Optimize (최적화)</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="base-prompt">기본 프롬프트</label>
          <textarea
            id="base-prompt"
            value={basePrompt}
            onChange={(e) => setBasePrompt(e.target.value)}
            placeholder="예: 고양이에 대한 블로그 글을 작성해주세요"
            className="prompt-input"
            rows={5}
          />
        </div>

        {/* Chain of Thought 설정 */}
        {method === 'cot' && (
          <div className="detailed-options">
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ marginBottom: 0 }}>사고 단계</label>
                <button onClick={addCotStep} className="copy-button" style={{ whiteSpace: 'nowrap', padding: '6px 12px' }}>
                  + 단계 추가
                </button>
              </div>
              {cotSteps.map((step, index) => (
                <div key={index} style={{ marginBottom: '8px', display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={step}
                    onChange={(e) => updateCotStep(index, e.target.value)}
                    placeholder={`단계 ${index + 1}`}
                    className="prompt-input"
                    style={{ flex: 1 }}
                  />
                  {cotSteps.length > 1 && (
                    <button
                      onClick={() => removeCotStep(index)}
                      className="copy-button"
                      style={{ padding: '6px 12px' }}
                    >
                      삭제
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={config.cot?.reasoning || false}
                  onChange={(e) => setConfig({ ...config, cot: { ...config.cot, reasoning: e.target.checked, steps: cotSteps } })}
                  className="checkbox-input"
                />
                <span>각 단계에서 추론 과정 명시</span>
              </label>
            </div>
          </div>
        )}

        {/* Few-shot 설정 */}
        {method === 'few-shot' && (
          <div className="detailed-options">
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ marginBottom: 0 }}>예시</label>
                <button onClick={addFewShotExample} className="copy-button" style={{ whiteSpace: 'nowrap', padding: '6px 12px' }}>
                  + 예시 추가
                </button>
              </div>
              {fewShotExamples.map((example, index) => (
                <div key={index} style={{ marginBottom: '16px', padding: '12px', border: '1px solid #000000' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong>예시 {index + 1}</strong>
                    {fewShotExamples.length > 1 && (
                      <button
                        onClick={() => removeFewShotExample(index)}
                        className="copy-button"
                        style={{ padding: '4px 12px', fontSize: '0.85rem' }}
                      >
                        삭제
                      </button>
                    )}
                  </div>
                  <div className="form-group">
                    <label>입력</label>
                    <input
                      type="text"
                      value={example.input}
                      onChange={(e) => updateFewShotExample(index, 'input', e.target.value)}
                      placeholder="입력 예시"
                      className="prompt-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>출력</label>
                    <textarea
                      value={example.output}
                      onChange={(e) => updateFewShotExample(index, 'output', e.target.value)}
                      placeholder="출력 예시"
                      className="prompt-input"
                      rows={2}
                    />
                  </div>
                  <div className="form-group">
                    <label>설명 (선택사항)</label>
                    <input
                      type="text"
                      value={example.explanation || ''}
                      onChange={(e) => updateFewShotExample(index, 'explanation', e.target.value)}
                      placeholder="설명"
                      className="prompt-input"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Role-based 설정 */}
        {method === 'role-based' && (
          <div className="detailed-options">
            <div className="form-group">
              <label htmlFor="role">역할</label>
              <input
                id="role"
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="예: 전문 마케팅 컨설턴트"
                className="prompt-input"
              />
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ marginBottom: 0 }}>전문성</label>
                <button onClick={addExpertise} className="copy-button" style={{ whiteSpace: 'nowrap', padding: '6px 12px' }}>
                  + 추가
                </button>
              </div>
              {expertise.map((exp, index) => (
                <div key={index} style={{ marginBottom: '8px', display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={exp}
                    onChange={(e) => updateExpertise(index, e.target.value)}
                    placeholder={`전문성 ${index + 1}`}
                    className="prompt-input"
                    style={{ flex: 1 }}
                  />
                  {expertise.length > 1 && (
                    <button
                      onClick={() => removeExpertise(index)}
                      className="copy-button"
                      style={{ padding: '6px 12px' }}
                    >
                      삭제
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="form-group">
              <label htmlFor="perspective">관점 (선택사항)</label>
              <input
                id="perspective"
                type="text"
                value={perspective}
                onChange={(e) => setPerspective(e.target.value)}
                placeholder="예: 데이터 기반 접근"
                className="prompt-input"
              />
            </div>
          </div>
        )}

        {/* Optimize 설정 */}
        {method === 'optimize' && (
          <div className="detailed-options">
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={config.optimize?.clarity !== false}
                  onChange={(e) => setConfig({
                    ...config,
                    optimize: { ...config.optimize, clarity: e.target.checked, structure: config.optimize?.structure !== false, keywords: config.optimize?.keywords !== false }
                  })}
                  className="checkbox-input"
                />
                <span>명확성 개선</span>
              </label>
            </div>
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={config.optimize?.structure !== false}
                  onChange={(e) => setConfig({
                    ...config,
                    optimize: { ...config.optimize, structure: e.target.checked, clarity: config.optimize?.clarity !== false, keywords: config.optimize?.keywords !== false }
                  })}
                  className="checkbox-input"
                />
                <span>구조 개선</span>
              </label>
            </div>
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={config.optimize?.keywords !== false}
                  onChange={(e) => setConfig({
                    ...config,
                    optimize: { ...config.optimize, keywords: e.target.checked, clarity: config.optimize?.clarity !== false, structure: config.optimize?.structure !== false }
                  })}
                  className="checkbox-input"
                />
                <span>키워드 강조</span>
              </label>
            </div>
            <div className="form-group">
              <label htmlFor="length">목표 길이</label>
              <select
                id="length"
                value={config.optimize?.length || 'medium'}
                onChange={(e) => setConfig({
                  ...config,
                  optimize: {
                    ...config.optimize,
                    length: e.target.value as 'short' | 'medium' | 'long',
                    clarity: config.optimize?.clarity !== false,
                    structure: config.optimize?.structure !== false,
                    keywords: config.optimize?.keywords !== false,
                  }
                })}
                className="option-select"
              >
                <option value="short">짧게 (약 50자)</option>
                <option value="medium">보통 (약 150자)</option>
                <option value="long">길게 (약 300자)</option>
              </select>
            </div>
          </div>
        )}

        <button 
          onClick={handleGenerate} 
          className="generate-button"
          disabled={isGenerating}
          aria-busy={isGenerating}
        >
          {isGenerating ? '생성 중...' : '프롬프트 엔지니어링 생성하기'}
        </button>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
      {isGenerating && <LoadingSpinner message="프롬프트를 엔지니어링하고 있습니다..." />}

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
          {results.fullPrompt && (
            <ResultCard
              title="전체 프롬프트 (복사용)"
              content={results.fullPrompt}
              englishVersion={results.englishVersion}
              showEnglishToggle={true}
            />
          )}
          {results.optimization && (
            <div className="hashtags-card">
              <h3>최적화 결과</h3>
              <div style={{ marginBottom: '12px' }}>
                <strong>점수: {results.optimization.score}/100</strong>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong>원본:</strong>
                <pre style={{ marginTop: '8px', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{results.optimization.original}</pre>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong>최적화:</strong>
                <pre style={{ marginTop: '8px', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{results.optimization.optimized}</pre>
              </div>
              {results.optimization.improvements.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <strong>개선 사항:</strong>
                  <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                    {results.optimization.improvements.map((imp: string, i: number) => (
                      <li key={i}>{imp}</li>
                    ))}
                  </ul>
                </div>
              )}
              {results.optimization.suggestions.length > 0 && (
                <div>
                  <strong>제안:</strong>
                  <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                    {results.optimization.suggestions.map((sug: string, i: number) => (
                      <li key={i}>{sug}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div className="hashtags-card">
            <h3>해시태그</h3>
            <div className="hashtags-container">
              {results.hashtags.map((tag: string, index: number) => (
                <span key={index} className="hashtag">
                  {tag}
                </span>
              ))}
            </div>
            <button
              onClick={handleCopyHashtags}
              className={`copy-button ${hashtagsCopied ? 'copied' : ''}`}
            >
              {hashtagsCopied ? '✓ 복사됨' : '해시태그 복사'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default EngineeringPromptGenerator

