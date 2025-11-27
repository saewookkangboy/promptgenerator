// 프롬프트 엔지니어링 UI 컴포넌트

import { useState, useCallback, useEffect } from 'react'
import { templateAPI } from '../utils/api'
import TemplateVariableForm from './TemplateVariableForm'
import { EngineeringPromptOptions, EngineeringConfig } from '../types/engineering.types'
import { PromptResult } from '../types/prompt.types'
import { PromptGeneratorFactory } from '../generators/factory/PromptGeneratorFactory'
import { validateRequired } from '../utils/validation'
import { savePromptRecord } from '../utils/storage'
import { promptAPI } from '../utils/api'
import { showNotification } from '../utils/notifications'
import { translateTextMap, buildNativeEnglishFallback } from '../utils/translation'
import ResultCard from './ResultCard'
import ErrorMessage from './ErrorMessage'
import LoadingSpinner from './LoadingSpinner'
import './PromptGenerator.css'

type EngineeringMethod = 'cot' | 'few-shot' | 'role-based' | 'zero-shot' | 'optimize'

const ENGINEERING_METHODS: { value: EngineeringMethod; label: string; description: string }[] = [
  { value: 'zero-shot', label: 'ZERO-SHOT', description: '예시 없이 바로 프롬프트 실행' },
  { value: 'cot', label: 'COT', description: '단계별 사고 과정을 통해 답변 유도' },
  { value: 'few-shot', label: 'FEW-SHOT', description: '몇 가지 예시를 제공하여 패턴 학습' },
  { value: 'role-based', label: 'ROLE-BASED', description: '특정 역할을 부여하여 전문성 활용' },
  { value: 'optimize', label: 'OPTIMIZE', description: '프롬프트를 최적화하여 품질 향상' },
]

const ENGINEERING_WIZARD_STEPS = [
  { id: 1, label: '방법 & 역할' },
  { id: 2, label: '입력 & 예시' },
  { id: 3, label: '구조 & 제약' },
  { id: 4, label: '요약' },
]

function EngineeringPromptGenerator() {
  const [method, setMethod] = useState<EngineeringMethod>('zero-shot')
  const [basePrompt, setBasePrompt] = useState('')
  const [config, setConfig] = useState<EngineeringConfig>({})
  const [results, setResults] = useState<PromptResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [hashtagsCopied, setHashtagsCopied] = useState(false)
  const [useWizardMode, setUseWizardMode] = useState(true)
  const [wizardStep, setWizardStep] = useState(1)
  const wizardSteps = ENGINEERING_WIZARD_STEPS
  const wizardStepCount = wizardSteps.length
  
  // 템플릿 관련 상태
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [showVariableForm, setShowVariableForm] = useState(false)

  const canProceedToNext = () => {
    if (wizardStep === 1) {
      return method !== undefined
    }
    if (wizardStep === 2) {
      if (method === 'few-shot') {
        return fewShotExamples.some((ex) => ex.input.trim() && ex.output.trim())
      }
      if (method === 'cot') {
        return cotSteps.some((step) => step.trim())
      }
      return basePrompt.trim().length > 0
    }
    return basePrompt.trim().length > 0
  }

  const handleNextStep = () => {
    if (wizardStep < wizardStepCount) {
      if (!canProceedToNext()) return
      setWizardStep((prev) => prev + 1)
    } else {
      handleGenerate()
    }
  }

  const handlePrevStep = () => {
    if (wizardStep > 1) {
      setWizardStep((prev) => prev - 1)
    }
  }

  const resetWizard = (mode: boolean) => {
    setUseWizardMode(mode)
    setWizardStep(1)
  }

  // 템플릿 적용 핸들러
  const handleTemplateApply = useCallback(async (variables: Record<string, string>) => {
    if (!selectedTemplate) return

    try {
      // 템플릿 적용
      const result = await templateAPI.apply(selectedTemplate.id, variables)
      
      // 기본 프롬프트에 자동 채우기
      setBasePrompt(result.prompt)
      
      // 고급 모드로 전환
      setUseWizardMode(false)
      
      // 변수 입력 폼 닫기
      setShowVariableForm(false)
      setSelectedTemplate(null)
      
      // Analytics 기록
      try {
        await templateAPI.recordUsage(selectedTemplate.id, { variables })
      } catch (err) {
        console.warn('템플릿 사용 기록 실패:', err)
      }

      showNotification('템플릿이 적용되었습니다. 프롬프트를 확인하고 필요시 수정한 후 생성 버튼을 눌러주세요.', 'success')
      
      // 프롬프트 입력 필드로 스크롤
      setTimeout(() => {
        const promptInput = document.getElementById('base-prompt')
        if (promptInput) {
          promptInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
          promptInput.focus()
        }
      }, 300)
    } catch (error: any) {
      console.error('템플릿 적용 실패:', error)
      showNotification('템플릿 적용에 실패했습니다.', 'error')
    }
  }, [selectedTemplate])

  // 전역 이벤트로 템플릿 선택 처리 (탭에서 선택한 경우)
  useEffect(() => {
    const handleTemplateSelected = (event: CustomEvent) => {
      const { template, category, targetTab } = event.detail
      
      // 엔지니어링 카테고리 템플릿만 처리
      if (targetTab === 'engineering' && category === 'engineering') {
        setSelectedTemplate(template)
        setShowVariableForm(true)
      }
    }

    window.addEventListener('template-selected', handleTemplateSelected as EventListener)
    return () => {
      window.removeEventListener('template-selected', handleTemplateSelected as EventListener)
    }
  }, [])

  const renderWizardMethod = () => (
    <div className="wizard-panel">
      <div className="wizard-panel__header">
        <h4>엔지니어링 방법 선택</h4>
      </div>
      <div className="engineering-methods-container">
        {ENGINEERING_METHODS.map((methodOption) => (
          <button
            key={methodOption.value}
            className={`engineering-method-button ${method === methodOption.value ? 'active' : ''}`}
            onClick={() => setMethod(methodOption.value)}
          >
            <span className="engineering-method-label">{methodOption.label}</span>
            <span className="engineering-method-description">{methodOption.description}</span>
          </button>
        ))}
      </div>

      {method === 'role-based' && (
        <div className="wizard-preview-grid" style={{ marginTop: '16px' }}>
          <div className="quality-panel">
            <div className="form-group">
              <label>역할</label>
              <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="예: Senior Growth Marketer" />
            </div>
            <div className="form-group">
              <label>전문성</label>
              {expertise.map((item, idx) => (
                <input
                  key={idx}
                  value={item}
                  onChange={(e) => {
                    const next = [...expertise]
                    next[idx] = e.target.value
                    setExpertise(next)
                  }}
                  placeholder="예: A/B Testing, Product Analytics"
                  style={{ marginBottom: '8px' }}
                />
              ))}
              <button
                className="copy-button"
                style={{ padding: '4px 8px' }}
                onClick={() => setExpertise([...expertise, ''])}
              >
                + 전문성 추가
              </button>
            </div>
            <div className="form-group">
              <label>관점/톤</label>
              <input
                value={perspective}
                onChange={(e) => setPerspective(e.target.value)}
                placeholder="예: 고객 중심, 데이터 기반"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderWizardInputs = () => (
    <div className="wizard-panel">
      <div className="form-group">
        <label>기본 프롬프트</label>
        <textarea
          rows={4}
          value={basePrompt}
          onChange={(e) => setBasePrompt(e.target.value)}
          placeholder="기본 문제 정의 또는 요구사항을 입력하세요."
          className="prompt-input"
        />
      </div>

      {method === 'cot' && (
        <div className="wizard-preview-grid">
          <div className="quality-panel">
            <div className="form-group">
              <label>Chain of Thought 단계</label>
              {cotSteps.map((step, idx) => (
                <input
                  key={idx}
                  value={step}
                  onChange={(e) => {
                    const next = [...cotSteps]
                    next[idx] = e.target.value
                    setCotSteps(next)
                  }}
                  placeholder={`단계 ${idx + 1}`}
                  style={{ marginBottom: '8px' }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {method === 'few-shot' && (
        <div className="wizard-preview-grid">
          <div className="quality-panel">
            <div className="wizard-panel__header" style={{ justifyContent: 'space-between' }}>
              <h4>Few-shot 예시</h4>
              <button
                className="copy-button"
                style={{ padding: '4px 8px' }}
                onClick={() => setFewShotExamples([...fewShotExamples, { input: '', output: '', explanation: '' }])}
              >
                + 예시 추가
              </button>
            </div>
            {fewShotExamples.map((example, idx) => (
              <div key={idx} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: '12px', marginBottom: '12px' }}>
                <label>입력</label>
                <textarea
                  rows={2}
                  value={example.input}
                  onChange={(e) => {
                    const next = [...fewShotExamples]
                    next[idx] = { ...next[idx], input: e.target.value }
                    setFewShotExamples(next)
                  }}
                  className="prompt-input"
                />
                <label>출력</label>
                <textarea
                  rows={2}
                  value={example.output}
                  onChange={(e) => {
                    const next = [...fewShotExamples]
                    next[idx] = { ...next[idx], output: e.target.value }
                    setFewShotExamples(next)
                  }}
                  className="prompt-input"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderWizardStructure = () => (
    <div className="wizard-panel">
      {method === 'optimize' && (
        <div className="wizard-preview-grid">
          <div className="quality-panel">
            <h4>최적화 옵션</h4>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.optimize?.clarity ?? true}
                onChange={(e) => {
                  const currentOptimize: { clarity: boolean; structure: boolean; keywords: boolean; length?: 'short' | 'medium' | 'long' } = 
                    config.optimize || { clarity: true, structure: true, keywords: true }
                  setConfig({
                    ...config,
                    optimize: { 
                      ...currentOptimize,
                      clarity: e.target.checked 
                    },
                  })
                }}
              />
              명확성 유지
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.optimize?.structure ?? true}
                onChange={(e) => {
                  const currentOptimize: { clarity: boolean; structure: boolean; keywords: boolean; length?: 'short' | 'medium' | 'long' } = 
                    config.optimize || { clarity: true, structure: true, keywords: true }
                  setConfig({
                    ...config,
                    optimize: { 
                      ...currentOptimize,
                      structure: e.target.checked 
                    },
                  })
                }}
              />
              구조 보강
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.optimize?.keywords ?? true}
                onChange={(e) => {
                  const currentOptimize: { clarity: boolean; structure: boolean; keywords: boolean; length?: 'short' | 'medium' | 'long' } = 
                    config.optimize || { clarity: true, structure: true, keywords: true }
                  setConfig({
                    ...config,
                    optimize: { 
                      ...currentOptimize,
                      keywords: e.target.checked 
                    },
                  })
                }}
              />
              키워드 보호
            </label>
          </div>
        </div>
      )}

      <div className="form-group">
        <label>추가 제약 / Tone</label>
        <textarea
          rows={3}
          value={(config.optimize as any)?.tone || ''}
          onChange={(e) =>
            setConfig({
              ...config,
              optimize: { 
                clarity: config.optimize?.clarity ?? true,
                structure: config.optimize?.structure ?? true,
                keywords: config.optimize?.keywords ?? true,
                ...config.optimize,
                ...({ tone: e.target.value } as any)
              },
            })
          }
          placeholder="예: 논리적, 차분한 어조로 답변하도록 요청"
          className="prompt-input"
        />
      </div>
    </div>
  )

  const renderWizardSummary = () => (
    <div className="wizard-panel summary-panel">
      <div className="summary-panel__header">
        <div className="summary-panel__title-section">
          <h3 className="summary-panel__title">요약</h3>
          <div className="summary-panel__method-badge">
            {method.toUpperCase()}
          </div>
        </div>
        <p className="summary-panel__description">
          프롬프트 엔지니어링 설정을 확인하고 생성할 수 있습니다.
        </p>
      </div>
      
      <div className="summary-panel__content">
        <div className="summary-panel__section">
          <h4 className="summary-panel__section-title">핵심 정보</h4>
          <div className="summary-panel__info-grid">
            <div className="summary-panel__info-item">
              <span className="summary-panel__info-label">기본 프롬프트</span>
              <span className="summary-panel__info-value">{basePrompt.length}자</span>
            </div>
            <div className="summary-panel__info-item">
              <span className="summary-panel__info-label">Few-shot 예시</span>
              <span className="summary-panel__info-value">
                {fewShotExamples.filter((e) => e.input && e.output).length}개
              </span>
            </div>
            <div className="summary-panel__info-item">
              <span className="summary-panel__info-label">CoT 단계</span>
              <span className="summary-panel__info-value">
                {cotSteps.filter((s) => s.trim()).length}개
              </span>
            </div>
            {method === 'role-based' && role && (
              <div className="summary-panel__info-item">
                <span className="summary-panel__info-label">역할</span>
                <span className="summary-panel__info-value">{role}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

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

        // 디버깅: 생성된 결과 확인
        console.log('Generated result:', {
          hasMetaPrompt: !!generated.metaPrompt,
          hasContextPrompt: !!generated.contextPrompt,
          hasEnglishMetaPrompt: !!generated.englishMetaPrompt,
          hasEnglishContextPrompt: !!generated.englishContextPrompt,
          method: generated.method,
        })

        let enrichedResults = generated
        
        // PromptEngineer가 이미 영어 버전을 생성했는지 확인
        const hasEnglishVersions = generated.englishMetaPrompt && generated.englishContextPrompt
        
        // 영어 버전이 없거나 Gemini로 개선하고 싶은 경우에만 번역 시도
        if (!hasEnglishVersions) {
          try {
            const translationTargets: Record<string, string | undefined> = {}
            
            // 영어 버전이 없으면 번역 대상에 추가
            if (!generated.englishMetaPrompt && generated.metaPrompt) {
              translationTargets.englishMetaPrompt = generated.metaPrompt
            }
            
            if (!generated.englishContextPrompt && generated.contextPrompt) {
              translationTargets.englishContextPrompt = generated.contextPrompt
            }

            const primaryContent =
              (generated as any).fullPrompt ||
              (generated as any).prompt ||
              (generated as any).result ||
              ''

            if (typeof primaryContent === 'string' && primaryContent.trim().length > 0 && !generated.englishVersion) {
              translationTargets.englishVersion = primaryContent
            }

            // 번역 대상이 있는 경우에만 Gemini 호출
            if (Object.keys(translationTargets).length > 0) {
              const translations = await translateTextMap(translationTargets, {
                compress: true,
                context: 'ENGINEERING',
              })
              if (Object.keys(translations).length > 0) {
                enrichedResults = { ...generated, ...translations }
              }
            }
          } catch (translationError) {
            console.warn('Gemini translation failed:', translationError)
            // 영어 버전이 이미 있으면 경고만 표시, 없으면 에러 표시
            if (!hasEnglishVersions) {
              showNotification('프롬프트 엔지니어링 영문 번역에 실패했습니다. 기본 버전을 표시합니다.', 'warning')
            }
            const fallback = buildNativeEnglishFallback(generated)
            enrichedResults = { ...generated, ...fallback }
          }
        }

        // 결과 검증: metaPrompt와 contextPrompt가 반드시 있어야 함
        if (!enrichedResults.metaPrompt || !enrichedResults.contextPrompt) {
          console.error('Generated result missing metaPrompt or contextPrompt:', enrichedResults)
          setError('프롬프트 생성 중 오류가 발생했습니다. 메타 프롬프트 또는 컨텍스트 프롬프트가 생성되지 않았습니다.')
          setIsGenerating(false)
          return
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
      {showVariableForm && selectedTemplate && (
        <TemplateVariableForm
          template={selectedTemplate}
          onSubmit={handleTemplateApply}
          onCancel={() => {
            setShowVariableForm(false)
            setSelectedTemplate(null)
          }}
        />
      )}
      <div className="wizard-toggle">
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`wizard-toggle-button ${useWizardMode ? 'active' : ''}`}
            onClick={() => resetWizard(true)}
          >
            가이드 모드
          </button>
          <button
            className={`wizard-toggle-button ${!useWizardMode ? 'active' : ''}`}
            onClick={() => resetWizard(false)}
          >
            고급 모드
          </button>
        </div>
        <span style={{ fontSize: '0.85rem', color: '#666' }}>
          {useWizardMode ? '엔지니어링 설정을 단계별로 구성합니다.' : '모든 세부 옵션을 한 화면에서 편집합니다.'}
        </span>
      </div>

      {useWizardMode && (
        <div className="wizard-section">
          <div className="wizard-steps-indicator">
            {wizardSteps.map((step) => (
              <div
                key={step.id}
                className={`wizard-step ${wizardStep === step.id ? 'active' : wizardStep > step.id ? 'done' : ''}`}
              >
                <span className="wizard-step-number">{step.id}</span>
                <span>{step.label}</span>
              </div>
            ))}
          </div>

          {wizardStep === 1 && renderWizardMethod()}
          {wizardStep === 2 && renderWizardInputs()}
          {wizardStep === 3 && renderWizardStructure()}
          {wizardStep === 4 && renderWizardSummary()}

          <div className="wizard-navigation">
            <button className="wizard-nav-button" onClick={handlePrevStep} disabled={wizardStep === 1 || isGenerating}>
              이전 단계
            </button>
            <button
              className="wizard-nav-button primary"
              onClick={handleNextStep}
              disabled={isGenerating || (wizardStep < wizardStepCount && !canProceedToNext())}
            >
              {wizardStep === wizardStepCount ? (isGenerating ? '생성 중...' : '프롬프트 생성하기') : '다음 단계'}
            </button>
          </div>
        </div>
      )}

      {!useWizardMode && (
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
      )}

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
      {isGenerating && <LoadingSpinner message="프롬프트를 엔지니어링하고 있습니다..." />}

      {results && !isGenerating && (
        <div className="results-section">
          {results.metaPrompt ? (
            <ResultCard
              title="메타 프롬프트"
              content={results.metaPrompt}
              englishVersion={results.englishMetaPrompt}
              showEnglishToggle={true}
            />
          ) : (
            <div className="hashtags-card">
              <h3>메타 프롬프트</h3>
              <p style={{ color: '#c62828' }}>메타 프롬프트가 생성되지 않았습니다. 다시 시도해주세요.</p>
            </div>
          )}
          {results.contextPrompt ? (
            <ResultCard
              title="컨텍스트 프롬프트"
              content={results.contextPrompt}
              englishVersion={results.englishContextPrompt}
              showEnglishToggle={true}
            />
          ) : (
            <div className="hashtags-card">
              <h3>컨텍스트 프롬프트</h3>
              <p style={{ color: '#c62828' }}>컨텍스트 프롬프트가 생성되지 않았습니다. 다시 시도해주세요.</p>
            </div>
          )}
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

