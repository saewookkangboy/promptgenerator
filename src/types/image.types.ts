// 이미지 생성 관련 타입 정의

import { BasePromptOptions } from './prompt.types'

export type ImageModel = 
  | 'midjourney' 
  | 'dalle' 
  | 'stable-diffusion' 
  | 'imagen' 
  | 'firefly'

export interface ImagePromptOptions extends BasePromptOptions {
  category: 'image'
  model: ImageModel
  subject: string
  style: ImageStyle
  composition: Composition
  lighting: Lighting
  color: ColorPalette
  technical: TechnicalSettings
  negativePrompt?: string[]
  modelSpecific?: ModelSpecificOptions
}

export interface ImageStyle {
  artStyle: 'realistic' | 'illustration' | '3d-render' | 'watercolor' | 'oil-painting' | 'digital-art' | 'photography' | 'custom'
  medium?: string
  technique?: string
  era?: 'classic' | 'modern' | 'futuristic' | 'vintage'
  customStyle?: string
}

export interface Composition {
  rule: 'rule-of-thirds' | 'golden-ratio' | 'symmetry' | 'centered' | 'dynamic'
  framing: 'close-up' | 'medium-shot' | 'wide-shot' | 'extreme-wide' | 'dutch-angle'
  perspective?: 'eye-level' | 'bird-eye' | 'worm-eye' | 'aerial'
}

export interface Lighting {
  type: 'natural' | 'studio' | 'dramatic' | 'soft' | 'harsh' | 'rim' | 'backlit'
  direction: 'front' | 'side' | 'back' | 'top' | 'bottom'
  intensity: number // 0-100
  color?: 'warm' | 'cool' | 'neutral' | 'golden-hour' | 'blue-hour'
}

export interface ColorPalette {
  primary: string[]
  mood: 'vibrant' | 'muted' | 'monochrome' | 'pastel' | 'high-contrast' | 'warm' | 'cool'
  harmony?: 'complementary' | 'analogous' | 'triadic' | 'monochromatic'
}

export interface TechnicalSettings {
  aspectRatio: '1:1' | '4:3' | '16:9' | '21:9' | '9:16' | 'custom'
  quality: number // 1-5
  resolution?: '512x512' | '1024x1024' | '2048x2048' | '4096x4096'
  customAspectRatio?: string
}

export interface ModelSpecificOptions {
  midjourney?: {
    version: number // 4, 5, 6
    chaos: number // 0-100
    seed?: number
    style?: 'raw' | 'default'
    quality?: number // 0.25, 0.5, 1, 2
  }
  stableDiffusion?: {
    cfgScale: number // 1-20
    steps: number // 10-150
    sampler: 'euler' | 'dpm' | 'ddim' | 'plms'
    lora?: string[]
  }
  dalle?: {
    style: 'vivid' | 'natural'
    size: '1024x1024' | '1792x1024' | '1024x1792'
  }
  imagen?: {
    safetyFilter?: 'block_few' | 'block_some' | 'block_most'
    personGeneration?: 'allow_all' | 'allow_adult' | 'dont_allow'
  }
}

