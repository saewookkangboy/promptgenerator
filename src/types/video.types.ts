// 동영상 생성 관련 타입 정의

import { BasePromptOptions } from './prompt.types'

export type VideoModel = 
  | 'sora' 
  | 'sora-2' // OpenAI Sora 2
  | 'veo' 
  | 'veo-3' // Google Veo 3
  | 'runway' 
  | 'runway-gen3' // Runway Gen-3
  | 'pika' 
  | 'pika-2' // Pika Labs 2.0
  | 'stable-video'
  | 'kling' // Kling AI
  | 'luma' // Luma Dream Machine

export interface VideoPromptOptions extends BasePromptOptions {
  category: 'video'
  model: VideoModel
  scenes: VideoScene[]
  overallStyle: VideoStyle
  technical: VideoTechnicalSettings
  hasReferenceImage?: boolean // 참조 이미지 유무
  referenceImageDescription?: string // 참조 이미지 설명
  modelSpecific?: VideoModelSpecificOptions
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
  contextualTone?: string // 문맥적 톤앤매너
  qualitativeTone?: string // 정성적 톤앤매너
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
    aspectRatio?: '16:9' | '9:16' | '1:1'
  }
  sora2?: {
    // OpenAI Sora 2 프롬프트 엔지니어링 옵션
    maxDuration: number // 최대 60초
    consistency: 'high' | 'medium' | 'low'
    aspectRatio?: '16:9' | '9:16' | '1:1' | '21:9'
    promptStructure?: 'simple' | 'detailed' | 'scene-by-scene'
    styleReference?: string
    motionControl?: 'subtle' | 'moderate' | 'dynamic'
    temporalConsistency?: number // 0-1
  }
  veo?: {
    quality: 'standard' | 'high'
    extendedDuration?: boolean
  }
  veo3?: {
    // Google Veo 3 프롬프트 엔지니어링 옵션
    quality: 'standard' | 'high' | 'ultra'
    extendedDuration?: boolean // 최대 60초
    aspectRatio?: '16:9' | '9:16' | '1:1' | '21:9'
    promptStructure?: 'simple' | 'structured' | 'detailed'
    styleReference?: string
    motionControl?: 'precise' | 'natural' | 'dynamic'
    frameConsistency?: number // 0-1
    seed?: number
  }
  runway?: {
    style: string
    motion: number // 0-100
  }
  runwayGen3?: {
    // Runway Gen-3 프롬프트 엔지니어링 옵션
    style?: 'cinematic' | 'realistic' | 'artistic' | 'documentary'
    motion: number // 0-100
    aspectRatio?: '16:9' | '9:16' | '1:1' | '21:9'
    promptStructure?: 'simple' | 'detailed'
    styleReference?: string
    interpolation?: boolean // 프레임 보간
    seed?: number
  }
  pika?: {
    motion?: number // 0-100
    aspectRatio?: '16:9' | '9:16' | '1:1'
  }
  pika2?: {
    // Pika Labs 2.0 프롬프트 엔지니어링 옵션
    motion?: number // 0-100
    aspectRatio?: '16:9' | '9:16' | '1:1'
    promptStrength?: number // 0-1
    styleReference?: string
    frameRate?: 24 | 30 | 60
    seed?: number
  }
  stableVideo?: {
    motionBuckets?: number // 1-127
    condAugStrength?: number // 0-1
    decodingT?: number // 1-12
  }
  kling?: {
    // Kling AI 프롬프트 엔지니어링 옵션
    aspectRatio?: '16:9' | '9:16' | '1:1'
    duration?: 5 | 10 | 15 | 30
    style?: 'realistic' | 'artistic' | 'cinematic'
    motionControl?: 'subtle' | 'moderate' | 'dynamic'
    seed?: number
  }
  luma?: {
    // Luma Dream Machine 프롬프트 엔지니어링 옵션
    aspectRatio?: '16:9' | '9:16' | '1:1'
    duration?: 5 | 10 | 15
    style?: 'realistic' | 'artistic' | 'cinematic'
    motionControl?: 'subtle' | 'moderate' | 'dynamic'
    seed?: number
  }
}

