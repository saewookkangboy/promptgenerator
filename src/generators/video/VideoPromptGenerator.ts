// 동영상 프롬프트 생성기 기본 클래스

import { BasePromptGenerator } from '../base/BasePromptGenerator'
import {
  VideoPromptOptions,
  CameraSettings,
  MotionSettings,
  TransitionSettings,
  VideoStyle,
  VideoToneProfile,
} from '../../types/video.types'
import { PromptResult } from '../../types/prompt.types'

export abstract class VideoPromptGenerator extends BasePromptGenerator {
  abstract generate(options: VideoPromptOptions): PromptResult

  /**
   * 카메라 설정을 문자열로 변환
   */
  protected formatCamera(camera: CameraSettings): string {
    const movementMap: Record<string, string> = {
      'static': 'static camera, no movement',
      'dolly': 'dolly shot, smooth forward/backward movement',
      'pan': 'pan shot, horizontal camera movement',
      'tilt': 'tilt shot, vertical camera movement',
      'zoom': 'zoom in/out, focal length change',
      'tracking': 'tracking shot, camera follows subject',
      'orbit': 'orbiting camera, circular movement around subject',
      'crane': 'crane shot, vertical camera movement',
    }

    const shotMap: Record<string, string> = {
      'extreme-close': 'extreme close-up shot',
      'close-up': 'close-up shot',
      'medium': 'medium shot',
      'wide': 'wide shot',
      'extreme-wide': 'extreme wide shot, establishing shot',
      'establishing': 'establishing shot, wide view',
    }

    const angleMap: Record<string, string> = {
      'eye-level': 'eye level angle',
      'high-angle': 'high angle shot, looking down',
      'low-angle': 'low angle shot, looking up',
      'bird-eye': 'bird\'s eye view, overhead',
      'dutch': 'dutch angle, tilted camera',
    }

    const parts: string[] = []
    
    if (camera.movement !== 'static') {
      parts.push(movementMap[camera.movement] || camera.movement)
    }
    
    parts.push(shotMap[camera.shotType] || camera.shotType)
    parts.push(angleMap[camera.angle] || camera.angle)
    
    if (camera.speed) {
      const speedMap: Record<string, string> = {
        'slow': 'slow camera movement',
        'normal': 'normal camera speed',
        'fast': 'fast camera movement',
      }
      parts.push(speedMap[camera.speed])
    }
    
    return parts.filter(Boolean).join(', ')
  }

  /**
   * 모션 설정을 문자열로 변환
   */
  protected formatMotion(motion: MotionSettings): string {
    const speedMap: Record<string, string> = {
      'slow-motion': 'slow motion, cinematic',
      'normal': 'normal speed',
      'fast': 'fast-paced, dynamic',
      'time-lapse': 'time-lapse effect, accelerated',
    }

    const typeMap: Record<string, string> = {
      'smooth': 'smooth motion, fluid',
      'jerky': 'jerky motion, handheld',
      'fluid': 'fluid motion, elegant',
      'static': 'static, no movement',
    }

    const parts: string[] = []
    parts.push(speedMap[motion.speed] || motion.speed)
    parts.push(typeMap[motion.type] || motion.type)
    
    if (motion.direction) {
      parts.push(`${motion.direction} direction`)
    }
    
    return parts.filter(Boolean).join(', ')
  }

  /**
   * 전환 효과를 문자열로 변환
   */
  protected formatTransition(transition: TransitionSettings): string {
    const transitionMap: Record<string, string> = {
      'cut': 'hard cut',
      'fade': 'fade transition',
      'dissolve': 'cross dissolve',
      'wipe': 'wipe transition',
      'slide': 'slide transition',
      'zoom': 'zoom transition',
    }

    return `${transitionMap[transition.type] || transition.type}, ${transition.duration}s duration`
  }

  /**
   * 스타일을 문자열로 변환
   */
  protected formatStyle(style: VideoStyle): string {
    const genreMap: Record<string, string> = {
      'action': 'action genre, fast-paced',
      'drama': 'dramatic, emotional',
      'comedy': 'comedic, light-hearted',
      'horror': 'horror genre, suspenseful',
      'sci-fi': 'sci-fi, futuristic',
      'documentary': 'documentary style, realistic',
      'music-video': 'music video style, artistic',
    }

    const moodMap: Record<string, string> = {
      'tense': 'tense atmosphere, suspenseful',
      'peaceful': 'peaceful, serene',
      'dynamic': 'dynamic, energetic',
      'melancholic': 'melancholic, somber',
      'energetic': 'energetic, vibrant',
      'mysterious': 'mysterious, enigmatic',
    }

    const colorMap: Record<string, string> = {
      'warm': 'warm color grading',
      'cool': 'cool color grading',
      'high-contrast': 'high contrast color grading',
      'desaturated': 'desaturated colors',
      'vibrant': 'vibrant colors',
      'monochrome': 'monochrome, black and white',
    }

    const parts: string[] = []
    parts.push(genreMap[style.genre] || style.genre)
    parts.push(moodMap[style.mood] || style.mood)
    parts.push(colorMap[style.colorGrading] || style.colorGrading)
    
    if (style.cinematic) {
      parts.push('cinematic quality, film-like')
    }
    
    return parts.filter(Boolean).join(', ')
  }

  /**
   * 톤 분석
   */
  protected analyzeTone(options: VideoPromptOptions): VideoToneProfile {
    const combinedText = `${options.userInput} ${options.scenes.map(scene => scene.description).join(' ')}`.toLowerCase()

    const toneMap: { label: string; keywords: string[] }[] = [
      { label: '따뜻하고 서정적인 톤', keywords: ['sunset', 'golden', 'nostalgic', '평온', '잔잔', '따뜻'] },
      { label: '차갑고 미니멀한 톤', keywords: ['neon', 'cyber', '차가운', '도시', 'minimal'] },
      { label: '역동적이고 에너제틱한 톤', keywords: ['fast', 'dynamic', 'energetic', '격렬', '스피드'] },
      { label: '어둡고 미스터리한 톤', keywords: ['dark', 'mysterious', 'shadow', '비밀', '긴장'] },
    ]

    const emotionMap: { label: string; keywords: string[] }[] = [
      { label: '희망적이고 고무적인 감정선', keywords: ['hope', 'bright', 'uplifting', '희망', '긍정'] },
      { label: '감성적이고 서정적인 감정선', keywords: ['tender', 'emotional', 'poetic', '감성', '서정'] },
      { label: '긴장감 넘치는 감정선', keywords: ['tense', 'thrill', 'chase', '긴박', '위기'] },
      { label: '우울하고 내면적인 감정선', keywords: ['melancholic', 'solitude', '비', '눈물'] },
    ]

    const detectLabel = (maps: { label: string; keywords: string[] }[], fallback: string) => {
      for (const entry of maps) {
        if (entry.keywords.some(keyword => combinedText.includes(keyword))) {
          return entry.label
        }
      }
      return fallback
    }

    const moodFallbackMap: Record<VideoStyle['mood'], string> = {
      tense: '긴장감 있는 서스펜스 톤',
      peaceful: '차분하고 평온한 톤',
      dynamic: '리드미컬하고 역동적인 톤',
      melancholic: '감성적이고 쓸쓸한 톤',
      energetic: '강렬하고 에너지 넘치는 톤',
      mysterious: '어둡고 미스터리한 톤',
    }

    const contextTone = detectLabel(toneMap, moodFallbackMap[options.overallStyle.mood])
    const emotionalTone = detectLabel(emotionMap, moodFallbackMap[options.overallStyle.mood])

    const descriptiveKeywords = toneMap
      .filter(entry => entry.label === contextTone)
      .flatMap(entry => entry.keywords.slice(0, 3))
      .slice(0, 3)

    const sensoryFocus = contextTone.includes('따뜻') || emotionalTone.includes('감성')
      ? '빛, 공기감, 촉감과 같은 감각 묘사를 강조'
      : '질감, 대비, 음향과 같은 시각/청각 디테일을 강조'

    const pacing = options.overallStyle.mood === 'dynamic' || options.overallStyle.genre === 'action'
      ? '빠른 호흡과 리듬감을 유지'
      : '호흡 조절과 감정선 축적을 중시'

    return {
      contextTone,
      emotionalTone,
      descriptiveKeywords: descriptiveKeywords.length > 0 ? descriptiveKeywords : ['detail-rich', 'immersive'],
      sensoryFocus,
      pacing,
    }
  }
}


