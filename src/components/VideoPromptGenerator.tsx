// 동영상 프롬프트 생성 UI 컴포넌트

import { useState, useCallback, useEffect, useRef } from 'react'
import { templateAPI, aiServicesAPI } from '../utils/api'
import TemplateVariableForm from './TemplateVariableForm'
import { VideoPromptOptions, VideoModel, VideoScene, CameraSettings, MotionSettings, VideoStyle, VideoTechnicalSettings } from '../types/video.types'
import { PromptResult } from '../types/prompt.types'
import { PromptGeneratorFactory } from '../generators/factory/PromptGeneratorFactory'
import { savePromptRecord } from '../utils/storage'
import { promptAPI } from '../utils/api'
import { showNotification } from '../utils/notifications'
import { translateTextMap, buildNativeEnglishFallback } from '../utils/translation'
import { convertToNativeEnglish } from '../utils/englishTranslator'
import { hasPromptSaveAuth, reportPromptSaveFailure } from '../utils/promptSaveReporter'
import ResultCard from './ResultCard'
import ErrorMessage from './ErrorMessage'
import LoadingSpinner from './LoadingSpinner'
import './PromptGenerator.css'

// 장면 프롬프트 표시 컴포넌트
function ScenePromptDisplay({ scene, index }: { scene: any; index: number }) {
  const [showEnglish, setShowEnglish] = useState(false)
  const [copied, setCopied] = useState(false)
  const displayText = showEnglish && scene.englishPrompt ? scene.englishPrompt : scene.prompt

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (error) {
      showNotification('복사에 실패했습니다. 텍스트를 직접 선택하여 복사해주세요.', 'error')
    }
  }
  
  return (
    <div>
      <div style={{ marginBottom: '8px', display: 'flex', gap: '6px' }}>
        {scene.englishPrompt && (
          <button
            id={`scene-${index}-toggle`}
            onClick={() => setShowEnglish(!showEnglish)}
            className="copy-button"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
          >
            {showEnglish ? '한국어' : 'English'}
          </button>
        )}
        <button
          onClick={handleCopy}
          className={`copy-button ${copied ? 'copied' : ''}`}
          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
        >
          {copied ? '✓ 복사됨' : '복사'}
        </button>
      </div>
      <pre style={{ margin: 0, fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
        {displayText}
      </pre>
      {showEnglish && scene.englishPrompt && (
        <div style={{ marginTop: '4px', fontSize: '0.75rem', opacity: 0.7 }}>
          Native English Version
        </div>
      )}
    </div>
  )
}

type VideoServiceOption = {
  id: string
  label: string
  baseModel: VideoModel
  provider?: string | null
}

const VIDEO_MODEL_PRIORITY: VideoModel[] = [
  'sora',
  'veo',
  'runway',
  'pika',
  'stable-video',
  'kling',
  'luma',
]

const DEFAULT_VIDEO_SERVICE_OPTIONS: VideoServiceOption[] = [
  { id: 'video-sora', label: 'OpenAI Sora 2', baseModel: 'sora' },
  { id: 'video-veo', label: 'Google Veo 3', baseModel: 'veo' },
  { id: 'video-runway', label: 'Runway Gen-3', baseModel: 'runway' },
  { id: 'video-pika', label: 'Pika Labs', baseModel: 'pika' },
  { id: 'video-stable', label: 'Stable Video Diffusion', baseModel: 'stable-video' },
]

const DEFAULT_VIDEO_SERVICE_ID = DEFAULT_VIDEO_SERVICE_OPTIONS[0].id
const DEFAULT_VIDEO_BASE_MODEL = DEFAULT_VIDEO_SERVICE_OPTIONS[0].baseModel

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'video-service'

// 서비스명을 모델 코드로 매핑하는 함수
function mapServiceNameToVideoModel(serviceName: string): VideoModel {
  const lowerName = serviceName.toLowerCase()
  if (lowerName.includes('sora') || lowerName.includes('video api')) return 'sora'
  if (lowerName.includes('veo') || lowerName.includes('vertex')) return 'veo'
  if (lowerName.includes('runway')) return 'runway'
  if (lowerName.includes('pika')) return 'pika'
  if (lowerName.includes('stable') || lowerName.includes('fal') || lowerName.includes('replicate') || lowerName.includes('bedrock') || lowerName.includes('leonardo'))
    return 'stable-video'
  if (lowerName.includes('kling')) return 'kling'
  if (lowerName.includes('luma')) return 'luma'
  if (lowerName.includes('firefly') || lowerName.includes('adobe')) return 'runway'
  return 'sora'
}

const GENRES = [
  { value: 'action', label: '액션' },
  { value: 'drama', label: '드라마' },
  { value: 'comedy', label: '코미디' },
  { value: 'horror', label: '공포' },
  { value: 'sci-fi', label: 'SF' },
  { value: 'documentary', label: '다큐멘터리' },
  { value: 'music-video', label: '뮤직비디오' },
]

const MOODS = [
  { value: 'tense', label: '긴장감' },
  { value: 'peaceful', label: '평화로움' },
  { value: 'dynamic', label: '역동적' },
  { value: 'melancholic', label: '우울한' },
  { value: 'energetic', label: '에너지틱' },
  { value: 'mysterious', label: '신비로운' },
]

const CAMERA_MOVEMENTS = [
  { value: 'static', label: '정적' },
  { value: 'dolly', label: '돌리 (앞뒤 이동)' },
  { value: 'pan', label: '팬 (좌우 이동)' },
  { value: 'tilt', label: '틸트 (상하 이동)' },
  { value: 'zoom', label: '줌 (확대/축소)' },
  { value: 'tracking', label: '트래킹 (추적)' },
  { value: 'orbit', label: '오빗 (회전)' },
  { value: 'crane', label: '크레인 (상하 이동)' },
]

const SHOT_TYPES = [
  { value: 'extreme-close', label: '익스트림 클로즈업' },
  { value: 'close-up', label: '클로즈업' },
  { value: 'medium', label: '미디엄 샷' },
  { value: 'wide', label: '와이드 샷' },
  { value: 'extreme-wide', label: '익스트림 와이드' },
  { value: 'establishing', label: '이스타블리싱 샷' },
]

const MOTION_SPEEDS = [
  { value: 'slow-motion', label: '슬로우 모션' },
  { value: 'normal', label: '일반 속도' },
  { value: 'fast', label: '빠른 속도' },
  { value: 'time-lapse', label: '타임랩스' },
]

const VIDEO_WIZARD_STEPS = [
  { id: 1, label: '모델 & 콘셉트' },
  { id: 2, label: '장면 구성' },
  { id: 3, label: '기술 & 레퍼런스' },
  { id: 4, label: '요약' },
]

function VideoPromptGenerator() {
  const sortVideoOptions = (options: VideoServiceOption[]) => {
    const priorityIndex = (model: VideoModel) => {
      const index = VIDEO_MODEL_PRIORITY.indexOf(model)
      return index === -1 ? VIDEO_MODEL_PRIORITY.length : index
    }
    return [...options].sort((a, b) => {
      const diff = priorityIndex(a.baseModel) - priorityIndex(b.baseModel)
      if (diff !== 0) return diff
      return a.label.localeCompare(b.label)
    })
  }

  const [videoServiceOptions, setVideoServiceOptions] = useState<VideoServiceOption[]>(
    sortVideoOptions(DEFAULT_VIDEO_SERVICE_OPTIONS)
  )
  const [selectedVideoServiceId, setSelectedVideoServiceId] = useState<string>(DEFAULT_VIDEO_SERVICE_ID)
  const [model, setModel] = useState<VideoModel>(DEFAULT_VIDEO_BASE_MODEL)
  const [isVideoDropdownOpen, setVideoDropdownOpen] = useState(false)
  const videoDropdownRef = useRef<HTMLDivElement | null>(null)
  const selectedVideoService = videoServiceOptions.find((option) => option.id === selectedVideoServiceId)
  const [overallStyle, setOverallStyle] = useState<VideoStyle>({
    genre: 'drama',
    mood: 'peaceful',
    colorGrading: 'warm',
    cinematic: true,
    contextualTone: '',
    qualitativeTone: '',
  })
  const [hasReferenceImage, setHasReferenceImage] = useState(false)
  const [referenceImageDescription, setReferenceImageDescription] = useState('')
  const [technical, setTechnical] = useState<VideoTechnicalSettings>({
    totalDuration: 30,
    fps: 24,
    resolution: '1080p',
    aspectRatio: '16:9',
  })
  const [scenes, setScenes] = useState<VideoScene[]>([
    {
      id: '1',
      order: 1,
      description: '',
      duration: 5,
      camera: {
        movement: 'static',
        shotType: 'medium',
        angle: 'eye-level',
      },
      motion: {
        speed: 'normal',
        type: 'smooth',
      },
    },
  ])
  const [results, setResults] = useState<PromptResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [modelSpecific, setModelSpecific] = useState<any>({})
  const [hashtagsCopied, setHashtagsCopied] = useState(false)
  const [useWizardMode, setUseWizardMode] = useState(true)
  const [wizardStep, setWizardStep] = useState(1)
  const wizardSteps = VIDEO_WIZARD_STEPS
  const wizardStepCount = wizardSteps.length

  // DB에서 동영상 서비스 목록 로드
  useEffect(() => {
    const loadVideoServices = async () => {
      try {
        const response = await aiServicesAPI.getByCategory('VIDEO')
        if (response.success && response.data && response.data.length > 0) {
          const options: VideoServiceOption[] = response.data.map((service: any) => ({
            id: service.id || slugify(service.serviceName),
            label: service.serviceName,
            baseModel: mapServiceNameToVideoModel(service.serviceName),
            provider: service.provider || null,
          }))

          const sortedOptions = sortVideoOptions(options)

          setVideoServiceOptions(sortedOptions)
          setSelectedVideoServiceId((prev) =>
            sortedOptions.some((option) => option.id === prev) ? prev : sortedOptions[0].id
          )
        }
      } catch (error) {
        console.warn('동영상 서비스 목록 로드 실패, 기본 목록 사용:', error)
        // 기본 목록 유지
      }
    }

    loadVideoServices()
  }, [])

  useEffect(() => {
    const option = videoServiceOptions.find((opt) => opt.id === selectedVideoServiceId)
    if (option) {
      setModel(option.baseModel)
    }
  }, [selectedVideoServiceId, videoServiceOptions])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (videoDropdownRef.current && !videoDropdownRef.current.contains(event.target as Node)) {
        setVideoDropdownOpen(false)
      }
    }
    if (isVideoDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isVideoDropdownOpen])
  
  // 템플릿 관련 상태
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [showVariableForm, setShowVariableForm] = useState(false)

  const canProceedToNext = () => {
    if (wizardStep === 1) {
      return scenes[0]?.description.trim().length > 0
    }
    if (wizardStep === 2) {
      return scenes.every((scene) => scene.description.trim().length > 0)
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
      
      // 첫 번째 장면의 description에 자동 채우기
      if (scenes.length > 0) {
        const updatedScenes = [...scenes]
        updatedScenes[0] = {
          ...updatedScenes[0],
          description: result.prompt
        }
        setScenes(updatedScenes)
      } else {
        // 장면이 없으면 새로 생성
        setScenes([{
          id: '1',
          order: 1,
          description: result.prompt,
          duration: 5,
          camera: {
            movement: 'static',
            shotType: 'medium',
            angle: 'eye-level',
          },
          motion: {
            speed: 'normal',
            type: 'smooth',
          },
        }])
      }
      
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

      showNotification('템플릿이 적용되었습니다. 장면을 확인하고 필요시 수정한 후 생성 버튼을 눌러주세요.', 'success')
    } catch (error: any) {
      console.error('템플릿 적용 실패:', error)
      showNotification('템플릿 적용에 실패했습니다.', 'error')
    }
  }, [selectedTemplate, scenes])

  // 전역 이벤트로 템플릿 선택 처리 (탭에서 선택한 경우)
  useEffect(() => {
    const handleTemplateSelected = (event: CustomEvent) => {
      const { template, category, targetTab } = event.detail
      
      // 비디오 카테고리 템플릿만 처리
      if (targetTab === 'video' && category === 'video') {
        setSelectedTemplate(template)
        setShowVariableForm(true)
      }
    }

    window.addEventListener('template-selected', handleTemplateSelected as EventListener)
    return () => {
      window.removeEventListener('template-selected', handleTemplateSelected as EventListener)
    }
  }, [])

  const renderVideoModelSelector = () => (
    <div className="form-group">
      <label>동영상 생성 모델</label>
      <div className="model-dropdown" ref={videoDropdownRef}>
        <button
          type="button"
          className="model-dropdown-trigger"
          onClick={() => setVideoDropdownOpen((prev) => !prev)}
        >
          <div>
            <div className="model-option__label">{selectedVideoService?.label || '모델 선택'}</div>
            <div className="model-option__meta">
              <span>{selectedVideoService?.provider || '제공사 미확인'}</span>
              <span className="model-option__chip">{selectedVideoService?.baseModel || '-'}</span>
            </div>
          </div>
          <span className="model-dropdown-caret">{isVideoDropdownOpen ? '▲' : '▼'}</span>
        </button>
        {isVideoDropdownOpen && (
          <div className="model-option-dropdown">
            {videoServiceOptions.map((option) => {
              const isActive = option.id === selectedVideoServiceId
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`model-option ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedVideoServiceId(option.id)
                    setVideoDropdownOpen(false)
                  }}
                >
                  <div className="model-option__label">{option.label}</div>
                  <div className="model-option__meta">
                    <span>{option.provider || '제공사 미확인'}</span>
                    <span className="model-option__chip">{option.baseModel}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  const renderWizardOverview = () => (
    <div className="wizard-panel">
      {renderVideoModelSelector()}

      <div className="options-grid">
        <div className="form-group">
          <label>장르</label>
          <select
            value={overallStyle.genre}
            onChange={(e) => setOverallStyle({ ...overallStyle, genre: e.target.value as VideoStyle['genre'] })}
            className="option-select"
          >
            {GENRES.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>무드</label>
          <select
            value={overallStyle.mood}
            onChange={(e) => setOverallStyle({ ...overallStyle, mood: e.target.value as VideoStyle['mood'] })}
            className="option-select"
          >
            {MOODS.map((mood) => (
              <option key={mood.value} value={mood.value}>
                {mood.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>시네마틱 톤</label>
          <input
            type="text"
            value={overallStyle.contextualTone || ''}
            onChange={(e) => setOverallStyle({ ...overallStyle, contextualTone: e.target.value })}
            placeholder="예: immersive, documentary style"
            className="prompt-input"
          />
        </div>
      </div>

      <div className="form-group">
        <label>콘셉트 개요</label>
        <textarea
          rows={4}
          value={scenes[0]?.description || ''}
          onChange={(e) => scenes[0] && updateScene(scenes[0].id, { description: e.target.value })}
          placeholder="첫 장면 또는 전체 영상을 요약해주세요."
          className="prompt-input"
        />
      </div>
    </div>
  )

  const renderWizardScenes = () => (
    <div className="wizard-panel">
      <div className="wizard-panel__header">
        <h4>장면 구성 ({scenes.length})</h4>
        <button onClick={addScene} className="copy-button" style={{ whiteSpace: 'nowrap' }}>
          + 장면 추가
        </button>
      </div>
      <div className="wizard-preview-grid">
        {scenes.map((scene, index) => (
          <div key={scene.id} className="quality-panel">
            <div className="quality-panel__header" style={{ justifyContent: 'space-between' }}>
              <strong>Scene {index + 1}</strong>
              {scenes.length > 1 && (
                <button
                  onClick={() => removeScene(scene.id)}
                  className="copy-button"
                  style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                >
                  삭제
                </button>
              )}
            </div>
            <div className="form-group">
              <label>장면 설명</label>
              <textarea
                rows={3}
                value={scene.description}
                onChange={(e) => updateScene(scene.id, { description: e.target.value })}
                className="prompt-input"
              />
            </div>
            <div className="options-grid">
              <div className="form-group">
                <label>길이 (초)</label>
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={scene.duration}
                  onChange={(e) => updateScene(scene.id, { duration: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="form-group">
                <label>카메라 무브먼트</label>
                <select
                  value={scene.camera.movement}
                  onChange={(e) => updateSceneCamera(scene.id, { movement: e.target.value as CameraSettings['movement'] })}
                  className="option-select"
                >
                  {CAMERA_MOVEMENTS.map((move) => (
                    <option key={move.value} value={move.value}>
                      {move.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>샷 타입</label>
                <select
                  value={scene.camera.shotType}
                  onChange={(e) => updateSceneCamera(scene.id, { shotType: e.target.value as CameraSettings['shotType'] })}
                  className="option-select"
                >
                  {SHOT_TYPES.map((shot) => (
                    <option key={shot.value} value={shot.value}>
                      {shot.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderWizardTechnical = () => (
    <div className="wizard-panel">
        <div className="form-group">
          <label>총 길이 (초)</label>
          <input
            type="number"
            min={10}
            max={120}
            value={technical.totalDuration}
            onChange={(e) => {
              const value = parseInt(e.target.value) || technical.totalDuration
              setTechnical({ ...technical, totalDuration: value })
            }}
          />
        </div>
        <div className="options-grid">
          <div className="form-group">
            <label>FPS</label>
            <select
              value={technical.fps}
              onChange={(e) => {
                const value = parseInt(e.target.value) as 24 | 30 | 60
                setTechnical({ ...technical, fps: value })
              }}
              className="option-select"
            >
              <option value="24">24</option>
              <option value="30">30</option>
              <option value="60">60</option>
            </select>
          </div>
          <div className="form-group">
            <label>해상도</label>
            <select
              value={technical.resolution}
              onChange={(e) => setTechnical({ ...technical, resolution: e.target.value as VideoTechnicalSettings['resolution'] })}
              className="option-select"
            >
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
              <option value="4k">4K</option>
              <option value="8k">8K</option>
            </select>
          </div>
          <div className="form-group">
            <label>종횡비</label>
            <select
              value={technical.aspectRatio}
              onChange={(e) => setTechnical({ ...technical, aspectRatio: e.target.value as VideoTechnicalSettings['aspectRatio'] })}
              className="option-select"
            >
            <option value="16:9">16:9</option>
            <option value="9:16">9:16</option>
            <option value="2.35:1">2.35:1</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={hasReferenceImage}
            onChange={(e) => setHasReferenceImage(e.target.checked)}
          />
          레퍼런스 이미지 설명 추가
        </label>
        {hasReferenceImage && (
          <textarea
            rows={3}
            value={referenceImageDescription}
            onChange={(e) => setReferenceImageDescription(e.target.value)}
            placeholder="예: 청록색 조명 아래 춤추는 실루엣 사진"
            className="prompt-input"
          />
        )}
      </div>
    </div>
  )

  const renderWizardSummary = () => (
    <div className="wizard-panel">
      <div className="wizard-preview-grid">
        <div className="quality-panel">
          <div className="quality-panel__header">
            <div>
              <p className="quality-panel__label">요약</p>
              <div className="quality-panel__score" style={{ fontSize: '1rem', color: '#000' }}>
                {selectedVideoService?.label || '-'}
              </div>
            </div>
          </div>
          <div className="quality-panel__section">
            <h4>핵심 설정</h4>
            <div className="summary-info-grid">
              <div className="summary-info-card">
                <div className="summary-info-label">장르/무드</div>
                <div className="summary-info-value">{overallStyle.genre} · {overallStyle.mood}</div>
              </div>
              <div className="summary-info-card">
                <div className="summary-info-label">장면 수</div>
                <div className="summary-info-value">{scenes.length}개 / 총 {totalDuration}초</div>
              </div>
              <div className="summary-info-card">
                <div className="summary-info-label">기술 사양</div>
                <div className="summary-info-value">{technical.resolution}, {technical.fps}fps, {technical.aspectRatio}</div>
              </div>
              <div className="summary-info-card">
                <div className="summary-info-label">레퍼런스</div>
                <div className="summary-info-value">{hasReferenceImage ? '사용' : '없음'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const handleGenerate = useCallback(() => {
    if (scenes.some(s => !s.description.trim())) {
      setError('모든 장면의 설명을 입력해주세요.')
      return
    }

    setError(null)
    setIsGenerating(true)

    setTimeout(async () => {
      try {
        const options: VideoPromptOptions = {
      category: 'video',
      userInput: scenes.map(s => s.description).join(' '),
      model,
      scenes,
      overallStyle,
      technical,
      hasReferenceImage,
      referenceImageDescription: hasReferenceImage ? referenceImageDescription : undefined,
      modelSpecific: {
        ...modelSpecific,
        sora: modelSpecific.sora || { maxDuration: technical.totalDuration, consistency: 'high' },
        sora2: modelSpecific.sora2 || { consistency: 'high', motionControl: 'moderate', promptStructure: 'detailed' },
        veo: modelSpecific.veo || { quality: 'high', extendedDuration: false },
        veo3: modelSpecific.veo3 || { quality: 'high', motionControl: 'natural', promptStructure: 'structured' },
        runway: modelSpecific.runway || { style: 'cinematic', motion: 50 },
        runwayGen3: modelSpecific.runwayGen3 || { style: 'cinematic', motion: 50, interpolation: false },
        pika: modelSpecific.pika || { motion: 50 },
        pika2: modelSpecific.pika2 || { motion: 50, promptStrength: 0.8 },
        kling: modelSpecific.kling || { duration: 10, style: 'realistic' },
      },
    }

        const generator = PromptGeneratorFactory.createVideoGenerator(model)
        const generated = generator.generate(options)

        let enrichedResults: any = {
          ...generated,
          scenes: Array.isArray(generated.scenes)
            ? generated.scenes.map((scene: any) => ({ ...scene }))
            : generated.scenes,
        }

        try {
          const translationTargets: Record<string, string | undefined> = {
            englishMetaPrompt: generated.metaPrompt,
            englishContextPrompt: generated.contextPrompt,
          }

          if (generated.fullPrompt) {
            translationTargets.englishVersion = generated.fullPrompt
          }

          if (Array.isArray(generated.scenes)) {
            generated.scenes.forEach((scene: any, index: number) => {
              if (scene?.prompt) {
                translationTargets[`scene-${index}`] = scene.prompt
              }
            })
          }

          const translations = await translateTextMap(translationTargets, { compress: true, context: 'VIDEO' })

          if (translations.englishMetaPrompt) {
            enrichedResults.englishMetaPrompt = translations.englishMetaPrompt
          }
          if (translations.englishContextPrompt) {
            enrichedResults.englishContextPrompt = translations.englishContextPrompt
          }
          if (translations.englishVersion) {
            enrichedResults.englishVersion = translations.englishVersion
          }

          if (Array.isArray(enrichedResults.scenes)) {
            enrichedResults.scenes = enrichedResults.scenes.map((scene: any, index: number) => {
              const translated = translations[`scene-${index}`]
              return translated ? { ...scene, englishPrompt: translated } : scene
            })
          }
        } catch (translationError) {
          console.warn('Gemini translation failed:', translationError)
          showNotification('동영상 프롬프트 영문 번역에 실패했습니다. 기본 버전을 표시합니다.', 'warning')
          const fallback = buildNativeEnglishFallback(generated)
          enrichedResults = { ...enrichedResults, ...fallback }
          if (Array.isArray(enrichedResults.scenes)) {
            enrichedResults.scenes = enrichedResults.scenes.map((scene: any) => ({
              ...scene,
              englishPrompt: scene.prompt ? convertToNativeEnglish(scene.prompt) : scene.englishPrompt,
            }))
          }
        }

        setResults(enrichedResults)
        
        // 로컬 스토리지에 저장 (Admin 기록용)
        savePromptRecord({
          category: 'video',
          userInput: scenes.map(s => s.description).join(' '),
          model: model,
          options: {
            genre: overallStyle.genre,
            mood: overallStyle.mood,
            totalDuration: technical.totalDuration,
            fps: technical.fps,
            resolution: technical.resolution,
            sceneCount: scenes.length,
            hasReferenceImage: hasReferenceImage,
          },
        })

        // 서버에 저장 시도 (로그인이 없으면 알림 및 실패 로그)
        if (!hasPromptSaveAuth()) {
          await reportPromptSaveFailure(
            'VIDEO',
            'unauthenticated',
            { inputPreview: scenes.map((s) => s.description).join(' ').slice(0, 120) },
            '로그인 후에만 프롬프트가 서버 DB에 저장됩니다. 로그인 후 다시 시도해주세요.'
          )
        } else {
          try {
            await promptAPI.create({
              title: `${model} 동영상 프롬프트`,
              content: generated.prompt || '',
              category: 'VIDEO',
              model: model,
              inputText: scenes.map(s => s.description).join(' '),
              options: {
                genre: overallStyle.genre,
                mood: overallStyle.mood,
                totalDuration: technical.totalDuration,
                fps: technical.fps,
                resolution: technical.resolution,
                sceneCount: scenes.length,
                hasReferenceImage: hasReferenceImage,
                scenes: (generated as any).scenes,
                englishVersion: (generated as any).englishVersion,
              },
            })
          } catch (serverError: any) {
            console.warn('서버 저장 실패:', serverError)
            await reportPromptSaveFailure('VIDEO', serverError?.message || 'server_error', {
              inputPreview: scenes.map((s) => s.description).join(' ').slice(0, 120),
            })
          }
        }
      } catch (error: any) {
        setError(`프롬프트 생성 오류: ${error.message}`)
      } finally {
        setIsGenerating(false)
      }
    }, 300)
  }, [model, overallStyle, hasReferenceImage, referenceImageDescription, technical, scenes])

  const addScene = () => {
    const newScene: VideoScene = {
      id: Date.now().toString(),
      order: scenes.length + 1,
      description: '',
      duration: 5,
      camera: {
        movement: 'static',
        shotType: 'medium',
        angle: 'eye-level',
      },
      motion: {
        speed: 'normal',
        type: 'smooth',
      },
    }
    setScenes([...scenes, newScene])
  }

  const removeScene = (id: string) => {
    const newScenes = scenes.filter(s => s.id !== id).map((s, i) => ({
      ...s,
      order: i + 1,
    }))
    setScenes(newScenes)
  }

  const updateScene = (id: string, updates: Partial<VideoScene>) => {
    setScenes(scenes.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  const updateSceneCamera = (id: string, updates: Partial<CameraSettings>) => {
    setScenes(scenes.map(s => 
      s.id === id ? { ...s, camera: { ...s.camera, ...updates } } : s
    ))
  }

  const updateSceneMotion = (id: string, updates: Partial<MotionSettings>) => {
    setScenes(scenes.map(s => 
      s.id === id ? { ...s, motion: { ...s.motion, ...updates } } : s
    ))
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

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0)

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
          {useWizardMode ? '장면 설계 과정을 단계별로 안내합니다.' : '모든 세부 옵션을 한 번에 조정합니다.'}
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

          {wizardStep === 1 && renderWizardOverview()}
          {wizardStep === 2 && renderWizardScenes()}
          {wizardStep === 3 && renderWizardTechnical()}
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
              {wizardStep === wizardStepCount ? (isGenerating ? '생성 중...' : '동영상 프롬프트 생성') : '다음 단계'}
            </button>
          </div>
        </div>
      )}

      {!useWizardMode && (
        <div className="input-section">
        {renderVideoModelSelector()}

        <div className="options-grid">
          <div className="form-group">
            <label htmlFor="genre">장르</label>
            <select
              id="genre"
              value={overallStyle.genre}
              onChange={(e) => setOverallStyle({ ...overallStyle, genre: e.target.value as VideoStyle['genre'] })}
              className="option-select"
            >
              {GENRES.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="mood">분위기</label>
            <select
              id="mood"
              value={overallStyle.mood}
              onChange={(e) => setOverallStyle({ ...overallStyle, mood: e.target.value as VideoStyle['mood'] })}
              className="option-select"
            >
              {MOODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="color-grading">색감</label>
            <select
              id="color-grading"
              value={overallStyle.colorGrading}
              onChange={(e) => setOverallStyle({ ...overallStyle, colorGrading: e.target.value as VideoStyle['colorGrading'] })}
              className="option-select"
            >
              <option value="warm">따뜻한</option>
              <option value="cool">차가운</option>
              <option value="high-contrast">고대비</option>
              <option value="desaturated">저채도</option>
              <option value="vibrant">생생한</option>
              <option value="monochrome">단색</option>
            </select>
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={overallStyle.cinematic}
                onChange={(e) => setOverallStyle({ ...overallStyle, cinematic: e.target.checked })}
                className="checkbox-input"
              />
              <span>영화적 품질</span>
            </label>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="contextual-tone">문맥적 톤앤매너 (선택사항)</label>
          <input
            id="contextual-tone"
            type="text"
            value={overallStyle.contextualTone || ''}
            onChange={(e) => setOverallStyle({ ...overallStyle, contextualTone: e.target.value })}
            placeholder="예: 서정적, 서사적, 서술적, 대화적"
            className="prompt-input"
          />
          <small style={{ display: 'block', marginTop: '4px', opacity: 0.6, fontSize: '0.85rem' }}>
            장면의 문맥적 특성을 설명하세요 (서정적, 서사적, 서술적, 대화적 등)
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="qualitative-tone">정성적 톤앤매너 (선택사항)</label>
          <input
            id="qualitative-tone"
            type="text"
            value={overallStyle.qualitativeTone || ''}
            onChange={(e) => setOverallStyle({ ...overallStyle, qualitativeTone: e.target.value })}
            placeholder="예: 따뜻한, 차가운, 부드러운, 강렬한, 우아한"
            className="prompt-input"
          />
          <small style={{ display: 'block', marginTop: '4px', opacity: 0.6, fontSize: '0.85rem' }}>
            장면의 정성적 특성을 설명하세요 (따뜻한, 차가운, 부드러운, 강렬한 등)
          </small>
        </div>

        <div className="detailed-options-section">
          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={hasReferenceImage}
                onChange={(e) => setHasReferenceImage(e.target.checked)}
                className="checkbox-input"
              />
              <span>참조 이미지 있음</span>
            </label>
          </div>

          {hasReferenceImage && (
            <div className="form-group" style={{ marginTop: '12px' }}>
              <label htmlFor="reference-image">참조 이미지 설명</label>
              <textarea
                id="reference-image"
                value={referenceImageDescription}
                onChange={(e) => setReferenceImageDescription(e.target.value)}
                placeholder="예: 고양이가 창가에서 햇빛을 받으며 자고 있는 사진을 참조하여"
                className="prompt-input"
                rows={3}
              />
              <small style={{ display: 'block', marginTop: '4px', opacity: 0.6, fontSize: '0.85rem' }}>
                참조할 이미지의 내용을 상세히 설명하세요. 이 설명이 프롬프트에 반영됩니다.
              </small>
            </div>
          )}
        </div>

        <div className="options-grid">
          <div className="form-group">
            <label htmlFor="fps">프레임레이트</label>
            <select
              id="fps"
              value={technical.fps}
              onChange={(e) => setTechnical({ ...technical, fps: parseInt(e.target.value) as 24 | 30 | 60 })}
              className="option-select"
            >
              <option value="24">24fps</option>
              <option value="30">30fps</option>
              <option value="60">60fps</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="resolution">해상도</label>
            <select
              id="resolution"
              value={technical.resolution}
              onChange={(e) => setTechnical({ ...technical, resolution: e.target.value as VideoTechnicalSettings['resolution'] })}
              className="option-select"
            >
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
              <option value="4k">4K</option>
              <option value="8k">8K</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="aspect-ratio">아스펙트 비율</label>
            <select
              id="aspect-ratio"
              value={technical.aspectRatio}
              onChange={(e) => setTechnical({ ...technical, aspectRatio: e.target.value as VideoTechnicalSettings['aspectRatio'] })}
              className="option-select"
            >
              <option value="16:9">16:9</option>
              <option value="21:9">21:9</option>
              <option value="1:1">1:1</option>
              <option value="9:16">9:16</option>
            </select>
          </div>

          <div className="form-group">
            <label>총 길이: {totalDuration}초</label>
            <input
              type="range"
              min="5"
              max="120"
              value={technical.totalDuration}
              onChange={(e) => setTechnical({ ...technical, totalDuration: parseInt(e.target.value) })}
              className="option-select"
            />
          </div>
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <label style={{ marginBottom: 0 }}>스토리보드 (장면 구성)</label>
            <button onClick={addScene} className="copy-button" style={{ whiteSpace: 'nowrap' }}>
              + 장면 추가
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {scenes.map((scene) => (
              <div key={scene.id} style={{ border: '1px solid #000000', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 500 }}>장면 {scene.order}</h4>
                  {scenes.length > 1 && (
                    <button
                      onClick={() => removeScene(scene.id)}
                      className="copy-button"
                      style={{ padding: '4px 12px', fontSize: '0.85rem' }}
                    >
                      삭제
                    </button>
                  )}
                </div>

                <div className="form-group">
                  <label>장면 설명</label>
                  <textarea
                    value={scene.description}
                    onChange={(e) => updateScene(scene.id, { description: e.target.value })}
                    placeholder="예: 고양이가 창가에서 햇빛을 받으며 자고 있는 모습"
                    className="prompt-input"
                    rows={2}
                  />
                </div>

                <div className="options-grid">
                  <div className="form-group">
                    <label>길이 (초)</label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={scene.duration}
                      onChange={(e) => updateScene(scene.id, { duration: parseInt(e.target.value) || 1 })}
                      className="option-select"
                    />
                  </div>

                  <div className="form-group">
                    <label>카메라 움직임</label>
                    <select
                      value={scene.camera.movement}
                      onChange={(e) => updateSceneCamera(scene.id, { movement: e.target.value as CameraSettings['movement'] })}
                      className="option-select"
                    >
                      {CAMERA_MOVEMENTS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>샷 타입</label>
                    <select
                      value={scene.camera.shotType}
                      onChange={(e) => updateSceneCamera(scene.id, { shotType: e.target.value as CameraSettings['shotType'] })}
                      className="option-select"
                    >
                      {SHOT_TYPES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>모션 속도</label>
                    <select
                      value={scene.motion.speed}
                      onChange={(e) => updateSceneMotion(scene.id, { speed: e.target.value as MotionSettings['speed'] })}
                      className="option-select"
                    >
                      {MOTION_SPEEDS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="detailed-options-section">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="toggle-options-button"
          >
            {showAdvanced ? '▼' : '▶'} 모델별 고급 프롬프트 엔지니어링 옵션 {showAdvanced ? '접기' : '펼치기'}
          </button>

          {showAdvanced && (
            <div className="detailed-options" style={{ marginTop: '16px' }}>
              {/* Sora 2 옵션 */}
              {(model === 'sora-2' || model === 'sora') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #000' }}>
                  <h4 style={{ marginBottom: '8px', fontSize: '16px', fontWeight: '600' }}>Sora 2 프롬프트 엔지니어링 옵션</h4>
                  <div className="form-group">
                    <label htmlFor="sora2-consistency">일관성 (Consistency)</label>
                    <select
                      id="sora2-consistency"
                      value={modelSpecific.sora2?.consistency || modelSpecific.sora?.consistency || 'high'}
                      onChange={(e) => setModelSpecific({
                        ...modelSpecific,
                        sora2: { ...modelSpecific.sora2, consistency: e.target.value },
                        sora: { ...modelSpecific.sora, consistency: e.target.value }
                      })}
                      className="option-select"
                    >
                      <option value="high">High (높음)</option>
                      <option value="medium">Medium (중간)</option>
                      <option value="low">Low (낮음)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="sora2-motion">모션 제어</label>
                    <select
                      id="sora2-motion"
                      value={modelSpecific.sora2?.motionControl || 'moderate'}
                      onChange={(e) => setModelSpecific({
                        ...modelSpecific,
                        sora2: { ...modelSpecific.sora2, motionControl: e.target.value }
                      })}
                      className="option-select"
                    >
                      <option value="subtle">Subtle (미묘한)</option>
                      <option value="moderate">Moderate (중간)</option>
                      <option value="dynamic">Dynamic (역동적)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="sora2-structure">프롬프트 구조</label>
                    <select
                      id="sora2-structure"
                      value={modelSpecific.sora2?.promptStructure || 'detailed'}
                      onChange={(e) => setModelSpecific({
                        ...modelSpecific,
                        sora2: { ...modelSpecific.sora2, promptStructure: e.target.value }
                      })}
                      className="option-select"
                    >
                      <option value="simple">Simple (간단)</option>
                      <option value="detailed">Detailed (상세)</option>
                      <option value="scene-by-scene">Scene-by-Scene (장면별)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Veo 3 옵션 */}
              {(model === 'veo-3' || model === 'veo') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #000' }}>
                  <h4 style={{ marginBottom: '8px', fontSize: '16px', fontWeight: '600' }}>Veo 3 프롬프트 엔지니어링 옵션</h4>
                  <div className="form-group">
                    <label htmlFor="veo3-quality">품질</label>
                    <select
                      id="veo3-quality"
                      value={modelSpecific.veo3?.quality || modelSpecific.veo?.quality || 'high'}
                      onChange={(e) => setModelSpecific({
                        ...modelSpecific,
                        veo3: { ...modelSpecific.veo3, quality: e.target.value },
                        veo: { ...modelSpecific.veo, quality: e.target.value }
                      })}
                      className="option-select"
                    >
                      <option value="standard">Standard</option>
                      <option value="high">High</option>
                      <option value="ultra">Ultra</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="veo3-motion">모션 제어</label>
                    <select
                      id="veo3-motion"
                      value={modelSpecific.veo3?.motionControl || 'natural'}
                      onChange={(e) => setModelSpecific({
                        ...modelSpecific,
                        veo3: { ...modelSpecific.veo3, motionControl: e.target.value }
                      })}
                      className="option-select"
                    >
                      <option value="precise">Precise (정밀한)</option>
                      <option value="natural">Natural (자연스러운)</option>
                      <option value="dynamic">Dynamic (역동적)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="veo3-structure">프롬프트 구조</label>
                    <select
                      id="veo3-structure"
                      value={modelSpecific.veo3?.promptStructure || 'structured'}
                      onChange={(e) => setModelSpecific({
                        ...modelSpecific,
                        veo3: { ...modelSpecific.veo3, promptStructure: e.target.value }
                      })}
                      className="option-select"
                    >
                      <option value="simple">Simple (간단)</option>
                      <option value="structured">Structured (구조화)</option>
                      <option value="detailed">Detailed (상세)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={modelSpecific.veo3?.extendedDuration || false}
                        onChange={(e) => setModelSpecific({
                          ...modelSpecific,
                          veo3: { ...modelSpecific.veo3, extendedDuration: e.target.checked }
                        })}
                      />
                      {' '}Extended Duration (최대 60초)
                    </label>
                  </div>
                </div>
              )}

              {/* Runway Gen-3 옵션 */}
              {(model === 'runway-gen3' || model === 'runway') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #000' }}>
                  <h4 style={{ marginBottom: '8px', fontSize: '16px', fontWeight: '600' }}>Runway Gen-3 프롬프트 엔지니어링 옵션</h4>
                  <div className="form-group">
                    <label htmlFor="runway-style">스타일</label>
                    <select
                      id="runway-style"
                      value={modelSpecific.runwayGen3?.style || modelSpecific.runway?.style || 'cinematic'}
                      onChange={(e) => setModelSpecific({
                        ...modelSpecific,
                        runwayGen3: { ...modelSpecific.runwayGen3, style: e.target.value },
                        runway: { ...modelSpecific.runway, style: e.target.value }
                      })}
                      className="option-select"
                    >
                      <option value="cinematic">Cinematic (영화적)</option>
                      <option value="realistic">Realistic (리얼리즘)</option>
                      <option value="artistic">Artistic (예술적)</option>
                      <option value="documentary">Documentary (다큐멘터리)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="runway-motion">모션: {modelSpecific.runwayGen3?.motion || modelSpecific.runway?.motion || 50}</label>
                    <input
                      type="range"
                      id="runway-motion"
                      min="0"
                      max="100"
                      value={modelSpecific.runwayGen3?.motion || modelSpecific.runway?.motion || 50}
                      onChange={(e) => setModelSpecific({
                        ...modelSpecific,
                        runwayGen3: { ...modelSpecific.runwayGen3, motion: parseInt(e.target.value) },
                        runway: { ...modelSpecific.runway, motion: parseInt(e.target.value) }
                      })}
                      className="option-select"
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={modelSpecific.runwayGen3?.interpolation || false}
                        onChange={(e) => setModelSpecific({
                          ...modelSpecific,
                          runwayGen3: { ...modelSpecific.runwayGen3, interpolation: e.target.checked }
                        })}
                      />
                      {' '}Frame Interpolation (프레임 보간)
                    </label>
                  </div>
                </div>
              )}

              {/* Pika Labs 2.0 옵션 */}
              {(model === 'pika-2' || model === 'pika') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #000' }}>
                  <h4 style={{ marginBottom: '8px', fontSize: '16px', fontWeight: '600' }}>Pika Labs 2.0 프롬프트 엔지니어링 옵션</h4>
                  <div className="form-group">
                    <label htmlFor="pika2-motion">모션: {modelSpecific.pika2?.motion || modelSpecific.pika?.motion || 50}</label>
                    <input
                      type="range"
                      id="pika2-motion"
                      min="0"
                      max="100"
                      value={modelSpecific.pika2?.motion || modelSpecific.pika?.motion || 50}
                      onChange={(e) => setModelSpecific({
                        ...modelSpecific,
                        pika2: { ...modelSpecific.pika2, motion: parseInt(e.target.value) },
                        pika: { ...modelSpecific.pika, motion: parseInt(e.target.value) }
                      })}
                      className="option-select"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="pika2-strength">Prompt Strength: {modelSpecific.pika2?.promptStrength || 0.8}</label>
                    <input
                      type="range"
                      id="pika2-strength"
                      min="0"
                      max="1"
                      step="0.1"
                      value={modelSpecific.pika2?.promptStrength || 0.8}
                      onChange={(e) => setModelSpecific({
                        ...modelSpecific,
                        pika2: { ...modelSpecific.pika2, promptStrength: parseFloat(e.target.value) }
                      })}
                      className="option-select"
                    />
                  </div>
                </div>
              )}

              {/* Kling AI 옵션 */}
              {model === 'kling' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #000' }}>
                  <h4 style={{ marginBottom: '8px', fontSize: '16px', fontWeight: '600' }}>Kling AI 프롬프트 엔지니어링 옵션</h4>
                  <div className="form-group">
                    <label htmlFor="kling-duration">길이</label>
                    <select
                      id="kling-duration"
                      value={modelSpecific.kling?.duration || 10}
                      onChange={(e) => setModelSpecific({
                        ...modelSpecific,
                        kling: { ...modelSpecific.kling, duration: parseInt(e.target.value) }
                      })}
                      className="option-select"
                    >
                      <option value={5}>5초</option>
                      <option value={10}>10초</option>
                      <option value={15}>15초</option>
                      <option value={30}>30초</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="kling-style">스타일</label>
                    <select
                      id="kling-style"
                      value={modelSpecific.kling?.style || 'realistic'}
                      onChange={(e) => setModelSpecific({
                        ...modelSpecific,
                        kling: { ...modelSpecific.kling, style: e.target.value }
                      })}
                      className="option-select"
                    >
                      <option value="realistic">Realistic</option>
                      <option value="artistic">Artistic</option>
                      <option value="cinematic">Cinematic</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleGenerate}
          className="generate-button"
          disabled={isGenerating}
          aria-busy={isGenerating}
        >
          {isGenerating ? '생성 중...' : '동영상 프롬프트 생성하기'}
        </button>
      </div>
      )}

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
      {isGenerating && <LoadingSpinner message="동영상 프롬프트를 생성하고 있습니다..." />}

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
          {results.scenes && Array.isArray(results.scenes) && (
            <div className="hashtags-card">
              <h3>장면별 프롬프트</h3>
              {results.scenes.map((scene: any, index: number) => (
                <div key={scene.order || index} style={{ marginBottom: '16px', padding: '12px', border: '1px solid #000000' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>
                    장면 {scene.order} ({scene.duration}초)
                  </h4>
                  <ScenePromptDisplay scene={scene} index={index} />
                </div>
              ))}
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

export default VideoPromptGenerator
