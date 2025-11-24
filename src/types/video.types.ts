// 동영상 생성 관련 타입 정의

import { BasePromptOptions } from './prompt.types'

export type VideoModel = 
  | 'sora' 
  | 'veo' 
  | 'runway' 
  | 'pika' 
  | 'stable-video'

export interface VideoPromptOptions extends BasePromptOptions {
  category: 'video'
  model: VideoModel
  scenes: VideoScene[]
  overallStyle: VideoStyle
  technical: VideoTechnicalSettings
  modelSpecific?: VideoModelSpecificOptions
  hasReferenceImage?: boolean
}

export interface VideoScene {
  id: string
  order: number
  description: string
  duration: number // seconds
  camera: CameraSettings
  motion: MotionSettings
  transition?: TransitionSettings
}

export interface CameraSettings {
  movement: 'static' | 'dolly' | 'pan' | 'tilt' | 'zoom' | 'tracking' | 'orbit' | 'crane'
  shotType: 'extreme-close' | 'close-up' | 'medium' | 'wide' | 'extreme-wide' | 'establishing'
  angle: 'eye-level' | 'high-angle' | 'low-angle' | 'bird-eye' | 'dutch'
  speed?: 'slow' | 'normal' | 'fast'
}

export interface MotionSettings {
  speed: 'slow-motion' | 'normal' | 'fast' | 'time-lapse'
  type: 'smooth' | 'jerky' | 'fluid' | 'static'
  direction?: 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down'
}

export interface TransitionSettings {
  type: 'cut' | 'fade' | 'dissolve' | 'wipe' | 'slide' | 'zoom'
  duration: number // seconds
}

export interface VideoStyle {
  genre: 'action' | 'drama' | 'comedy' | 'horror' | 'sci-fi' | 'documentary' | 'music-video'
  mood: 'tense' | 'peaceful' | 'dynamic' | 'melancholic' | 'energetic' | 'mysterious'
  colorGrading: 'warm' | 'cool' | 'high-contrast' | 'desaturated' | 'vibrant' | 'monochrome'
  cinematic?: boolean
}

export interface VideoTechnicalSettings {
  totalDuration: number // seconds
  fps: 24 | 30 | 60
  resolution: '720p' | '1080p' | '4k' | '8k'
  aspectRatio: '16:9' | '21:9' | '1:1' | '9:16'
}

export interface VideoModelSpecificOptions {
  sora?: {
    maxDuration: number
    consistency: 'high' | 'medium' | 'low'
  }
  veo?: {
    quality: 'standard' | 'high'
    extendedDuration?: boolean
  }
  runway?: {
    style: string
    motion: number // 0-100
  }
}

export interface VideoToneProfile {
  contextTone: string
  emotionalTone: string
  descriptiveKeywords: string[]
  sensoryFocus: string
  pacing: string
}

