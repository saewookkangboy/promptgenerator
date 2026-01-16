// 이미지 프롬프트 생성 UI 컴포넌트

import { useState, useCallback, useEffect } from 'react'
import { templateAPI, aiServicesAPI, promptOptimizerAPI } from '../utils/api'
import TemplateVariableForm from './TemplateVariableForm'
import { ImagePromptOptions, ImageModel, ImageStyle, Composition, Lighting, ColorPalette, TechnicalSettings } from '../types/image.types'
import { PromptResult } from '../types/prompt.types'
import { PromptGeneratorFactory } from '../generators/factory/PromptGeneratorFactory'
import { validateRequired } from '../utils/validation'
import { savePromptRecord } from '../utils/storage'
import { promptAPI } from '../utils/api'
import { showNotification } from '../utils/notifications'
import { translateTextMap, buildNativeEnglishFallback } from '../utils/translation'
import { hasPromptSaveAuth, reportPromptSaveFailure } from '../utils/promptSaveReporter'
import ResultCard from './ResultCard'
import ErrorMessage from './ErrorMessage'
import LoadingSpinner from './LoadingSpinner'
import './PromptGenerator.css'

type ImageServiceOption = {
  id: string
  label: string
  baseModel: ImageModel
  provider?: string | null
}

const IMAGE_MODEL_PRIORITY: ImageModel[] = [
  'midjourney',
  'flux',
  'dalle',
  'imagen-3',
  'stable-diffusion',
  'ideogram',
  'firefly',
  'leonardo',
  'comfyui',
]

const DEFAULT_IMAGE_SERVICE_OPTIONS: ImageServiceOption[] = [
  { id: 'image-midjourney', label: 'Midjourney v6', baseModel: 'midjourney' },
  { id: 'image-flux', label: 'Flux Pro', baseModel: 'flux' },
  { id: 'image-dalle', label: 'OpenAI DALL-E 3', baseModel: 'dalle' },
  { id: 'image-imagen', label: 'Google Imagen 3 (Gemini 2.5 Flash)', baseModel: 'imagen-3' },
  { id: 'image-stable-diffusion', label: 'Stable Diffusion 3.5 Large', baseModel: 'stable-diffusion' },
  { id: 'image-ideogram', label: 'Ideogram 2.0', baseModel: 'ideogram' },
  { id: 'image-firefly', label: 'Adobe Firefly', baseModel: 'firefly' },
  { id: 'image-leonardo', label: 'Leonardo AI', baseModel: 'leonardo' },
  { id: 'image-comfyui', label: 'ComfyUI', baseModel: 'comfyui' },
]

const DEFAULT_IMAGE_SERVICE_ID = DEFAULT_IMAGE_SERVICE_OPTIONS[0].id
const DEFAULT_IMAGE_BASE_MODEL = DEFAULT_IMAGE_SERVICE_OPTIONS[0].baseModel

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'image-service'

// 서비스명을 모델 코드로 매핑하는 함수
function mapServiceNameToModel(serviceName: string): ImageModel {
  const lowerName = serviceName.toLowerCase()
  if (lowerName.includes('midjourney')) return 'midjourney'
  if (lowerName.includes('dall') || lowerName.includes('dalle') || lowerName.includes('openai')) return 'dalle'
  if (lowerName.includes('stable') || lowerName.includes('stability')) return 'stable-diffusion'
  if (lowerName.includes('imagen') || lowerName.includes('gemini') || lowerName.includes('google')) return 'imagen-3'
  if (lowerName.includes('firefly') || lowerName.includes('adobe')) return 'firefly'
  if (lowerName.includes('leonardo')) return 'leonardo'
  if (lowerName.includes('flux')) return 'flux'
  if (lowerName.includes('ideogram')) return 'ideogram'
  if (lowerName.includes('comfy')) return 'comfyui'
  if (lowerName.includes('luma')) return 'imagen-3'
  if (lowerName.includes('runway')) return 'midjourney'
  if (lowerName.includes('hugging') || lowerName.includes('replicate') || lowerName.includes('fal') || lowerName.includes('bedrock') || lowerName.includes('amazon'))
    return 'stable-diffusion'
  return 'midjourney'
}

const ART_STYLES = [
  { value: 'realistic', label: '사진/리얼리즘' },
  { value: 'illustration', label: '일러스트' },
  { value: '3d-render', label: '3D 렌더링' },
  { value: 'watercolor', label: '수채화' },
  { value: 'oil-painting', label: '유화' },
  { value: 'digital-art', label: '디지털 아트' },
  { value: 'photography', label: '사진' },
  { value: 'custom', label: '커스텀' },
]

const FRAMING_OPTIONS = [
  { value: 'close-up', label: '클로즈업' },
  { value: 'medium-shot', label: '미디엄 샷' },
  { value: 'wide-shot', label: '와이드 샷' },
  { value: 'extreme-wide', label: '익스트림 와이드' },
  { value: 'dutch-angle', label: '더치 앵글' },
]

const COMPOSITION_RULES = [
  { value: 'rule-of-thirds', label: '3분할 법칙' },
  { value: 'golden-ratio', label: '황금비' },
  { value: 'symmetry', label: '대칭' },
  { value: 'centered', label: '중앙 배치' },
  { value: 'dynamic', label: '다이나믹' },
]

const LIGHTING_TYPES = [
  { value: 'natural', label: '자연광' },
  { value: 'studio', label: '스튜디오' },
  { value: 'dramatic', label: '드라마틱' },
  { value: 'soft', label: '부드러운' },
  { value: 'harsh', label: '강한' },
  { value: 'rim', label: '림 라이트' },
  { value: 'backlit', label: '역광' },
]

const COLOR_MOODS = [
  { value: 'vibrant', label: '생생한' },
  { value: 'muted', label: '차분한' },
  { value: 'monochrome', label: '단색' },
  { value: 'pastel', label: '파스텔' },
  { value: 'high-contrast', label: '고대비' },
  { value: 'warm', label: '따뜻한' },
  { value: 'cool', label: '차가운' },
]

const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1 (정사각형)' },
  { value: '4:3', label: '4:3' },
  { value: '16:9', label: '16:9 (와이드)' },
  { value: '21:9', label: '21:9 (울트라 와이드)' },
  { value: '9:16', label: '9:16 (세로)' },
]

const IMAGE_WIZARD_STEPS = [
  { id: 1, label: '주제' },
  { id: 2, label: '스타일 & 구성' },
  { id: 3, label: '고급 옵션' },
  { id: 4, label: '요약 확인' },
]

function ImagePromptGenerator() {
  const sortImageOptions = (options: ImageServiceOption[]) => {
    const priorityIndex = (model: ImageModel) => {
      const index = IMAGE_MODEL_PRIORITY.indexOf(model)
      return index === -1 ? IMAGE_MODEL_PRIORITY.length : index
    }
    return [...options].sort((a, b) => {
      const diff = priorityIndex(a.baseModel) - priorityIndex(b.baseModel)
      if (diff !== 0) return diff
      return a.label.localeCompare(b.label)
    })
  }

  const [imageServiceOptions, setImageServiceOptions] = useState<ImageServiceOption[]>(
    sortImageOptions(DEFAULT_IMAGE_SERVICE_OPTIONS)
  )
  const [selectedImageServiceId, setSelectedImageServiceId] = useState<string>(DEFAULT_IMAGE_SERVICE_ID)
  const [model, setModel] = useState<ImageModel>(DEFAULT_IMAGE_BASE_MODEL)
  const [subject, setSubject] = useState('')
  const [style, setStyle] = useState<ImageStyle>({
    artStyle: 'realistic',
    customStyle: '',
  })
  const [composition, setComposition] = useState<Composition>({
    rule: 'rule-of-thirds',
    framing: 'medium-shot',
  })
  const [lighting, setLighting] = useState<Lighting>({
    type: 'natural',
    direction: 'front',
    intensity: 50,
  })
  const [color, setColor] = useState<ColorPalette>({
    primary: [],
    mood: 'vibrant',
  })
  const [technical, setTechnical] = useState<TechnicalSettings>({
    aspectRatio: '16:9',
    quality: 4,
  })
  const [negativePrompt, setNegativePrompt] = useState<string[]>([])
  const [negativeInput, setNegativeInput] = useState('')
  const [results, setResults] = useState<PromptResult | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [hashtagsCopied, setHashtagsCopied] = useState(false)
  const [optimizedResult, setOptimizedResult] = useState<any>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  
  // 모델별 고급 옵션 state
  const [modelSpecific, setModelSpecific] = useState<any>({})

  // DB에서 이미지 서비스 목록 로드
  useEffect(() => {
    const loadImageServices = async () => {
      try {
        const response = await aiServicesAPI.getByCategory('IMAGE')
        if (response.success && response.data && response.data.length > 0) {
          const options: ImageServiceOption[] = response.data.map((service: any) => ({
            id: service.id || slugify(service.serviceName),
            label: service.serviceName,
            baseModel: mapServiceNameToModel(service.serviceName),
            provider: service.provider || null,
          }))

          const sortedOptions = sortImageOptions(options)

          setImageServiceOptions(sortedOptions)
          setSelectedImageServiceId((prev) =>
            sortedOptions.some((option) => option.id === prev) ? prev : sortedOptions[0].id
          )
        }
      } catch (error) {
        console.warn('이미지 서비스 목록 로드 실패, 기본 목록 사용:', error)
        // 기본 목록 유지
      }
    }

    loadImageServices()
  }, [])

  useEffect(() => {
    const option = imageServiceOptions.find((opt) => opt.id === selectedImageServiceId)
    if (option) {
      setModel(option.baseModel)
    }
  }, [selectedImageServiceId, imageServiceOptions])

  const [useWizardMode, setUseWizardMode] = useState(true)
  const [wizardStep, setWizardStep] = useState(1)
  
  // 템플릿 관련 상태
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [showVariableForm, setShowVariableForm] = useState(false)

  const wizardSteps = IMAGE_WIZARD_STEPS
  const wizardStepCount = wizardSteps.length

  const canProceedToNext = () => {
    if (wizardStep === 1) {
      return subject.trim().length > 0
    }
    return true
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
      
      // 주제 필드에 자동 채우기
      setSubject(result.prompt)
      
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

      showNotification('템플릿이 적용되었습니다. 주제를 확인하고 필요시 수정한 후 생성 버튼을 눌러주세요.', 'success')
      
      // 주제 입력 필드로 스크롤
      setTimeout(() => {
        const subjectInput = document.getElementById('subject')
        if (subjectInput) {
          subjectInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
          subjectInput.focus()
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
      
      // 이미지 카테고리 템플릿만 처리
      if (targetTab === 'image' && category === 'image') {
        setSelectedTemplate(template)
        setShowVariableForm(true)
      }
    }

    window.addEventListener('template-selected', handleTemplateSelected as EventListener)
    return () => {
      window.removeEventListener('template-selected', handleTemplateSelected as EventListener)
    }
  }, [])


  const renderSubjectInput = () => (
    <div className="form-group">
      <label htmlFor="subject">주제 (Subject)</label>
      <textarea
        id="subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="예: 고양이가 창가에서 햇빛을 받으며 자고 있는 모습"
        className="prompt-input"
        rows={3}
      />
    </div>
  )

  const renderArtStyleSelector = () => (
    <div className="form-group">
      <label htmlFor="art-style">아트 스타일</label>
      <select
        id="art-style"
        value={style.artStyle || ART_STYLES[0]?.value || 'realistic'}
        onChange={(e) => setStyle({ ...style, artStyle: e.target.value as ImageStyle['artStyle'] })}
        className="option-select"
      >
        {ART_STYLES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      {style.artStyle === 'custom' && (
        <input
          type="text"
          value={style.customStyle || ''}
          onChange={(e) => setStyle({ ...style, customStyle: e.target.value })}
          placeholder="커스텀 스타일을 입력하세요"
          className="prompt-input"
          style={{ marginTop: '8px' }}
        />
      )}
    </div>
  )

  const renderCompositionGrid = () => (
    <div className="options-grid">
      <div className="form-group">
        <label htmlFor="framing">프레이밍</label>
        <select
          id="framing"
          value={composition.framing || FRAMING_OPTIONS[0]?.value || 'medium-shot'}
          onChange={(e) => setComposition({ ...composition, framing: e.target.value as Composition['framing'] })}
          className="option-select"
        >
          {FRAMING_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="composition-rule">구도 법칙</label>
        <select
          id="composition-rule"
          value={composition.rule || COMPOSITION_RULES[0]?.value || 'rule-of-thirds'}
          onChange={(e) => setComposition({ ...composition, rule: e.target.value as Composition['rule'] })}
          className="option-select"
        >
          {COMPOSITION_RULES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="lighting-type">조명 타입</label>
        <select
          id="lighting-type"
          value={lighting.type || LIGHTING_TYPES[0]?.value || 'natural'}
          onChange={(e) => setLighting({ ...lighting, type: e.target.value as Lighting['type'] })}
          className="option-select"
        >
          {LIGHTING_TYPES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="lighting-direction">조명 방향</label>
        <select
          id="lighting-direction"
          value={lighting.direction || 'front'}
          onChange={(e) => setLighting({ ...lighting, direction: e.target.value as Lighting['direction'] })}
          className="option-select"
        >
          <option value="front">앞</option>
          <option value="side">옆</option>
          <option value="back">뒤</option>
          <option value="top">위</option>
          <option value="bottom">아래</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="color-mood">색상 분위기</label>
        <select
          id="color-mood"
          value={color.mood || COLOR_MOODS[0]?.value || 'vibrant'}
          onChange={(e) => setColor({ ...color, mood: e.target.value as ColorPalette['mood'] })}
          className="option-select"
        >
          {COLOR_MOODS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="aspect-ratio">아스펙트 비율</label>
        <select
          id="aspect-ratio"
          value={technical.aspectRatio || ASPECT_RATIOS[0]?.value || '16:9'}
          onChange={(e) => setTechnical({ ...technical, aspectRatio: e.target.value as TechnicalSettings['aspectRatio'] })}
          className="option-select"
        >
          {ASPECT_RATIOS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )

  const renderAdvancedSection = (forceOpen = false) => (
    <div className="detailed-options-section">
      {!forceOpen && (
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="toggle-options-button"
        >
          {showAdvanced ? '▼' : '▶'} 고급 옵션 {showAdvanced ? '접기' : '펼치기'}
        </button>
      )}

      {(forceOpen || showAdvanced) && (
        <div className="detailed-options">
          <div className="form-group">
            <label htmlFor="lighting-intensity">조명 강도: {lighting.intensity}</label>
            <input
              type="range"
              id="lighting-intensity"
              min="0"
              max="100"
              value={lighting.intensity}
              onChange={(e) => setLighting({ ...lighting, intensity: parseInt(e.target.value) })}
              className="option-select"
            />
          </div>

          <div className="form-group">
            <label htmlFor="quality">품질: {technical.quality}</label>
            <input
              type="range"
              id="quality"
              min="1"
              max="5"
              value={technical.quality}
              onChange={(e) => setTechnical({ ...technical, quality: parseInt(e.target.value) })}
              className="option-select"
            />
          </div>

          <div className="form-group">
            <label htmlFor="negative-prompt">네거티브 프롬프트 (제외할 요소)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                id="negative-prompt"
                value={negativeInput}
                onChange={(e) => setNegativeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNegativePrompt()}
                placeholder="예: blurry, low quality"
                className="prompt-input"
              />
              <button onClick={addNegativePrompt} className="copy-button" style={{ whiteSpace: 'nowrap' }}>
                추가
              </button>
            </div>
            {negativePrompt.length > 0 && (
              <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {negativePrompt.map((item, index) => (
                  <span
                    key={index}
                    className="hashtag"
                    onClick={() => removeNegativePrompt(index)}
                    style={{ cursor: 'pointer' }}
                  >
                    {item} ×
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="model-specific-options" style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #000' }}>
            <h4 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>모델별 고급 프롬프트 엔지니어링 옵션</h4>
            {/* Midjourney */}
            {model === 'midjourney' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="mj-version">버전</label>
                  <select
                    id="mj-version"
                    value={modelSpecific.midjourney?.version || 6}
                    onChange={(e) =>
                      setModelSpecific({
                        ...modelSpecific,
                        midjourney: { ...modelSpecific.midjourney, version: parseInt(e.target.value) },
                      })
                    }
                    className="option-select"
                  >
                    <option value={4}>v4</option>
                    <option value={5}>v5</option>
                    <option value={6}>v6</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="mj-chaos">Chaos: {modelSpecific.midjourney?.chaos || 0}</label>
                  <input
                    type="range"
                    id="mj-chaos"
                    min="0"
                    max="100"
                    value={modelSpecific.midjourney?.chaos || 0}
                    onChange={(e) =>
                      setModelSpecific({
                        ...modelSpecific,
                        midjourney: { ...modelSpecific.midjourney, chaos: parseInt(e.target.value) },
                      })
                    }
                    className="option-select"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="mj-stylize">Stylize: {modelSpecific.midjourney?.stylize || 100}</label>
                  <input
                    type="range"
                    id="mj-stylize"
                    min="0"
                    max="1000"
                    value={modelSpecific.midjourney?.stylize || 100}
                    onChange={(e) =>
                      setModelSpecific({
                        ...modelSpecific,
                        midjourney: { ...modelSpecific.midjourney, stylize: parseInt(e.target.value) },
                      })
                    }
                    className="option-select"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="mj-seed">Seed (선택사항)</label>
                  <input
                    type="number"
                    id="mj-seed"
                    value={modelSpecific.midjourney?.seed || ''}
                    onChange={(e) =>
                      setModelSpecific({
                        ...modelSpecific,
                        midjourney: {
                          ...modelSpecific.midjourney,
                          seed: e.target.value ? parseInt(e.target.value) : undefined,
                        },
                      })
                    }
                    placeholder="랜덤 시드 번호"
                    className="prompt-input"
                  />
                </div>
              </div>
            )}

            {/* Google Imagen 3 */}
            {model === 'imagen-3' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="im3-structure">프롬프트 구조</label>
                  <select
                    id="im3-structure"
                    value={modelSpecific.imagen3?.promptStructure || 'structured'}
                    onChange={(e) =>
                      setModelSpecific({
                        ...modelSpecific,
                        imagen3: { ...modelSpecific.imagen3, promptStructure: e.target.value },
                      })
                    }
                    className="option-select"
                  >
                    <option value="simple">간단 (Simple)</option>
                    <option value="structured">구조화 (Structured)</option>
                    <option value="detailed">상세 (Detailed)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="im3-style-ref">스타일 참조 (선택사항)</label>
                  <textarea
                    id="im3-style-ref"
                    value={modelSpecific.imagen3?.styleReference || ''}
                    onChange={(e) =>
                      setModelSpecific({
                        ...modelSpecific,
                        imagen3: { ...modelSpecific.imagen3, styleReference: e.target.value },
                      })
                    }
                    placeholder="예: Van Gogh의 별이 빛나는 밤 스타일"
                    className="prompt-input"
                    rows={2}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="im3-guidance">Guidance Scale: {modelSpecific.imagen3?.guidanceScale || 7.5}</label>
                  <input
                    type="range"
                    id="im3-guidance"
                    min="1"
                    max="20"
                    step="0.5"
                    value={modelSpecific.imagen3?.guidanceScale || 7.5}
                    onChange={(e) =>
                      setModelSpecific({
                        ...modelSpecific,
                        imagen3: { ...modelSpecific.imagen3, guidanceScale: parseFloat(e.target.value) },
                      })
                    }
                    className="option-select"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="im3-steps">Inference Steps: {modelSpecific.imagen3?.numInferenceSteps || 50}</label>
                  <input
                    type="range"
                    id="im3-steps"
                    min="20"
                    max="100"
                    value={modelSpecific.imagen3?.numInferenceSteps || 50}
                    onChange={(e) =>
                      setModelSpecific({
                        ...modelSpecific,
                        imagen3: { ...modelSpecific.imagen3, numInferenceSteps: parseInt(e.target.value) },
                      })
                    }
                    className="option-select"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="im3-safety">안전 필터</label>
                  <select
                    id="im3-safety"
                    value={modelSpecific.imagen3?.safetyFilter || 'block_some'}
                    onChange={(e) =>
                      setModelSpecific({
                        ...modelSpecific,
                        imagen3: { ...modelSpecific.imagen3, safetyFilter: e.target.value },
                      })
                    }
                    className="option-select"
                  >
                    <option value="block_few">최소 차단</option>
                    <option value="block_some">일부 차단</option>
                    <option value="block_most">대부분 차단</option>
                  </select>
                </div>
              </div>
            )}

            {/* Stable Diffusion */}
            {model === 'stable-diffusion' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="sd-cfg">CFG Scale: {modelSpecific.stableDiffusion?.cfgScale || 7}</label>
                  <input
                    type="range"
                    id="sd-cfg"
                    min="1"
                    max="20"
                    value={modelSpecific.stableDiffusion?.cfgScale || 7}
                    onChange={(e) =>
                      setModelSpecific({
                        ...modelSpecific,
                        stableDiffusion: { ...modelSpecific.stableDiffusion, cfgScale: parseInt(e.target.value) },
                      })
                    }
                    className="option-select"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="sd-steps">Sampling Steps: {modelSpecific.stableDiffusion?.steps || 50}</label>
                  <input
                    type="range"
                    id="sd-steps"
                    min="20"
                    max="100"
                    value={modelSpecific.stableDiffusion?.steps || 50}
                    onChange={(e) =>
                      setModelSpecific({
                        ...modelSpecific,
                        stableDiffusion: { ...modelSpecific.stableDiffusion, steps: parseInt(e.target.value) },
                      })
                    }
                    className="option-select"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="sd-sampler">Sampler</label>
                  <select
                    id="sd-sampler"
                    value={modelSpecific.stableDiffusion?.sampler || 'euler'}
                    onChange={(e) =>
                      setModelSpecific({
                        ...modelSpecific,
                        stableDiffusion: { ...modelSpecific.stableDiffusion, sampler: e.target.value },
                      })
                    }
                    className="option-select"
                  >
                    <option value="ddim">DDIM</option>
                    <option value="euler">Euler</option>
                    <option value="heun">Heun</option>
                    <option value="dpm++">DPM++</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )

  const renderWizardSummary = () => (
    <div className="wizard-preview-grid">
      <div className="quality-panel">
        <div className="quality-panel__header">
          <div>
            <p className="quality-panel__label">요약</p>
            <div className="quality-panel__score" style={{ fontSize: '1rem', color: '#000' }}>
              선택한 옵션 정리
            </div>
          </div>
        </div>
        <div className="quality-panel__section">
          <h4>핵심 설정</h4>
          <div className="summary-info-grid">
            <div className="summary-info-card">
              <div className="summary-info-label">주제</div>
              <div className="summary-info-value">{subject || '-'}</div>
            </div>
            <div className="summary-info-card">
              <div className="summary-info-label">스타일</div>
              <div className="summary-info-value">{style.artStyle}</div>
            </div>
            <div className="summary-info-card">
              <div className="summary-info-label">프레이밍/구도</div>
              <div className="summary-info-value">{composition.framing} · {composition.rule}</div>
            </div>
            <div className="summary-info-card">
              <div className="summary-info-label">조명</div>
              <div className="summary-info-value">{lighting.type} / {lighting.direction}</div>
            </div>
            <div className="summary-info-card">
              <div className="summary-info-label">색상 & 비율</div>
              <div className="summary-info-value">{color.mood} · {technical.aspectRatio}</div>
            </div>
            <div className="summary-info-card">
              <div className="summary-info-label">품질</div>
              <div className="summary-info-value">{technical.quality} / 5</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const handleGenerate = useCallback(() => {
    const validation = validateRequired(subject, '주제')
    if (!validation.isValid) {
      setError(validation.error || '주제를 입력해주세요.')
      return
    }

    setError(null)
    setIsGenerating(true)

    setTimeout(async () => {
      try {
        const options: ImagePromptOptions = {
          category: 'image',
          userInput: subject,
          model,
          subject,
          style,
          composition,
          lighting,
          color,
          technical,
          negativePrompt: negativePrompt.length > 0 ? negativePrompt : undefined,
          modelSpecific: {
            ...modelSpecific,
            midjourney: modelSpecific.midjourney || { version: 6, chaos: 0 },
            dalle: modelSpecific.dalle || { style: 'vivid', size: '1024x1024' },
            imagen3: modelSpecific.imagen3 || { promptStructure: 'structured', guidanceScale: 7.5, numInferenceSteps: 50 },
            stableDiffusion: modelSpecific.stableDiffusion || { cfgScale: 7, steps: 50, sampler: 'euler' },
            flux: modelSpecific.flux || { promptStrength: 0.8 },
            leonardo: modelSpecific.leonardo || { model: 'leonardo-diffusion', guidanceScale: 7 },
            ideogram: modelSpecific.ideogram || { style: 'auto', magicPrompt: false },
          },
        }

        const generator = PromptGeneratorFactory.createImageGenerator(model)
        const generated = generator.generate(options) as PromptResult

        let enrichedResults = generated
        try {
          const translations = await translateTextMap(
            {
              englishMetaPrompt: generated.metaPrompt,
              englishContextPrompt: generated.contextPrompt,
              englishVersion: generated.fullPrompt || generated.metaPrompt,
            },
            { compress: true, context: 'IMAGE' }
          )

          if (Object.keys(translations).length > 0) {
            enrichedResults = { ...generated, ...translations }
          }
        } catch (translationError) {
          console.warn('Gemini translation failed:', translationError)
          showNotification('이미지 프롬프트 영문 번역에 실패했습니다. 기본 버전을 표시합니다.', 'warning')
          const fallback = buildNativeEnglishFallback(generated)
          enrichedResults = { ...generated, ...fallback }
        }

        setResults(enrichedResults)
        
        // 로컬 스토리지에 저장 (Admin 기록용)
        savePromptRecord({
          category: 'image',
          userInput: subject,
          model: model,
          options: {
            artStyle: style.artStyle,
            framing: composition.framing,
            lighting: lighting.type,
            colorMood: color.mood,
            aspectRatio: technical.aspectRatio,
            quality: technical.quality,
            negativePrompt: negativePrompt.length > 0 ? negativePrompt : undefined,
          },
        })

        // 서버에 저장 시도 (로그인이 없으면 알림 및 실패 로그)
        if (!hasPromptSaveAuth()) {
          await reportPromptSaveFailure(
            'IMAGE',
            'unauthenticated',
            { inputPreview: subject.slice(0, 120) },
            '로그인 후에만 프롬프트가 서버 DB에 저장됩니다. 로그인 후 다시 시도해주세요.'
          )
        } else {
          try {
            await promptAPI.create({
              title: `${model} 이미지 프롬프트`,
              content: generated.prompt || '',
              category: 'IMAGE',
              model: model,
              inputText: subject,
              options: {
                artStyle: style.artStyle,
                framing: composition.framing,
                lighting: lighting.type,
                colorMood: color.mood,
                aspectRatio: technical.aspectRatio,
                quality: technical.quality,
                negativePrompt: negativePrompt.length > 0 ? negativePrompt : undefined,
                englishVersion: (generated as any).englishVersion,
              },
            })
          } catch (serverError: any) {
            console.warn('서버 저장 실패:', serverError)
            
            // 403 또는 401 오류인 경우 (토큰 문제) 사용자에게 알림
            if (serverError?.statusCode === 403 || serverError?.statusCode === 401 || 
                serverError?.message?.includes('토큰') || serverError?.message?.includes('로그인')) {
              showNotification(
                '프롬프트 저장을 위해 다시 로그인해주세요.',
                'warning'
              )
            } else {
              // 기타 오류는 조용히 처리 (로컬 저장은 성공했으므로)
              console.warn('서버 저장 실패 (로컬 저장은 성공):', serverError?.message || 'server_error')
            }
            
            await reportPromptSaveFailure('IMAGE', serverError?.message || 'server_error', {
              inputPreview: subject.slice(0, 120),
            })
          }
        }
      } catch (error: any) {
        setError(`프롬프트 생성 오류: ${error.message}`)
      } finally {
        setIsGenerating(false)
      }
    }, 300)
  }, [subject, model, style, composition, lighting, color, technical, negativePrompt])

  const addNegativePrompt = () => {
    if (negativeInput.trim()) {
      setNegativePrompt([...negativePrompt, negativeInput.trim()])
      setNegativeInput('')
    }
  }

  const removeNegativePrompt = (index: number) => {
    setNegativePrompt(negativePrompt.filter((_, i) => i !== index))
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
          {useWizardMode ? '단계별 안내에 따라 옵션을 설정하세요.' : '모든 옵션을 한 번에 설정합니다.'}
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

          {wizardStep === 1 && (
            <div className="wizard-panel">
              {renderSubjectInput()}
              {renderArtStyleSelector()}
            </div>
          )}

          {wizardStep === 2 && (
            <div className="wizard-panel">
              {renderCompositionGrid()}
            </div>
          )}

          {wizardStep === 3 && (
            <div className="wizard-panel">
              {renderAdvancedSection(true)}
            </div>
          )}

          {wizardStep === 4 && (
            <div className="wizard-panel">
              {renderWizardSummary()}
            </div>
          )}

          <div className="wizard-navigation">
            <button className="wizard-nav-button" onClick={handlePrevStep} disabled={wizardStep === 1 || isGenerating}>
              이전 단계
            </button>
            <button
              className="wizard-nav-button primary"
              onClick={handleNextStep}
              disabled={isGenerating || (wizardStep < wizardStepCount && !canProceedToNext())}
            >
              {wizardStep === wizardStepCount ? (isGenerating ? '생성 중...' : '이미지 프롬프트 생성하기') : '다음 단계'}
            </button>
          </div>
        </div>
      )}

      {!useWizardMode && (
        <div className="input-section">
        <div className="form-group">
          <label htmlFor="subject">주제 (Subject)</label>
          <textarea
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="예: 고양이가 창가에서 햇빛을 받으며 자고 있는 모습"
            className="prompt-input"
            rows={3}
          />
        </div>

        <div className="form-group">
          <label htmlFor="art-style">아트 스타일</label>
          <select
            id="art-style"
            value={style.artStyle || ART_STYLES[0]?.value || 'realistic'}
            onChange={(e) => setStyle({ ...style, artStyle: e.target.value as ImageStyle['artStyle'] })}
            className="option-select"
          >
            {ART_STYLES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          {style.artStyle === 'custom' && (
            <input
              type="text"
              value={style.customStyle || ''}
              onChange={(e) => setStyle({ ...style, customStyle: e.target.value })}
              placeholder="커스텀 스타일을 입력하세요"
              className="prompt-input"
              style={{ marginTop: '8px' }}
            />
          )}
        </div>

        <div className="options-grid">
          <div className="form-group">
            <label htmlFor="framing">프레이밍</label>
            <select
              id="framing"
              value={composition.framing}
              onChange={(e) => setComposition({ ...composition, framing: e.target.value as Composition['framing'] })}
              className="option-select"
            >
              {FRAMING_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="composition-rule">구도 법칙</label>
            <select
              id="composition-rule"
              value={composition.rule}
              onChange={(e) => setComposition({ ...composition, rule: e.target.value as Composition['rule'] })}
              className="option-select"
            >
              {COMPOSITION_RULES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="lighting-type">조명 타입</label>
            <select
              id="lighting-type"
              value={lighting.type}
              onChange={(e) => setLighting({ ...lighting, type: e.target.value as Lighting['type'] })}
              className="option-select"
            >
              {LIGHTING_TYPES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="lighting-direction">조명 방향</label>
            <select
              id="lighting-direction"
              value={lighting.direction}
              onChange={(e) => setLighting({ ...lighting, direction: e.target.value as Lighting['direction'] })}
              className="option-select"
            >
              <option value="front">앞</option>
              <option value="side">옆</option>
              <option value="back">뒤</option>
              <option value="top">위</option>
              <option value="bottom">아래</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="color-mood">색상 분위기</label>
            <select
              id="color-mood"
              value={color.mood}
              onChange={(e) => setColor({ ...color, mood: e.target.value as ColorPalette['mood'] })}
              className="option-select"
            >
              {COLOR_MOODS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="aspect-ratio">아스펙트 비율</label>
            <select
              id="aspect-ratio"
              value={technical.aspectRatio}
              onChange={(e) => setTechnical({ ...technical, aspectRatio: e.target.value as TechnicalSettings['aspectRatio'] })}
              className="option-select"
            >
              {ASPECT_RATIOS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="detailed-options-section">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="toggle-options-button"
          >
            {showAdvanced ? '▼' : '▶'} 고급 옵션 {showAdvanced ? '접기' : '펼치기'}
          </button>

          {showAdvanced && (
            <div className="detailed-options">
              <div className="form-group">
                <label htmlFor="lighting-intensity">조명 강도: {lighting.intensity}</label>
                <input
                  type="range"
                  id="lighting-intensity"
                  min="0"
                  max="100"
                  value={lighting.intensity}
                  onChange={(e) => setLighting({ ...lighting, intensity: parseInt(e.target.value) })}
                  className="option-select"
                />
              </div>

              <div className="form-group">
                <label htmlFor="quality">품질: {technical.quality}</label>
                <input
                  type="range"
                  id="quality"
                  min="1"
                  max="5"
                  value={technical.quality}
                  onChange={(e) => setTechnical({ ...technical, quality: parseInt(e.target.value) })}
                  className="option-select"
                />
              </div>

              <div className="form-group">
                <label htmlFor="negative-prompt">네거티브 프롬프트 (제외할 요소)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    id="negative-prompt"
                    value={negativeInput}
                    onChange={(e) => setNegativeInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addNegativePrompt()}
                    placeholder="예: blurry, low quality"
                    className="prompt-input"
                  />
                  <button onClick={addNegativePrompt} className="copy-button" style={{ whiteSpace: 'nowrap' }}>
                    추가
                  </button>
                </div>
                {negativePrompt.length > 0 && (
                  <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {negativePrompt.map((item, index) => (
                      <span
                        key={index}
                        className="hashtag"
                        onClick={() => removeNegativePrompt(index)}
                        style={{ cursor: 'pointer' }}
                      >
                        {item} ×
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 모델별 프롬프트 엔지니어링 옵션 */}
              <div className="model-specific-options" style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #000' }}>
                <h4 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>모델별 고급 프롬프트 엔지니어링 옵션</h4>
                
                {/* Midjourney 옵션 */}
                {model === 'midjourney' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                      <label htmlFor="mj-version">버전</label>
                      <select
                        id="mj-version"
                        value={modelSpecific.midjourney?.version || 6}
                        onChange={(e) => setModelSpecific({
                          ...modelSpecific,
                          midjourney: { ...modelSpecific.midjourney, version: parseInt(e.target.value) }
                        })}
                        className="option-select"
                      >
                        <option value={4}>v4</option>
                        <option value={5}>v5</option>
                        <option value={6}>v6</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="mj-chaos">Chaos: {modelSpecific.midjourney?.chaos || 0}</label>
                      <input
                        type="range"
                        id="mj-chaos"
                        min="0"
                        max="100"
                        value={modelSpecific.midjourney?.chaos || 0}
                        onChange={(e) => setModelSpecific({
                          ...modelSpecific,
                          midjourney: { ...modelSpecific.midjourney, chaos: parseInt(e.target.value) }
                        })}
                        className="option-select"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="mj-stylize">Stylize: {modelSpecific.midjourney?.stylize || 100}</label>
                      <input
                        type="range"
                        id="mj-stylize"
                        min="0"
                        max="1000"
                        value={modelSpecific.midjourney?.stylize || 100}
                        onChange={(e) => setModelSpecific({
                          ...modelSpecific,
                          midjourney: { ...modelSpecific.midjourney, stylize: parseInt(e.target.value) }
                        })}
                        className="option-select"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="mj-seed">Seed (선택사항)</label>
                      <input
                        type="number"
                        id="mj-seed"
                        value={modelSpecific.midjourney?.seed || ''}
                        onChange={(e) => setModelSpecific({
                          ...modelSpecific,
                          midjourney: { ...modelSpecific.midjourney, seed: e.target.value ? parseInt(e.target.value) : undefined }
                        })}
                        placeholder="랜덤 시드 번호"
                        className="prompt-input"
                      />
                    </div>
                  </div>
                )}

                {/* Google Imagen 3 (Nano Banana Pro) 옵션 */}
                {model === 'imagen-3' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                      <label htmlFor="im3-structure">프롬프트 구조</label>
                      <select
                        id="im3-structure"
                        value={modelSpecific.imagen3?.promptStructure || 'structured'}
                        onChange={(e) => setModelSpecific({
                          ...modelSpecific,
                          imagen3: { ...modelSpecific.imagen3, promptStructure: e.target.value }
                        })}
                        className="option-select"
                      >
                        <option value="simple">간단 (Simple)</option>
                        <option value="structured">구조화 (Structured)</option>
                        <option value="detailed">상세 (Detailed)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="im3-style-ref">스타일 참조 (선택사항)</label>
                      <textarea
                        id="im3-style-ref"
                        value={modelSpecific.imagen3?.styleReference || ''}
                        onChange={(e) => setModelSpecific({
                          ...modelSpecific,
                          imagen3: { ...modelSpecific.imagen3, styleReference: e.target.value }
                        })}
                        placeholder="예: Van Gogh의 별이 빛나는 밤 스타일"
                        className="prompt-input"
                        rows={2}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="im3-guidance">Guidance Scale: {modelSpecific.imagen3?.guidanceScale || 7.5}</label>
                      <input
                        type="range"
                        id="im3-guidance"
                        min="1"
                        max="20"
                        step="0.5"
                        value={modelSpecific.imagen3?.guidanceScale || 7.5}
                        onChange={(e) => setModelSpecific({
                          ...modelSpecific,
                          imagen3: { ...modelSpecific.imagen3, guidanceScale: parseFloat(e.target.value) }
                        })}
                        className="option-select"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="im3-steps">Inference Steps: {modelSpecific.imagen3?.numInferenceSteps || 50}</label>
                      <input
                        type="range"
                        id="im3-steps"
                        min="20"
                        max="100"
                        value={modelSpecific.imagen3?.numInferenceSteps || 50}
                        onChange={(e) => setModelSpecific({
                          ...modelSpecific,
                          imagen3: { ...modelSpecific.imagen3, numInferenceSteps: parseInt(e.target.value) }
                        })}
                        className="option-select"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="im3-safety">안전 필터</label>
                      <select
                        id="im3-safety"
                        value={modelSpecific.imagen3?.safetyFilter || 'block_some'}
                        onChange={(e) => setModelSpecific({
                          ...modelSpecific,
                          imagen3: { ...modelSpecific.imagen3, safetyFilter: e.target.value }
                        })}
                        className="option-select"
                      >
                        <option value="block_few">최소 차단</option>
                        <option value="block_some">일부 차단</option>
                        <option value="block_most">대부분 차단</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Stable Diffusion 옵션 */}
                {model === 'stable-diffusion' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                      <label htmlFor="sd-cfg">CFG Scale: {modelSpecific.stableDiffusion?.cfgScale || 7}</label>
                      <input
                        type="range"
                        id="sd-cfg"
                        min="1"
                        max="20"
                        value={modelSpecific.stableDiffusion?.cfgScale || 7}
                        onChange={(e) => setModelSpecific({
                          ...modelSpecific,
                          stableDiffusion: { ...modelSpecific.stableDiffusion, cfgScale: parseInt(e.target.value) }
                        })}
                        className="option-select"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="sd-steps">Steps: {modelSpecific.stableDiffusion?.steps || 50}</label>
                      <input
                        type="range"
                        id="sd-steps"
                        min="10"
                        max="150"
                        value={modelSpecific.stableDiffusion?.steps || 50}
                        onChange={(e) => setModelSpecific({
                          ...modelSpecific,
                          stableDiffusion: { ...modelSpecific.stableDiffusion, steps: parseInt(e.target.value) }
                        })}
                        className="option-select"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="sd-sampler">Sampler</label>
                      <select
                        id="sd-sampler"
                        value={modelSpecific.stableDiffusion?.sampler || 'euler'}
                        onChange={(e) => setModelSpecific({
                          ...modelSpecific,
                          stableDiffusion: { ...modelSpecific.stableDiffusion, sampler: e.target.value }
                        })}
                        className="option-select"
                      >
                        <option value="euler">Euler</option>
                        <option value="dpm">DPM</option>
                        <option value="ddim">DDIM</option>
                        <option value="plms">PLMS</option>
                        <option value="k_euler">K_Euler</option>
                        <option value="k_dpm_2">K_DPM_2</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* DALL-E 3 옵션 */}
                {model === 'dalle' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                      <label htmlFor="dalle-style">스타일</label>
                      <select
                        id="dalle-style"
                        value={modelSpecific.dalle?.style || 'vivid'}
                        onChange={(e) => setModelSpecific({
                          ...modelSpecific,
                          dalle: { ...modelSpecific.dalle, style: e.target.value }
                        })}
                        className="option-select"
                      >
                        <option value="vivid">Vivid (생생한)</option>
                        <option value="natural">Natural (자연스러운)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="dalle-quality">품질</label>
                      <select
                        id="dalle-quality"
                        value={modelSpecific.dalle?.quality || 'standard'}
                        onChange={(e) => setModelSpecific({
                          ...modelSpecific,
                          dalle: { ...modelSpecific.dalle, quality: e.target.value }
                        })}
                        className="option-select"
                      >
                        <option value="standard">Standard</option>
                        <option value="hd">HD</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Flux 옵션 */}
                {model === 'flux' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                      <label htmlFor="flux-strength">Prompt Strength: {modelSpecific.flux?.promptStrength || 0.8}</label>
                      <input
                        type="range"
                        id="flux-strength"
                        min="0"
                        max="1"
                        step="0.1"
                        value={modelSpecific.flux?.promptStrength || 0.8}
                        onChange={(e) => setModelSpecific({
                          ...modelSpecific,
                          flux: { ...modelSpecific.flux, promptStrength: parseFloat(e.target.value) }
                        })}
                        className="option-select"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="flux-style-ref">스타일 참조 (선택사항)</label>
                      <textarea
                        id="flux-style-ref"
                        value={modelSpecific.flux?.styleReference || ''}
                        onChange={(e) => setModelSpecific({
                          ...modelSpecific,
                          flux: { ...modelSpecific.flux, styleReference: e.target.value }
                        })}
                        placeholder="예: cinematic lighting, film grain"
                        className="prompt-input"
                        rows={2}
                      />
                    </div>
                  </div>
                )}

                {/* Leonardo AI 옵션 */}
                {model === 'leonardo' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                      <label htmlFor="leo-model">모델</label>
                      <select
                        id="leo-model"
                        value={modelSpecific.leonardo?.model || 'leonardo-diffusion'}
                        onChange={(e) => setModelSpecific({
                          ...modelSpecific,
                          leonardo: { ...modelSpecific.leonardo, model: e.target.value }
                        })}
                        className="option-select"
                      >
                        <option value="leonardo-diffusion">Leonardo Diffusion</option>
                        <option value="leonardo-photoreal">Leonardo Photoreal</option>
                        <option value="leonardo-anime">Leonardo Anime</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="leo-guidance">Guidance Scale: {modelSpecific.leonardo?.guidanceScale || 7}</label>
                      <input
                        type="range"
                        id="leo-guidance"
                        min="1"
                        max="20"
                        value={modelSpecific.leonardo?.guidanceScale || 7}
                        onChange={(e) => setModelSpecific({
                          ...modelSpecific,
                          leonardo: { ...modelSpecific.leonardo, guidanceScale: parseInt(e.target.value) }
                        })}
                        className="option-select"
                      />
                    </div>
                  </div>
                )}

                {/* Ideogram 옵션 */}
                {model === 'ideogram' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                      <label htmlFor="ideogram-style">스타일</label>
                      <select
                        id="ideogram-style"
                        value={modelSpecific.ideogram?.style || 'auto'}
                        onChange={(e) => setModelSpecific({
                          ...modelSpecific,
                          ideogram: { ...modelSpecific.ideogram, style: e.target.value }
                        })}
                        className="option-select"
                      >
                        <option value="auto">Auto</option>
                        <option value="photorealistic">Photorealistic</option>
                        <option value="artistic">Artistic</option>
                        <option value="cinematic">Cinematic</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={modelSpecific.ideogram?.magicPrompt || false}
                          onChange={(e) => setModelSpecific({
                            ...modelSpecific,
                            ideogram: { ...modelSpecific.ideogram, magicPrompt: e.target.checked }
                          })}
                        />
                        {' '}Magic Prompt (자동 프롬프트 개선)
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={handleGenerate} 
          className="generate-button"
          disabled={isGenerating}
          aria-busy={isGenerating}
        >
          {isGenerating ? '생성 중...' : '이미지 프롬프트 생성하기'}
        </button>
      </div>
      )}

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
      {isGenerating && <LoadingSpinner message="이미지 프롬프트를 생성하고 있습니다..." />}

      {results && !isGenerating && (
        <div className="results-section">
          <ResultCard
            title="메타 프롬프트"
            content={results.metaPrompt}
          />
          <ResultCard
            title="컨텍스트 프롬프트"
            content={results.contextPrompt}
          />
          {results.fullPrompt && (
            <>
              <ResultCard
                title="전체 프롬프트 (복사용)"
                content={results.fullPrompt}
              />
              <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                <button
                  onClick={async () => {
                    setIsOptimizing(true)
                    try {
                      const optimized = await promptOptimizerAPI.optimize({
                        prompt: results.fullPrompt || results.metaPrompt,
                        category: 'image',
                        model: model,
                        options: {}
                      })
                      setOptimizedResult(optimized.data)
                      showNotification('프롬프트가 최적화되었습니다!', 'success')
                    } catch (err: any) {
                      showNotification(err.message || '최적화에 실패했습니다', 'error')
                    } finally {
                      setIsOptimizing(false)
                    }
                  }}
                  disabled={isOptimizing}
                  className="optimize-button"
                  style={{
                    padding: '12px 24px',
                    backgroundColor: 'var(--color-black)',
                    color: 'var(--color-white)',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isOptimizing ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    opacity: isOptimizing ? 0.6 : 1
                  }}
                >
                  {isOptimizing ? '⚡ 최적화 중...' : '⚡ AI 프롬프트 최적화'}
                </button>
              </div>
              {optimizedResult && (
                <div className="optimized-result-card" style={{
                  marginTop: '16px',
                  padding: '20px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                      ✨ 최적화된 프롬프트
                    </h3>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', color: '#666' }}>
                        품질 점수: <strong style={{ color: '#000' }}>{optimizedResult.quality_score.toFixed(0)}/100</strong>
                      </span>
                      <span style={{ fontSize: '14px', color: '#666' }}>
                        신뢰도: <strong style={{ color: '#000' }}>{(optimizedResult.confidence * 100).toFixed(0)}%</strong>
                      </span>
                    </div>
                  </div>
                  <ResultCard
                    title="최적화된 전체 프롬프트"
                    content={optimizedResult.optimized_prompt}
                  />
                  {optimizedResult.improvements.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>개선 사항:</h4>
                      <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#666' }}>
                        {optimizedResult.improvements.map((improvement: string, idx: number) => (
                          <li key={idx}>{improvement}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {optimizedResult.recommendations.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>추천 사항:</h4>
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        부정 프롬프트에 추가: <code style={{ backgroundColor: '#fff', padding: '2px 6px', borderRadius: '4px' }}>
                          {optimizedResult.recommendations.join(', ')}
                        </code>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
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

export default ImagePromptGenerator
