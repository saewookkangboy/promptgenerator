// 동영상 프롬프트 생성기 기본 클래스

import { BasePromptGenerator } from '../base/BasePromptGenerator'
import { VideoPromptOptions, CameraSettings, MotionSettings, TransitionSettings, VideoStyle } from '../../types/video.types'
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
}

