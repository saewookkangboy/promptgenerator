// 이미지 프롬프트 생성 UI 컴포넌트

import { useState } from 'react'
import { ImagePromptOptions, ImageModel, ImageStyle, Composition, Lighting, ColorPalette, TechnicalSettings } from '../types/image.types'
import { PromptResult } from '../types/prompt.types'
import { PromptGeneratorFactory } from '../generators/factory/PromptGeneratorFactory'
import ResultCard from './ResultCard'
import './PromptGenerator.css'

const IMAGE_MODELS: { value: ImageModel; label: string }[] = [
  { value: 'midjourney', label: 'Midjourney' },
  { value: 'dalle', label: 'DALL-E 3' },
  { value: 'stable-diffusion', label: 'Stable Diffusion' },
  { value: 'imagen', label: 'Google Imagen' },
  { value: 'firefly', label: 'Adobe Firefly' },
]

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

function ImagePromptGenerator() {
  const [model, setModel] = useState<ImageModel>('midjourney')
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

  const handleGenerate = () => {
    if (!subject.trim()) {
      alert('주제를 입력해주세요.')
      return
    }

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
        midjourney: {
          version: 6,
          chaos: 0,
        },
        dalle: {
          style: 'vivid',
          size: '1024x1024',
        },
      },
    }

    const generator = PromptGeneratorFactory.createImageGenerator(model)
    const generated = generator.generate(options)
    setResults(generated)
  }

  const addNegativePrompt = () => {
    if (negativeInput.trim()) {
      setNegativePrompt([...negativePrompt, negativeInput.trim()])
      setNegativeInput('')
    }
  }

  const removeNegativePrompt = (index: number) => {
    setNegativePrompt(negativePrompt.filter((_, i) => i !== index))
  }

  return (
    <div className="prompt-generator">
      <div className="input-section">
        <div className="form-group">
          <label htmlFor="image-model">이미지 생성 모델</label>
          <select
            id="image-model"
            value={model}
            onChange={(e) => setModel(e.target.value as ImageModel)}
            className="content-type-select"
          >
            {IMAGE_MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

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
            value={style.artStyle}
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
            </div>
          )}
        </div>

        <button onClick={handleGenerate} className="generate-button">
          이미지 프롬프트 생성하기
        </button>
      </div>

      {results && (
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
            <ResultCard
              title="전체 프롬프트 (복사용)"
              content={results.fullPrompt}
            />
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

export default ImagePromptGenerator

