// 동영상 프롬프트 생성 UI 컴포넌트

import { useState } from 'react'
import { VideoPromptOptions, VideoModel, VideoScene, CameraSettings, MotionSettings, VideoStyle, VideoTechnicalSettings } from '../types/video.types'
import { PromptResult } from '../types/prompt.types'
import { PromptGeneratorFactory } from '../generators/factory/PromptGeneratorFactory'
import ResultCard from './ResultCard'
import './PromptGenerator.css'

const VIDEO_MODELS: { value: VideoModel; label: string }[] = [
  { value: 'sora', label: 'OpenAI Sora 2' },
  { value: 'veo', label: 'Google Veo 3' },
  { value: 'runway', label: 'Runway Gen-3' },
  { value: 'pika', label: 'Pika Labs' },
  { value: 'stable-video', label: 'Stable Video Diffusion' },
]

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

function VideoPromptGenerator() {
  const [model, setModel] = useState<VideoModel>('sora')
  const [overallStyle, setOverallStyle] = useState<VideoStyle>({
    genre: 'drama',
    mood: 'peaceful',
    colorGrading: 'warm',
    cinematic: true,
  })
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

  const handleGenerate = () => {
    if (scenes.some(s => !s.description.trim())) {
      alert('모든 장면의 설명을 입력해주세요.')
      return
    }

    const options: VideoPromptOptions = {
      category: 'video',
      userInput: scenes.map(s => s.description).join(' '),
      model,
      scenes,
      overallStyle,
      technical,
      modelSpecific: {
        sora: {
          maxDuration: technical.totalDuration,
          consistency: 'high',
        },
        veo: {
          quality: 'high',
          extendedDuration: false,
        },
      },
    }

    const generator = PromptGeneratorFactory.createVideoGenerator(model)
    const generated = generator.generate(options)
    setResults(generated)
  }

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

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0)

  return (
    <div className="prompt-generator">
      <div className="input-section">
        <div className="form-group">
          <label htmlFor="video-model">동영상 생성 모델</label>
          <select
            id="video-model"
            value={model}
            onChange={(e) => setModel(e.target.value as VideoModel)}
            className="content-type-select"
          >
            {VIDEO_MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

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

        <button onClick={handleGenerate} className="generate-button">
          동영상 프롬프트 생성하기
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
          {results.scenes && Array.isArray(results.scenes) && (
            <div className="hashtags-card">
              <h3>장면별 프롬프트</h3>
              {results.scenes.map((scene: any, index: number) => (
                <div key={scene.order || index} style={{ marginBottom: '16px', padding: '12px', border: '1px solid #000000' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>장면 {scene.order} ({scene.duration}초)</h4>
                  <pre style={{ margin: 0, fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{scene.prompt}</pre>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(scene.prompt)
                      alert('장면 프롬프트가 복사되었습니다!')
                    }}
                    className="copy-button"
                    style={{ marginTop: '8px', padding: '6px 12px', fontSize: '0.85rem' }}
                  >
                    복사
                  </button>
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

export default VideoPromptGenerator

