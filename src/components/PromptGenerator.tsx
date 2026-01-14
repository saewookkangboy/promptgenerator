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
import { translateTextMap, buildNativeEnglishFallback } from '../utils/translation'
import { evaluateQuality, QualityReport } from '../utils/qualityRules'
// import { applyTemplate } from '../utils/templateUtils' // 템플릿 적용은 서버에서 처리
import ResultCard from './ResultCard'
import StructuredPromptCard from './StructuredPromptCard'
import ErrorMessage from './ErrorMessage'
import LoadingSpinner from './LoadingSpinner'
import TemplateVariableForm from './TemplateVariableForm'
import './PromptGenerator.css'
import './StructuredPromptCard.css'

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: 'blog', label: '블로그 콘텐츠' },
  { value: 'linkedin', label: '링크드인 뉴스피드' },
  { value: 'facebook', label: '페이스북 뉴스피드' },
  { value: 'instagram', label: '인스타그램 뉴스피드' },
  { value: 'youtube', label: '유튜브 영상' },
  { value: 'general', label: '일반 텍스트' },
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

const TONE_STYLE_OPTIONS: { value: ToneStyle; label: string; description: string }[] = [
  { value: 'conversational', label: '대화체', description: '구어체, 친근한 대화 형식' },
  { value: 'formal', label: '격식체', description: '정중하고 격식 있는 표현' },
  { value: 'friendly', label: '친근한 말투', description: '따뜻하고 친근한 톤' },
  { value: 'professional', label: '전문적인 말투', description: '전문적이고 신뢰감 있는 표현' },
  { value: 'casual', label: '캐주얼한 말투', description: '편안하고 부담 없는 표현' },
  { value: 'polite', label: '정중한 말투', description: '예의 바르고 정중한 표현' },
  { value: 'concise', label: '간결한 말투', description: '명확하고 간결한 표현' },
  { value: 'explanatory', label: '설명적인 말투', description: '상세하고 이해하기 쉬운 설명' },
]

const GOAL_OPTIONS = [
  { value: 'awareness', label: '브랜드 인지도 강화' },
  { value: 'conversion', label: '전환/구매 유도' },
  { value: 'engagement', label: '참여/소통 활성화' },
  { value: 'education', label: '교육/인사이트 제공' },
  { value: 'lead-generation', label: '리드 생성/수집' },
  { value: 'retention', label: '고객 유지/리텐션' },
  { value: 'product-promotion', label: '제품/서비스 홍보' },
  { value: 'traffic', label: '웹사이트 트래픽 유도' },
  { value: 'authority', label: '권위/전문성 구축' },
  { value: 'customer-support', label: '고객 지원/FAQ' },
  { value: 'event-promotion', label: '이벤트/프로모션 안내' },
  { value: 'news-announcement', label: '뉴스/공지사항' },
  { value: 'community-building', label: '커뮤니티 구축' },
  { value: 'thought-leadership', label: '사고 리더십 발휘' },
]

const GUIDELINE_CHIPS: Record<ContentType, string[]> = {
  blog: ['SEO 키워드', '질문 기반 서술', 'CTA 포함'],
  linkedin: ['전문 인사이트', '네트워킹 유도', '전문 톤'],
  facebook: ['친근한 톤', '질문 던지기', '공유 유도'],
  instagram: ['감성적 표현', '해시태그 최적화', 'CTA'],
  youtube: ['검색 키워드', '훅 문장', '타임스탬프'],
  general: ['의도 명확화', '자연어 유지', '핵심 메시지'],
}

const WIZARD_STEPS = [
  { id: 1, label: '목표 & 채널' },
  { id: 2, label: '타겟 & 톤' },
  { id: 3, label: '자연어 프롬프트' },
  { id: 4, label: '구조화 프리뷰' },
]

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
      setError(validation.error || '프롬프트를 입력해주세요.')
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

        let enrichedResults = generated
        try {
          const translationPayload: Record<string, string> = {
            englishMetaPrompt: generated.metaPrompt,
            englishContextPrompt: generated.contextPrompt,
          }

          if (generated.metaTemplate) {
            generated.metaTemplate.sections.forEach((section) => {
              translationPayload[`metaTemplate_${section.key}`] = section.content
            })
          }

          if (generated.contextTemplate) {
            generated.contextTemplate.sections.forEach((section) => {
              translationPayload[`contextTemplate_${section.key}`] = section.content
            })
          }

          const translations = await translateTextMap(translationPayload, { compress: true, context: 'TEXT' })

          if (Object.keys(translations).length > 0) {
            const { englishMetaPrompt, englishContextPrompt, ...templateTranslations } = translations
            enrichedResults = {
              ...generated,
              englishMetaPrompt,
              englishContextPrompt,
            }

            if (generated.metaTemplate) {
              enrichedResults.englishMetaTemplate = {
                ...generated.metaTemplate,
                sections: generated.metaTemplate.sections.map((section) => ({
                  ...section,
                  content: templateTranslations[`metaTemplate_${section.key}`] || section.content,
                })),
              }
            }

            if (generated.contextTemplate) {
              enrichedResults.englishContextTemplate = {
                ...generated.contextTemplate,
                sections: generated.contextTemplate.sections.map((section) => ({
                  ...section,
                  content: templateTranslations[`contextTemplate_${section.key}`] || section.content,
                })),
              }
            }
          }
        } catch (translationError) {
          console.warn('Gemini translation failed:', translationError)
          showNotification('영문 번역에 실패하여 기본 버전을 표시합니다.', 'warning')
          const fallback = buildNativeEnglishFallback(generated)
          enrichedResults = { ...generated, ...fallback }
        }

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
        setError('프롬프트 생성 중 오류가 발생했습니다.')
        showNotification('프롬프트 생성 중 오류가 발생했습니다.', 'error')
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
  )

  const renderPromptTextarea = () => (
    <div className="form-group">
      <div style={{ marginBottom: '8px' }}>
        <label htmlFor="user-prompt">자연어 프롬프트 입력</label>
      </div>
      <textarea
        id="user-prompt"
        value={userPrompt}
        onChange={(e) => setUserPrompt(e.target.value)}
        placeholder="예: 인공지능의 미래와 사회적 영향에 대해 작성해주세요"
        className="prompt-input"
        rows={5}
      />
    </div>
  )

  const renderGoalSelector = () => (
    <div className="form-group">
      <label htmlFor="content-goal">콘텐츠 목표</label>
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
        목표에 맞춰 템플릿과 가이드라인이 자동으로 업데이트됩니다.
      </p>
    </div>
  )

  const renderDetailedOptionsGrid = () => (
    <div className="detailed-options">
      <div className="options-grid">
        {renderGoalSelector()}
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

        <div className="form-group">
          <label style={{ marginBottom: '12px', display: 'block', fontWeight: '500' }}>어투 및 말 표현</label>
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
            가이드 모드
          </button>
          <button
            className={`wizard-toggle-button ${!useWizardMode ? 'active' : ''}`}
            onClick={() => setUseWizardMode(false)}
          >
            고급 모드
          </button>
        </div>
        <span style={{ fontSize: '0.85rem', color: '#666' }}>
          {useWizardMode 
            ? '단계별 안내를 따라 프롬프트를 완성하세요.'
            : '모든 옵션을 한 번에 설정하세요.'}
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
                생성하고자 하는 채널과 목적을 먼저 정의하면 이후 단계에서 맞춤 가이드를 받을 수 있습니다.
              </p>
              <div className="wizard-dual-grid">
                {renderContentTypeSelector()}
                {renderGoalSelector()}
              </div>
              <div className="wizard-panel__summary">
                <p>선택한 채널에 맞춰 메타 템플릿이 자동 구성됩니다.</p>
                <ul>
                  <li>목표/주제/타겟/제약/톤/출력 구조를 자동 정렬</li>
                  <li>Gemini 번역과 요약으로 양언어 템플릿 제공</li>
                </ul>
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="wizard-panel">
              <p className="wizard-panel__hint">
                타겟 독자와 어투를 선택하면 템플릿의 페르소나와 톤 섹션이 함께 채워집니다.
              </p>
              {renderDetailedOptionsGrid()}
            </div>
          )}

          {wizardStep === 3 && (
            <div className="wizard-panel">
              <p className="wizard-panel__hint">
                자연어로 원하는 내용을 자유롭게 작성하면 컨텍스트 템플릿의 상황/지시/요약이 자동으로 구성됩니다.
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
                  <span>입력 길이</span>
                  <span>
                    {tokenUsage} / {tokenLimit} chars
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
                입력값으로 생성될 템플릿을 미리 확인한 뒤 최종 출력을 생성하세요.
              </p>
              {previewResult ? (
                <div className="wizard-preview-grid">
                  {previewResult.metaTemplate && (
                    <StructuredPromptCard
                      title="메타 템플릿 미리보기"
                      template={previewResult.metaTemplate}
                    />
                  )}
                  {previewResult.contextTemplate && (
                    <StructuredPromptCard
                      title="컨텍스트 템플릿 미리보기"
                      template={previewResult.contextTemplate}
                    />
                  )}
                </div>
              ) : (
                <p className="helper-text">프롬프트를 입력하면 미리보기가 표시됩니다.</p>
              )}
            </div>
          )}

          <div className="wizard-navigation">
            <button
              className="wizard-nav-button"
              onClick={handlePrevStep}
              disabled={wizardStep === 1}
            >
              이전 단계
            </button>
            <button
              className="wizard-nav-button primary"
              onClick={wizardStep === WIZARD_STEPS.length ? handleGenerate : handleNextStep}
              disabled={wizardStep === WIZARD_STEPS.length ? (!isFormValid || isGenerating) : false}
            >
              {wizardStep === WIZARD_STEPS.length
                ? (isGenerating ? '생성 중...' : '프롬프트 생성하기')
                : '다음 단계'}
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
              {showDetailedOptions ? '▼' : '▶'} 상세 옵션 {showDetailedOptions ? '접기' : '펼치기'}
            </button>

            {showDetailedOptions && renderDetailedOptionsGrid()}
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
      )}

      {isGenerating && <LoadingSpinner message="프롬프트를 생성하고 있습니다..." />}

      {results && !isGenerating && (
        <div className="results-section">
          {results.appliedGuide && (
            <div className="guide-insight-card">
              <div className="guide-insight-header">
                <div>
                  <p className="guide-insight-label">모델 가이드 반영됨</p>
                  <h3>{results.appliedGuide.title || results.appliedGuide.modelName}</h3>
                </div>
                <span className="guide-insight-confidence">
                  신뢰도 {Math.round((results.appliedGuide.confidence ?? 0.5) * 100)}%
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
                  {results.appliedGuide.summary || '최신 가이드라인이 적용되었습니다.'}
                </p>
              )}
            </div>
          )}
          {results.metaTemplate && (
            <StructuredPromptCard
              title="표준 메타 프롬프트 템플릿"
              template={results.metaTemplate}
              englishTemplate={results.englishMetaTemplate}
            />
          )}
          <ResultCard
            title="메타 프롬프트"
            content={results.metaPrompt}
            englishVersion={results.englishMetaPrompt}
            showEnglishToggle={true}
          />
          {results.contextTemplate && (
            <StructuredPromptCard
              title="컨텍스트 프롬프트 템플릿"
              template={results.contextTemplate}
              englishTemplate={results.englishContextTemplate}
            />
          )}
          <ResultCard
            title="컨텍스트 프롬프트"
            content={results.contextPrompt}
            englishVersion={results.englishContextPrompt}
            showEnglishToggle={true}
          />
          <div className="hashtags-card">
            <h3>해시태그</h3>
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
              {hashtagsCopied ? '✓ 복사됨' : '해시태그 복사'}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

export default PromptGenerator
