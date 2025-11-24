# 구현 예시 코드

## 1. 확장된 타입 정의

### types/prompt.types.ts
```typescript
export type PromptCategory = 
  | 'text' 
  | 'image' 
  | 'video' 
  | 'engineering'

export type ImageModel = 
  | 'midjourney' 
  | 'dalle' 
  | 'stable-diffusion' 
  | 'imagen' 
  | 'firefly'

export type VideoModel = 
  | 'sora' 
  | 'veo' 
  | 'runway' 
  | 'pika' 
  | 'stable-video'

export interface BasePromptOptions {
  category: PromptCategory
  userInput: string
  targetAudience?: TargetAudience
  tone?: string
}

export interface TargetAudience {
  age?: string
  gender?: string
  occupation?: string
  interests?: string[]
}
```

### types/image.types.ts
```typescript
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
  artStyle: 'realistic' | 'illustration' | '3d-render' | 'watercolor' | 'oil-painting' | 'digital-art' | 'photography'
  medium?: string
  technique?: string
  era?: 'classic' | 'modern' | 'futuristic' | 'vintage'
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
}
```

### types/video.types.ts
```typescript
export interface VideoPromptOptions extends BasePromptOptions {
  category: 'video'
  model: VideoModel
  scenes: VideoScene[]
  overallStyle: VideoStyle
  technical: VideoTechnicalSettings
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
```

## 2. 이미지 프롬프트 생성기 예시

### generators/image/midjourney/MidjourneyGenerator.ts
```typescript
import { ImagePromptOptions } from '../../../types/image.types'
import { PromptResult } from '../../../types/prompt.types'

export class MidjourneyGenerator {
  generate(options: ImagePromptOptions): PromptResult {
    const prompt = this.buildPrompt(options)
    const parameters = this.buildParameters(options)
    
    return {
      metaPrompt: prompt,
      contextPrompt: this.buildContextPrompt(options),
      hashtags: this.generateHashtags(options),
      fullPrompt: `${prompt} ${parameters}`,
      modelSpecific: {
        midjourney: {
          version: options.modelSpecific?.midjourney?.version || 6,
          chaos: options.modelSpecific?.midjourney?.chaos || 0,
        }
      }
    }
  }

  private buildPrompt(options: ImagePromptOptions): string {
    const parts: string[] = []
    
    // Subject
    parts.push(options.subject)
    
    // Style
    parts.push(this.formatStyle(options.style))
    
    // Composition
    parts.push(this.formatComposition(options.composition))
    
    // Lighting
    parts.push(this.formatLighting(options.lighting))
    
    // Color
    parts.push(this.formatColor(options.color))
    
    // Technical details
    parts.push(this.formatTechnical(options.technical))
    
    return parts.filter(Boolean).join(', ')
  }

  private formatStyle(style: ImagePromptOptions['style']): string {
    const styleMap: Record<string, string> = {
      'realistic': 'photorealistic, highly detailed',
      'illustration': 'digital illustration, professional artwork',
      '3d-render': '3D render, octane render, cinematic lighting',
      'watercolor': 'watercolor painting, soft brushstrokes',
      'oil-painting': 'oil painting, classical art style',
    }
    
    return styleMap[style.artStyle] || style.artStyle
  }

  private formatComposition(composition: ImagePromptOptions['composition']): string {
    const framingMap: Record<string, string> = {
      'close-up': 'close-up shot',
      'medium-shot': 'medium shot',
      'wide-shot': 'wide shot',
      'extreme-wide': 'extreme wide shot, establishing shot',
    }
    
    return `${framingMap[composition.framing]}, ${composition.rule} composition`
  }

  private formatLighting(lighting: ImagePromptOptions['lighting']): string {
    return `${lighting.type} lighting, ${lighting.direction} lighting, ${lighting.color || 'natural'} tone`
  }

  private formatColor(color: ImagePromptOptions['color']): string {
    const colorDesc = color.primary.join(', ')
    return `${colorDesc}, ${color.mood} color palette`
  }

  private formatTechnical(technical: ImagePromptOptions['technical']): string {
    return `--ar ${technical.aspectRatio.replace(':', '')} --q ${technical.quality}`
  }

  private buildParameters(options: ImagePromptOptions): string {
    const params: string[] = []
    const midjourney = options.modelSpecific?.midjourney
    
    if (midjourney) {
      params.push(`--v ${midjourney.version}`)
      if (midjourney.chaos) params.push(`--chaos ${midjourney.chaos}`)
      if (midjourney.seed) params.push(`--seed ${midjourney.seed}`)
      if (midjourney.style) params.push(`--style ${midjourney.style}`)
      if (midjourney.quality) params.push(`--q ${midjourney.quality}`)
    }
    
    return params.join(' ')
  }

  private buildContextPrompt(options: ImagePromptOptions): string {
    return `이미지 생성 프롬프트 컨텍스트:

모델: Midjourney ${options.modelSpecific?.midjourney?.version || 6}
주제: ${options.subject}
스타일: ${options.style.artStyle}
구도: ${options.composition.framing}, ${options.composition.rule}
조명: ${options.lighting.type}, ${options.lighting.direction}
색상: ${options.color.mood} 팔레트
해상도: ${options.technical.aspectRatio}
${options.negativePrompt ? `제외 요소: ${options.negativePrompt.join(', ')}` : ''}`
  }

  private generateHashtags(options: ImagePromptOptions): string[] {
    return [
      '#midjourney',
      '#aiart',
      `#${options.style.artStyle}`,
      `#${options.color.mood}`,
    ]
  }
}
```

## 3. 동영상 프롬프트 생성기 예시

### generators/video/sora/SoraGenerator.ts
```typescript
import { VideoPromptOptions } from '../../../types/video.types'
import { PromptResult } from '../../../types/prompt.types'

export class SoraGenerator {
  generate(options: VideoPromptOptions): PromptResult {
    const scenes = options.scenes.map(scene => this.buildScenePrompt(scene))
    const fullPrompt = scenes.join('\n\n---\n\n')
    
    return {
      metaPrompt: this.buildMetaPrompt(options),
      contextPrompt: this.buildContextPrompt(options),
      hashtags: this.generateHashtags(options),
      fullPrompt,
      scenes: scenes.map((prompt, index) => ({
        order: index + 1,
        prompt,
        duration: options.scenes[index].duration,
      })),
    }
  }

  private buildScenePrompt(scene: VideoPromptOptions['scenes'][0]): string {
    const parts: string[] = []
    
    // 기본 장면 설명
    parts.push(scene.description)
    
    // 카메라 설정
    parts.push(this.formatCamera(scene.camera))
    
    // 모션 설정
    parts.push(this.formatMotion(scene.motion))
    
    // 전환 효과
    if (scene.transition) {
      parts.push(this.formatTransition(scene.transition))
    }
    
    return parts.filter(Boolean).join(', ')
  }

  private formatCamera(camera: VideoPromptOptions['scenes'][0]['camera']): string {
    const movementMap: Record<string, string> = {
      'dolly': 'slow dolly in',
      'pan': 'smooth pan left to right',
      'tilt': 'gentle tilt up',
      'zoom': 'slow zoom in',
      'tracking': 'tracking shot following subject',
      'orbit': 'orbiting camera movement',
    }
    
    const shotMap: Record<string, string> = {
      'extreme-close': 'extreme close-up',
      'close-up': 'close-up shot',
      'medium': 'medium shot',
      'wide': 'wide shot',
      'extreme-wide': 'extreme wide shot, establishing shot',
    }
    
    return `${movementMap[camera.movement] || camera.movement}, ${shotMap[camera.shotType] || camera.shotType}, ${camera.angle} angle`
  }

  private formatMotion(motion: VideoPromptOptions['scenes'][0]['motion']): string {
    const speedMap: Record<string, string> = {
      'slow-motion': 'slow motion, cinematic',
      'normal': 'normal speed',
      'fast': 'fast-paced, dynamic',
      'time-lapse': 'time-lapse effect',
    }
    
    return `${speedMap[motion.speed]}, ${motion.type} movement`
  }

  private formatTransition(transition: NonNullable<VideoPromptOptions['scenes'][0]['transition']>): string {
    const transitionMap: Record<string, string> = {
      'fade': 'fade to black',
      'dissolve': 'cross dissolve',
      'wipe': 'wipe transition',
      'slide': 'slide transition',
    }
    
    return `${transitionMap[transition.type]} transition`
  }

  private buildMetaPrompt(options: VideoPromptOptions): string {
    return `동영상 생성 프롬프트:

장르: ${options.overallStyle.genre}
분위기: ${options.overallStyle.mood}
색감: ${options.overallStyle.colorGrading}
총 길이: ${options.technical.totalDuration}초
해상도: ${options.technical.resolution}
프레임레이트: ${options.technical.fps}fps

장면 구성:
${options.scenes.map((scene, i) => `${i + 1}. ${scene.description} (${scene.duration}초)`).join('\n')}`
  }

  private buildContextPrompt(options: VideoPromptOptions): string {
    return `동영상 생성 컨텍스트:

모델: OpenAI Sora 2
전체 스타일: ${options.overallStyle.genre}, ${options.overallStyle.mood}
기술 사양: ${options.technical.resolution}, ${options.technical.fps}fps
총 장면 수: ${options.scenes.length}
총 길이: ${options.technical.totalDuration}초`
  }

  private generateHashtags(options: VideoPromptOptions): string[] {
    return [
      '#sora',
      '#aivideo',
      `#${options.overallStyle.genre}`,
      '#cinematic',
    ]
  }
}
```

## 4. 프롬프트 엔지니어링 예시

### generators/engineering/PromptEngineer.ts
```typescript
export class PromptEngineer {
  // Chain of Thought 프롬프트 생성
  generateChainOfThought(basePrompt: string, steps: string[]): string {
    return `${basePrompt}

다음 단계를 따라 생각해보세요:
${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

각 단계를 차근차근 진행하며 최종 답변을 도출하세요.`
  }

  // Few-shot 프롬프트 생성
  generateFewShot(basePrompt: string, examples: Array<{input: string, output: string}>): string {
    const examplesText = examples.map((ex, i) => 
      `예시 ${i + 1}:
입력: ${ex.input}
출력: ${ex.output}`
    ).join('\n\n')

    return `${basePrompt}

다음 예시들을 참고하세요:

${examplesText}

위 예시들의 패턴을 따라 새로운 입력에 대한 출력을 생성하세요.`
  }

  // Role-based 프롬프트 생성
  generateRoleBased(prompt: string, role: string, expertise: string[]): string {
    return `당신은 ${role}입니다.
${expertise.map(e => `- ${e}`).join('\n')}

다음 작업을 수행해주세요:
${prompt}

${role}의 관점과 전문성을 바탕으로 답변해주세요.`
  }

  // 프롬프트 최적화
  optimizePrompt(prompt: string): {
    optimized: string
    suggestions: string[]
  } {
    const suggestions: string[] = []
    let optimized = prompt

    // 명확성 개선
    if (prompt.length < 50) {
      suggestions.push('프롬프트를 더 구체적으로 작성하세요.')
    }

    // 구조 개선
    if (!prompt.includes(',')) {
      suggestions.push('여러 요소를 쉼표로 구분하여 나열하세요.')
    }

    // 키워드 강조
    optimized = this.enhanceKeywords(optimized)

    return {
      optimized,
      suggestions,
    }
  }

  private enhanceKeywords(prompt: string): string {
    // 중요한 키워드를 강조 (예: 괄호 사용)
    return prompt
      .replace(/\b(high quality|detailed|professional)\b/gi, '($1)')
  }
}
```

## 5. 통합 프롬프트 생성기 팩토리

### generators/PromptGeneratorFactory.ts
```typescript
import { BasePromptGenerator } from './base/BasePromptGenerator'
import { TextPromptGenerator } from './text/TextPromptGenerator'
import { MidjourneyGenerator } from './image/midjourney/MidjourneyGenerator'
import { DALLEGenerator } from './image/dalle/DALLEGenerator'
import { SoraGenerator } from './video/sora/SoraGenerator'
import { VeoGenerator } from './video/veo/VeoGenerator'
import { PromptEngineer } from './engineering/PromptEngineer'

export class PromptGeneratorFactory {
  static create(category: string, model?: string): BasePromptGenerator {
    switch (category) {
      case 'text':
        return new TextPromptGenerator()
      
      case 'image':
        switch (model) {
          case 'midjourney':
            return new MidjourneyGenerator()
          case 'dalle':
            return new DALLEGenerator()
          default:
            return new MidjourneyGenerator()
        }
      
      case 'video':
        switch (model) {
          case 'sora':
            return new SoraGenerator()
          case 'veo':
            return new VeoGenerator()
          default:
            return new SoraGenerator()
        }
      
      case 'engineering':
        return new PromptEngineer()
      
      default:
        throw new Error(`Unknown category: ${category}`)
    }
  }
}
```

이러한 구조로 확장 가능하고 모듈화된 프롬프트 생성 시스템을 구축할 수 있습니다.


