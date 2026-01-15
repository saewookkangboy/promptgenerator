import { useState, useCallback, useMemo, useEffect } from 'react'
import { ContentType, DetailedOptions } from '../types'
import { ToneStyle } from '../types/prompt.types'
import { generatePrompts } from '../utils/promptGenerator'
import { validatePrompt } from '../utils/validation'
import { savePromptRecord } from '../utils/storage'
import { promptAPI, guideAPI, templateAPI, keywordAPI } from '../utils/api'
import { upsertGuide } from '../utils/prompt-guide-storage'
import { showNotification } from '../utils/notifications'
import { hasPromptSaveAuth, reportPromptSaveFailure } from '../utils/promptSaveReporter'
import { PromptGuide, ModelName } from '../types/prompt-guide.types'
import { MODEL_OPTIONS, getCategoryByModel } from '../config/model-options'
import { evaluateQuality, QualityReport } from '../utils/qualityRules'
import { useLanguage } from '../contexts/LanguageContext'
// import { applyTemplate } from '../utils/templateUtils' // 템플릿 적용은 서버에서 처리
import ResultCard from './ResultCard'
import StructuredPromptCard from './StructuredPromptCard'
import ErrorMessage from './ErrorMessage'
import LoadingSpinner from './LoadingSpinner'
import TemplateVariableForm from './TemplateVariableForm'
import './PromptGenerator.css'
import './StructuredPromptCard.css'

const normalizeGuideInsight = (guide: any): PromptGuide => ({
  id: guide.id,
  modelName: guide.modelName,
  category: (guide.category || 'llm').toLowerCase() as any,
  version: guide.version ?? '1.0.0',
  title: guide.title || `${guide.modelName} 프롬프트 가이드`,
  description: guide.summary || guide.title || '',
  summary: guide.summary,
  lastUpdated: Date.now(),
  source: '',
  metadata: {
    collectedAt: Date.now(),
    collectedBy: 'api',
    confidence: guide.confidence ?? 0.5,
  },
  content: {
    bestPractices: guide.bestPractices || [],
    tips: guide.tips || [],
  },
})

const FALLBACK_MODEL = (MODEL_OPTIONS[0]?.value || 'gpt-4.1') as ModelName

function PromptGenerator() {
  const { t } = useLanguage()
  
  const [userPrompt, setUserPrompt] = useState('')
  const [contentType, setContentType] = useState<ContentType>('blog')
  const [showDetailedOptions, setShowDetailedOptions] = useState(false)
  const [detailedOptions, setDetailedOptions] = useState<DetailedOptions>({
    age: '',
    gender: '',
    occupation: '',
    conversational: false,
    toneStyles: [],
    goal: 'awareness',
  })
  const [results, setResults] = useState<ReturnType<typeof generatePrompts> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [hashtagsCopied, setHashtagsCopied] = useState(false)
  const [useWizardMode, setUseWizardMode] = useState(true)
  const [wizardStep, setWizardStep] = useState(1)
  // 품질 평가 패널 제거로 인한 상태 비활성화
  const [, setQualityReport] = useState<QualityReport | null>(null)
  
  // 번역된 옵션들
  const CONTENT_TYPES = useMemo(() => [
    { value: 'blog' as ContentType, label: t('prompt.contentType.blog') },
    { value: 'linkedin' as ContentType, label: t('prompt.contentType.linkedin') },
    { value: 'facebook' as ContentType, label: t('prompt.contentType.facebook') },
    { value: 'instagram' as ContentType, label: t('prompt.contentType.instagram') },
    { value: 'youtube' as ContentType, label: t('prompt.contentType.youtube') },
    { value: 'general' as ContentType, label: t('prompt.contentType.general') },
  ], [t])
  
  const AGE_OPTIONS = useMemo(() => [
    { value: '', label: t('prompt.age.none') },
    { value: '10대', label: t('prompt.age.10s') },
    { value: '20대', label: t('prompt.age.20s') },
    { value: '30대', label: t('prompt.age.30s') },
    { value: '40대', label: t('prompt.age.40s') },
    { value: '50대', label: t('prompt.age.50s') },
    { value: '60대 이상', label: t('prompt.age.60plus') },
  ], [t])
  
  const GENDER_OPTIONS = useMemo(() => [
    { value: '', label: t('common.select') },
    { value: '남성', label: t('prompt.gender.male') },
    { value: '여성', label: t('prompt.gender.female') },
    { value: '무관', label: t('prompt.gender.any') },
  ], [t])
  
  const OCCUPATION_OPTIONS = useMemo(() => [
    { value: '', label: t('prompt.age.none') },
    { value: '학생', label: t('prompt.occupation.student') },
    { value: '직장인', label: t('prompt.occupation.worker') },
    { value: '개발자/프로그래머', label: t('prompt.occupation.developer') },
    { value: '디자이너', label: t('prompt.occupation.designer') },
    { value: '마케터', label: t('prompt.occupation.marketer') },
    { value: '기획자', label: t('prompt.occupation.planner') },
    { value: '경영진/CEO', label: t('prompt.occupation.ceo') },
    { value: '자영업자', label: t('prompt.occupation.selfEmployed') },
    { value: '프리랜서', label: t('prompt.occupation.freelancer') },
    { value: '전문직', label: t('prompt.occupation.professional') },
    { value: '기타', label: t('prompt.occupation.other') },
  ], [t])
  
  const TONE_STYLE_OPTIONS = useMemo((): { value: ToneStyle; label: string; description: string }[] => [
    { value: 'conversational', label: t('prompt.tone.conversational'), description: t('prompt.tone.conversationalDesc') },
    { value: 'formal', label: t('prompt.tone.formal'), description: t('prompt.tone.formalDesc') },
    { value: 'friendly', label: t('prompt.tone.friendly'), description: t('prompt.tone.friendlyDesc') },
    { value: 'professional', label: t('prompt.tone.professional'), description: t('prompt.tone.professionalDesc') },
    { value: 'casual', label: t('prompt.tone.casual'), description: t('prompt.tone.casualDesc') },
    { value: 'polite', label: t('prompt.tone.polite'), description: t('prompt.tone.politeDesc') },
    { value: 'concise', label: t('prompt.tone.concise'), description: t('prompt.tone.conciseDesc') },
    { value: 'explanatory', label: t('prompt.tone.explanatory'), description: t('prompt.tone.explanatoryDesc') },
  ], [t])
  
  const GOAL_OPTIONS = useMemo(() => [
    { value: 'awareness', label: t('prompt.goal.awareness') },
    { value: 'conversion', label: t('prompt.goal.conversion') },
    { value: 'engagement', label: t('prompt.goal.engagement') },
    { value: 'education', label: t('prompt.goal.education') },
    { value: 'lead-generation', label: t('prompt.goal.leadGeneration') },
    { value: 'retention', label: t('prompt.goal.retention') },
    { value: 'product-promotion', label: t('prompt.goal.productPromotion') },
    { value: 'traffic', label: t('prompt.goal.traffic') },
    { value: 'authority', label: t('prompt.goal.authority') },
    { value: 'customer-support', label: t('prompt.goal.customerSupport') },
    { value: 'event-promotion', label: t('prompt.goal.eventPromotion') },
    { value: 'news-announcement', label: t('prompt.goal.newsAnnouncement') },
    { value: 'community-building', label: t('prompt.goal.communityBuilding') },
    { value: 'thought-leadership', label: t('prompt.goal.thoughtLeadership') },
  ], [t])
  
  const GUIDELINE_CHIPS = useMemo((): Record<ContentType, string[]> => ({
    blog: [t('prompt.guideline.blog'), t('prompt.guideline.blog2'), t('prompt.guideline.blog3')],
    linkedin: [t('prompt.guideline.linkedin'), t('prompt.guideline.linkedin2'), t('prompt.guideline.linkedin3')],
    facebook: [t('prompt.guideline.facebook'), t('prompt.guideline.facebook2'), t('prompt.guideline.facebook3')],
    instagram: [t('prompt.guideline.instagram'), t('prompt.guideline.instagram2'), t('prompt.guideline.instagram3')],
    youtube: [t('prompt.guideline.youtube'), t('prompt.guideline.youtube2'), t('prompt.guideline.youtube3')],
    general: [t('prompt.guideline.general'), t('prompt.guideline.general2'), t('prompt.guideline.general3')],
  }), [t])
  
  const WIZARD_STEPS = useMemo(() => [
    { id: 1, label: t('prompt.wizard.step1') },
    { id: 2, label: t('prompt.wizard.step2') },
    { id: 3, label: t('prompt.wizard.step3') },
    { id: 4, label: t('prompt.wizard.step4') },
  ], [t])
  const [guideInsight, setGuideInsight] = useState<PromptGuide | null>(null)
  // 모델 선택 UI는 Admin 템플릿 관리로 이동했으므로 기본값만 유지
  const [targetModel] = useState<ModelName>(FALLBACK_MODEL)
  // 템플릿 관련 상태 (탭에서 템플릿 선택 시 사용)
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [showVariableForm, setShowVariableForm] = useState(false)

  const buildGenerationOptions = useCallback((): DetailedOptions => {
    return {
      age: detailedOptions.age || undefined,
      gender: detailedOptions.gender || undefined,
      occupation: detailedOptions.occupation || undefined,
      conversational:
        detailedOptions.conversational ||
        (detailedOptions.toneStyles?.includes('conversational') ?? false),
      toneStyles:
        detailedOptions.toneStyles && detailedOptions.toneStyles.length > 0
          ? detailedOptions.toneStyles
          : undefined,
      goal: detailedOptions.goal || undefined,
    }
  }, [detailedOptions])

  const fetchGuides = useCallback(async () => {
    setGuideInsight(null)
    try {
      const response = await guideAPI.getPublicLatest({
        category: getCategoryByModel(targetModel),
        limit: 10,
      })
      const normalizedList = (response.guides || []).map(normalizeGuideInsight)
      const prioritized =
        normalizedList.find((guide) => guide.modelName === targetModel) || normalizedList[0] || null
      if (prioritized) {
        setGuideInsight(prioritized)
        try {
          upsertGuide(prioritized)
        } catch (error) {
          console.warn('[PromptGenerator] 로컬 가이드 저장 실패:', error)
        }
      }
    } catch (error) {
      console.warn('가이드 추천 정보를 불러오지 못했습니다:', error)
    }
  }, [targetModel])

  useEffect(() => {
    fetchGuides()
  }, [fetchGuides])

  const handleGenerate = useCallback(() => {
    // 입력 검증
    const validation = validatePrompt(userPrompt)
    if (!validation.isValid) {
      setError(validation.error || t('prompt.error.required'))
      return
    }

    setError(null)
    setIsGenerating(true)

    // 비동기 처리 시뮬레이션 (실제로는 즉시 생성되지만 UX를 위해)
    setTimeout(async () => {
      try {
        const options = buildGenerationOptions()

        const appliedGuideContext = guideInsight
          ? {
              guideId: guideInsight.id,
              modelName: guideInsight.modelName,
              title: guideInsight.title,
              summary: guideInsight.summary,
              bestPractices: guideInsight.content?.bestPractices,
              tips: guideInsight.content?.tips,
              confidence: guideInsight.metadata?.confidence ?? guideInsight.metadata?.confidence ?? 0.5,
            }
          : undefined

        const generated = generatePrompts(userPrompt, contentType, options, appliedGuideContext)

        const enrichedResults = generated

        // AI 키워드 추출 (비동기, 실패해도 계속 진행)
        try {
          console.log('[PromptGenerator] 키워드 추출 시작...')
          const keywordResult = await keywordAPI.extract(
            enrichedResults.metaPrompt,
            enrichedResults.contextPrompt
          )
          console.log('[PromptGenerator] 키워드 추출 응답:', keywordResult)
          if (keywordResult.keywords && keywordResult.keywords.length > 0) {
            enrichedResults.hashtagKeywords = keywordResult.keywords
            console.log('[PromptGenerator] AI 키워드 추출 완료:', keywordResult.keywords.length, '개')
          } else {
            console.warn('[PromptGenerator] 키워드가 비어있습니다. 기본 해시태그 사용')
          }
        } catch (keywordError: any) {
          console.error('[PromptGenerator] 키워드 추출 실패:', keywordError)
          console.error('[PromptGenerator] 에러 상세:', keywordError?.message, keywordError?.stack)
          // 키워드 추출 실패해도 계속 진행 (기본 해시태그 사용)
        }

        setResults(enrichedResults)
        setQualityReport(evaluateQuality(enrichedResults, options))
        
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
            toneStyles: detailedOptions.toneStyles,
            goal: detailedOptions.goal,
            targetModel,
            appliedGuideId: enrichedResults.appliedGuide?.guideId,
          },
        })

        // 서버에 저장 시도 (로그인 없이도 시도)
        if (!hasPromptSaveAuth()) {
          await reportPromptSaveFailure(
            'TEXT',
            'unauthenticated',
            { inputPreview: userPrompt.slice(0, 120) },
            '로그인 후에만 프롬프트가 서버 DB에 저장됩니다. 로그인 후 다시 시도해주세요.'
          )
        } else {
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
                toneStyles: detailedOptions.toneStyles,
                goal: detailedOptions.goal,
                targetModel,
                appliedGuideId: enrichedResults.appliedGuide?.guideId,
                contextPrompt: generated.contextPrompt,
                hashtags: generated.hashtags,
              },
            })
          } catch (serverError: any) {
            console.warn('서버 저장 실패:', serverError)
            await reportPromptSaveFailure('TEXT', serverError?.message || 'server_error', {
              inputPreview: userPrompt.slice(0, 120),
            })
          }
        }
      } catch (err) {
        setError(t('prompt.error.generation'))
        showNotification(t('prompt.error.generation'), 'error')
      } finally {
        setIsGenerating(false)
      }
    }, 300)
  }, [userPrompt, contentType, detailedOptions, buildGenerationOptions, guideInsight])

  const handleDismissError = useCallback(() => {
    setError(null)
  }, [])

  const isFormValid = useMemo(() => {
    return userPrompt.trim().length >= 3 && !!detailedOptions.goal
  }, [userPrompt, detailedOptions.goal])

  const previewResult = useMemo(() => {
    if (!isFormValid) return null
    try {
      return generatePrompts(
        userPrompt,
        contentType,
        buildGenerationOptions(),
        guideInsight
          ? {
              guideId: guideInsight.id,
              modelName: guideInsight.modelName,
              title: guideInsight.title,
              summary: guideInsight.summary,
              bestPractices: guideInsight.content?.bestPractices,
              tips: guideInsight.content?.tips,
              confidence: guideInsight.metadata?.confidence ?? guideInsight.metadata?.confidence ?? 0.5,
            }
          : undefined,
      )
    } catch (err) {
      console.warn('Preview generation failed', err)
      return null
    }
  }, [isFormValid, userPrompt, contentType, buildGenerationOptions, guideInsight])

  const guidelineChips = GUIDELINE_CHIPS[contentType] || []
  const tokenUsage = userPrompt.trim().length
  const tokenLimit = 1200
  const tokenRatio = Math.min(tokenUsage / tokenLimit, 1)

  const handleCopyHashtags = useCallback(async () => {
    let hashtagsText = ''
    
    if (results?.hashtagKeywords && results.hashtagKeywords.length > 0) {
      // AI 추출 키워드 사용
      hashtagsText = results.hashtagKeywords.map(k => `#${k.keyword}`).join(' ')
    } else if (results?.hashtags?.length) {
      // 기본 해시태그 사용
      hashtagsText = results.hashtags.join(' ')
    }
    
    if (!hashtagsText) return
    
    try {
      await navigator.clipboard.writeText(hashtagsText)
      setHashtagsCopied(true)
      setTimeout(() => setHashtagsCopied(false), 2000)
    } catch (copyError) {
      console.error('Failed to copy hashtags', copyError)
      showNotification('해시태그 복사에 실패했습니다. 클립보드 권한을 확인해주세요.', 'error')
    }
  }, [results?.hashtags, results?.hashtagKeywords])

  // 템플릿 선택 핸들러는 전역 이벤트로만 처리 (탭에서 선택)

  const handleTemplateApply = useCallback(async (variables: Record<string, string>) => {
    if (!selectedTemplate) {
      console.error('[PromptGenerator] 템플릿이 선택되지 않았습니다')
      return
    }

    console.log('[PromptGenerator] 템플릿 적용 시작:', {
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.name,
      variables: Object.keys(variables)
    })

    try {
      // 템플릿 적용
      const result = await templateAPI.apply(selectedTemplate.id, variables)
      
      console.log('[PromptGenerator] 템플릿 적용 성공:', {
        promptLength: result.prompt?.length || 0,
        promptPreview: result.prompt?.substring(0, 100)
      })
      
      // 사용자 프롬프트에 자동 채우기
      setUserPrompt(result.prompt || '')
      
      // 고급 모드로 전환
      setUseWizardMode(false)
      console.log('[PromptGenerator] 고급 모드로 전환됨')
      
      // 변수 입력 폼 닫기
      setShowVariableForm(false)
      setSelectedTemplate(null)
      
      // Analytics 기록
      try {
        await templateAPI.recordUsage(selectedTemplate.id, { variables })
      } catch (err) {
        console.warn('[PromptGenerator] 템플릿 사용 기록 실패:', err)
      }

      showNotification('템플릿이 적용되었습니다. 프롬프트를 확인하고 필요시 수정한 후 생성 버튼을 눌러주세요.', 'success')
      
      // 프롬프트 입력 필드로 스크롤 (고급 모드로 전환된 후)
      setTimeout(() => {
        const promptInput = document.getElementById('user-prompt')
        if (promptInput) {
          console.log('[PromptGenerator] 프롬프트 입력 필드로 스크롤')
          promptInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
          promptInput.focus()
        } else {
          console.warn('[PromptGenerator] user-prompt 필드를 찾을 수 없습니다')
        }
      }, 500)
    } catch (error: any) {
      console.error('[PromptGenerator] 템플릿 적용 실패:', error)
      console.error('[PromptGenerator] 에러 상세:', {
        message: error?.message,
        stack: error?.stack,
        response: error?.response
      })
      showNotification(error?.message || '템플릿 적용에 실패했습니다.', 'error')
    }
  }, [selectedTemplate])

  // 전역 이벤트로 템플릿 선택 처리 (탭에서 선택한 경우)
  useEffect(() => {
    const handleTemplateSelected = (event: CustomEvent) => {
      const { template, category, targetTab } = event.detail
      
      console.log('[PromptGenerator] 템플릿 선택 이벤트 수신:', {
        templateName: template?.name,
        category,
        targetTab
      })
      
      // 텍스트 카테고리 템플릿만 처리 (현재 컴포넌트는 텍스트용)
      if (targetTab === 'text' && category === 'text') {
        console.log('[PromptGenerator] 템플릿 적용 시작 - 변수 입력 폼 표시')
        setSelectedTemplate(template)
        setShowVariableForm(true)
      } else {
        console.log('[PromptGenerator] 템플릿 무시됨 (다른 카테고리):', { targetTab, category })
      }
    }

    window.addEventListener('template-selected', handleTemplateSelected as EventListener)
    return () => {
      window.removeEventListener('template-selected', handleTemplateSelected as EventListener)
    }
  }, [])

  const renderContentTypeSelector = () => (
    <div className="form-group">
      <label htmlFor="content-type">{t('prompt.contentType.label')}</label>
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
  )

  const renderPromptTextarea = () => (
    <div className="form-group">
      <div style={{ marginBottom: '8px' }}>
        <label htmlFor="user-prompt">{t('prompt.input.label')}</label>
      </div>
      <textarea
        id="user-prompt"
        value={userPrompt}
        onChange={(e) => setUserPrompt(e.target.value)}
        placeholder={t('prompt.input.placeholder')}
        className="prompt-input"
        rows={5}
      />
    </div>
  )

  const renderGoalSelector = () => (
    <div className="form-group">
      <label htmlFor="content-goal">{t('prompt.goal.label')}</label>
      <select
        id="content-goal"
        value={detailedOptions.goal || 'awareness'}
        onChange={(e) =>
          setDetailedOptions({
            ...detailedOptions,
            goal: e.target.value,
          })
        }
        className="content-type-select"
      >
        {GOAL_OPTIONS.map((goalOption) => (
          <option key={goalOption.value} value={goalOption.value}>
            {goalOption.label}
          </option>
        ))}
      </select>
      <p className="helper-text">
        {t('prompt.goal.hint')}
      </p>
    </div>
  )

  const renderDetailedOptionsGrid = () => (
    <div className="detailed-options">
      <div className="options-grid">
        {renderGoalSelector()}
        <div className="form-group">
          <label htmlFor="age">{t('prompt.age.label')}</label>
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
          <label htmlFor="gender">{t('prompt.gender.label')}</label>
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
          <label htmlFor="occupation">{t('prompt.occupation.label')}</label>
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

        <div className="form-group">
          <label style={{ marginBottom: '12px', display: 'block', fontWeight: '500' }}>{t('prompt.tone.label')}</label>
          <div className="tone-styles-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '12px',
            marginTop: '8px'
          }}>
            {TONE_STYLE_OPTIONS.map((tone) => {
              const isSelected = detailedOptions.toneStyles?.includes(tone.value) || 
                (tone.value === 'conversational' && detailedOptions.conversational)
              return (
                <label
                  key={tone.value}
                  className="tone-style-option"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '12px',
                    border: '1px solid #000',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#000' : '#fff',
                    color: isSelected ? '#fff' : '#000',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#f5f5f5'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#fff'
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        const currentStyles = detailedOptions.toneStyles || []
                        
                        if (e.target.checked) {
                          // 선택됨: 추가
                          if (tone.value === 'conversational') {
                            // 대화체는 하위 호환성을 위해 conversational도 true로 설정
                            setDetailedOptions({
                              ...detailedOptions,
                              conversational: true,
                              toneStyles: [...currentStyles, tone.value],
                            })
                          } else {
                            setDetailedOptions({
                              ...detailedOptions,
                              toneStyles: [...currentStyles, tone.value],
                            })
                          }
                        } else {
                          // 선택 해제됨: 제거
                          if (tone.value === 'conversational') {
                            setDetailedOptions({
                              ...detailedOptions,
                              conversational: false,
                              toneStyles: currentStyles.filter(s => s !== tone.value),
                            })
                          } else {
                            setDetailedOptions({
                              ...detailedOptions,
                              toneStyles: currentStyles.filter(s => s !== tone.value),
                            })
                          }
                        }
                      }}
                      style={{ margin: 0, cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: '500', fontSize: '14px' }}>{tone.label}</span>
                  </div>
                  <span style={{ fontSize: '12px', opacity: 0.8, marginLeft: '24px' }}>
                    {tone.description}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )

  const handleNextStep = () => {
    if (wizardStep === WIZARD_STEPS.length) return
    setWizardStep((prev) => prev + 1)
  }

  const handlePrevStep = () => {
    if (wizardStep === 1) return
    setWizardStep((prev) => prev - 1)
  }

  return (
    <div className="prompt-generator">
      {error && <ErrorMessage message={error} onDismiss={handleDismissError} />}

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
            onClick={() => setUseWizardMode(true)}
          >
            {t('prompt.mode.guide')}
          </button>
          <button
            className={`wizard-toggle-button ${!useWizardMode ? 'active' : ''}`}
            onClick={() => setUseWizardMode(false)}
          >
            {t('prompt.mode.advanced')}
          </button>
        </div>
        <span style={{ fontSize: '0.85rem', color: '#666' }}>
          {useWizardMode 
            ? t('prompt.mode.guideDesc')
            : t('prompt.mode.advancedDesc')}
        </span>
      </div>

      {useWizardMode ? (
        <div className="wizard-section">
          <div className="wizard-steps-indicator">
            {WIZARD_STEPS.map((step) => (
              <div
                key={step.id}
                className={`wizard-step ${wizardStep === step.id ? 'active' : wizardStep > step.id ? 'done' : ''}`}
              >
                <span className="wizard-step-number">{step.id}</span>
                <span>{step.label}</span>
              </div>
            ))}
          </div>

          {wizardStep === 1 && (
            <div className="wizard-panel">
              <p className="wizard-panel__hint">
                {t('prompt.wizard.hint1')}
              </p>
              <div className="wizard-dual-grid">
                {renderContentTypeSelector()}
                {renderGoalSelector()}
              </div>
              <div className="wizard-panel__summary">
                <p>{t('prompt.wizard.summary')}</p>
                <ul>
                  <li>{t('prompt.wizard.summaryItem')}</li>
                </ul>
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="wizard-panel">
              <p className="wizard-panel__hint">
                {t('prompt.wizard.hint2')}
              </p>
              {renderDetailedOptionsGrid()}
            </div>
          )}

          {wizardStep === 3 && (
            <div className="wizard-panel">
              <p className="wizard-panel__hint">
                {t('prompt.wizard.hint3')}
              </p>
              {renderPromptTextarea()}
              <div className="guideline-chips">
                {guidelineChips.map((chip) => (
                  <span key={chip} className="guideline-chip">
                    {chip}
                  </span>
                ))}
              </div>
              <div className="token-meter">
                <div className="token-meter__label">
                  <span>{t('prompt.input.length')}</span>
                  <span>
                    {tokenUsage} / {tokenLimit} {t('prompt.input.chars')}
                  </span>
                </div>
                <div className="token-meter__bar">
                  <div
                    className="token-meter__bar-fill"
                    style={{ width: `${tokenRatio * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {wizardStep === 4 && (
            <div className="wizard-panel">
              <p className="wizard-panel__hint">
                {t('prompt.wizard.hint4')}
              </p>
              {previewResult ? (
                <div className="wizard-preview-grid">
                  {previewResult.metaTemplate && (
                    <StructuredPromptCard
                      title={t('prompt.result.previewMeta')}
                      template={previewResult.metaTemplate}
                    />
                  )}
                  {previewResult.contextTemplate && (
                    <StructuredPromptCard
                      title={t('prompt.result.previewContext')}
                      template={previewResult.contextTemplate}
                    />
                  )}
                </div>
              ) : (
                <p className="helper-text">{t('prompt.wizard.previewEmpty')}</p>
              )}
            </div>
          )}

          <div className="wizard-navigation">
            <button
              className="wizard-nav-button"
              onClick={handlePrevStep}
              disabled={wizardStep === 1}
            >
              {t('prompt.wizard.prev')}
            </button>
            <button
              className="wizard-nav-button primary"
              onClick={wizardStep === WIZARD_STEPS.length ? handleGenerate : handleNextStep}
              disabled={wizardStep === WIZARD_STEPS.length ? (!isFormValid || isGenerating) : false}
            >
              {wizardStep === WIZARD_STEPS.length
                ? (isGenerating ? t('prompt.wizard.generating') : t('prompt.wizard.generate'))
                : t('prompt.wizard.next')}
            </button>
          </div>
        </div>
      ) : (
        <div className="input-section">
          {renderContentTypeSelector()}
          {renderPromptTextarea()}

          <div className="detailed-options-section">
            <button
              type="button"
              onClick={() => setShowDetailedOptions(!showDetailedOptions)}
              className="toggle-options-button"
            >
              {showDetailedOptions ? '▼' : '▶'} {t('prompt.details.toggle')} {showDetailedOptions ? t('prompt.details.collapse') : t('prompt.details.expand')}
            </button>

            {showDetailedOptions && renderDetailedOptionsGrid()}
          </div>

          <button 
            onClick={handleGenerate} 
            className="generate-button"
            disabled={!isFormValid || isGenerating}
            aria-busy={isGenerating}
          >
            {isGenerating ? t('prompt.wizard.generating') : t('prompt.wizard.generate')}
          </button>
        </div>
      )}

      {isGenerating && <LoadingSpinner message={t('prompt.loading')} />}

      {results && !isGenerating && (
        <div className="results-section">
          {results.appliedGuide && (
            <div className="guide-insight-card">
              <div className="guide-insight-header">
                <div>
                  <p className="guide-insight-label">{t('prompt.result.guideApplied')}</p>
                  <h3>{results.appliedGuide.title || results.appliedGuide.modelName}</h3>
                </div>
                <span className="guide-insight-confidence">
                  {t('prompt.result.confidence')} {Math.round((results.appliedGuide.confidence ?? 0.5) * 100)}%
                </span>
              </div>
              {results.appliedGuide.bestPractices?.length ? (
                <ul className="guide-insight-list">
                  {results.appliedGuide.bestPractices.slice(0, 3).map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="guide-insight-summary">
                  {results.appliedGuide.summary || t('prompt.result.guideDefault')}
                </p>
              )}
            </div>
          )}
          {results.metaTemplate && (
            <StructuredPromptCard
              title={t('prompt.result.metaTemplate')}
              template={results.metaTemplate}
            />
          )}
          <ResultCard
            title={t('prompt.result.metaPrompt')}
            content={results.metaPrompt}
          />
          {results.contextTemplate && (
            <StructuredPromptCard
              title={t('prompt.result.contextTemplate')}
              template={results.contextTemplate}
            />
          )}
          <ResultCard
            title={t('prompt.result.contextPrompt')}
            content={results.contextPrompt}
          />
          <div className="hashtags-card">
            <h3>{t('prompt.result.hashtags')}</h3>
            <div className="hashtags-container">
              {results.hashtagKeywords && results.hashtagKeywords.length > 0 ? (
                // AI 추출 키워드 표시 (중요도별 색상)
                results.hashtagKeywords.map((keyword, index) => (
                  <span
                    key={index}
                    className={`hashtag hashtag-${keyword.importance}`}
                    title={`${keyword.keyword} (${keyword.pos}, 중요도: ${keyword.importance})`}
                  >
                    #{keyword.keyword}
                  </span>
                ))
              ) : (
                // 기본 해시태그 (레거시 호환성)
                results.hashtags.map((tag, index) => (
                  <span key={index} className="hashtag hashtag-low">
                    {tag}
                  </span>
                ))
              )}
            </div>
            <button
              onClick={handleCopyHashtags}
              className={`copy-button ${hashtagsCopied ? 'copied' : ''}`}
            >
              {hashtagsCopied ? t('prompt.result.hashtagsCopied') : t('prompt.result.hashtagsCopy')}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

export default PromptGenerator
