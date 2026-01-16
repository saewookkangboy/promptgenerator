// 이미지 생성 관련 타입 정의

import { BasePromptOptions } from './prompt.types'

export type ImageModel = 
  | 'midjourney' 
  | 'dalle' 
  | 'dalle-3'
  | 'stable-diffusion' 
  | 'imagen' 
  | 'imagen-3' // Google Imagen 3 (Nano Banana Pro)
  | 'nano-banana-pro' // Nano Banana Pro (Gemini 3)
  | 'firefly'
  | 'leonardo' // Leonardo AI
  | 'flux' // Flux
  | 'flux-2-pro' // Flux.2 Pro
  | 'flux-2-ultra' // Flux.2 Ultra
  | 'ideogram' // Ideogram
  | 'ideogram-2' // Ideogram 2.0
  | 'comfyui' // ComfyUI

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
    stylize?: number // 0-1000
    tile?: boolean
    weird?: number // 0-3000
  }
  stableDiffusion?: {
    cfgScale: number // 1-20
    steps: number // 10-150
    sampler: 'euler' | 'dpm' | 'ddim' | 'plms' | 'k_euler' | 'k_dpm_2'
    lora?: string[]
    controlnet?: string
    strength?: number // 0-1
    guidanceScale?: number // 1-20
  }
  dalle?: {
    style: 'vivid' | 'natural'
    size: '1024x1024' | '1792x1024' | '1024x1792'
    quality?: 'standard' | 'hd'
  }
  imagen?: {
    safetyFilter?: 'block_few' | 'block_some' | 'block_most'
    personGeneration?: 'allow_all' | 'allow_adult' | 'dont_allow'
  }
  imagen3?: {
    // Google Imagen 3 (Nano Banana Pro) 프롬프트 엔지니어링 옵션
    promptStructure?: 'simple' | 'structured' | 'detailed'
    styleReference?: string // 스타일 참조 이미지 설명
    aspectRatio?: '1:1' | '4:3' | '16:9' | '21:9' | '9:16'
    safetyFilter?: 'block_few' | 'block_some' | 'block_most'
    personGeneration?: 'allow_all' | 'allow_adult' | 'dont_allow'
    outputFormat?: 'png' | 'jpeg'
    guidanceScale?: number // 1-20
    numInferenceSteps?: number // 20-100
    seed?: number
    negativePrompt?: string
  }
  firefly?: {
    styleReference?: string
    commercialUse?: boolean
    contentType?: 'photo' | 'graphic' | 'art'
    aspectRatio?: '1:1' | '4:3' | '16:9' | '21:9' | '9:16'
  }
  leonardo?: {
    model?: 'leonardo-diffusion' | 'leonardo-photoreal' | 'leonardo-anime'
    presetStyle?: string
    guidanceScale?: number // 1-20
    numInferenceSteps?: number // 20-100
    seed?: number
  }
  flux?: {
    promptStrength?: number // 0-1
    styleReference?: string
    guidanceScale?: number // 1-20
    numInferenceSteps?: number // 20-100
    seed?: number
  }
  ideogram?: {
    style?: 'auto' | 'photorealistic' | 'artistic' | 'cinematic'
    aspectRatio?: '1:1' | '4:3' | '16:9' | '21:9' | '9:16'
    magicPrompt?: boolean // 자동 프롬프트 개선
  }
  comfyui?: {
    workflow?: string
    lora?: string[]
    controlnet?: string
    cfgScale?: number
    steps?: number
    sampler?: string
  }
}

