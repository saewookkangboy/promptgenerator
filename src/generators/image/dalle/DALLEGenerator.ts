// DALL-E 프롬프트 생성기

import { ImagePromptGenerator } from '../ImagePromptGenerator'
import { ImagePromptOptions } from '../../../types/image.types'
import { PromptResult } from '../../../types/prompt.types'
import { addEnglishVersion } from '../../../utils/englishTranslator'

export class DALLEGenerator extends ImagePromptGenerator {
  generate(options: ImagePromptOptions): PromptResult {
    const prompt = this.buildPrompt(options)
    
    const result = {
      metaPrompt: prompt,
      contextPrompt: this.buildContextPrompt(options),
      hashtags: this.generateHashtags(options.subject, 'image'),
      fullPrompt: prompt,
      modelSpecific: {
        dalle: {
          style: options.modelSpecific?.dalle?.style || 'vivid',
          size: options.modelSpecific?.dalle?.size || '1024x1024',
        }
      }
    }

    // 영문 버전 추가
    return addEnglishVersion(result)
  }

  private buildPrompt(options: ImagePromptOptions): string {
    // DALL-E는 자연어 프롬프트를 선호하므로 더 자연스러운 형식으로 구성
    const parts: string[] = []
    
    // Subject with style
    parts.push(`A ${this.formatStyleForDALLE(options.style)} of ${options.subject}`)
    
    // Composition
    const composition = this.formatCompositionForDALLE(options.composition)
    if (composition) {
      parts.push(composition)
    }
    
    // Lighting
    const lighting = this.formatLightingForDALLE(options.lighting)
    if (lighting) {
      parts.push(lighting)
    }
    
    // Color
    const color = this.formatColorForDALLE(options.color)
    if (color) {
      parts.push(color)
    }
    
    // Quality and details
    parts.push(this.formatTechnicalForDALLE(options.technical))
    
    // Negative elements (DALL-E는 자연어로 표현)
    if (options.negativePrompt && options.negativePrompt.length > 0) {
      parts.push(`without ${options.negativePrompt.join(', ')}`)
    }
    
    return parts.filter(Boolean).join(', ')
  }

  private formatStyleForDALLE(style: ImagePromptOptions['style']): string {
    const styleMap: Record<string, string> = {
      'realistic': 'photorealistic image',
      'illustration': 'digital illustration',
      '3d-render': '3D rendered image',
      'watercolor': 'watercolor painting',
      'oil-painting': 'oil painting',
      'digital-art': 'digital artwork',
      'photography': 'professional photograph',
    }
    
    return styleMap[style.artStyle] || style.artStyle || 'image'
  }

  private formatCompositionForDALLE(composition: ImagePromptOptions['composition']): string {
    const framingMap: Record<string, string> = {
      'close-up': 'close-up view',
      'medium-shot': 'medium shot',
      'wide-shot': 'wide shot',
      'extreme-wide': 'wide establishing shot',
      'dutch-angle': 'dutch angle view',
    }
    
    return framingMap[composition.framing] || composition.framing
  }

  private formatLightingForDALLE(lighting: ImagePromptOptions['lighting']): string {
    const typeMap: Record<string, string> = {
      'natural': 'natural lighting',
      'studio': 'studio lighting',
      'dramatic': 'dramatic lighting',
      'soft': 'soft lighting',
      'harsh': 'harsh lighting',
      'rim': 'rim lighting',
      'backlit': 'backlit',
    }
    
    return typeMap[lighting.type] || lighting.type
  }

  private formatColorForDALLE(color: ImagePromptOptions['color']): string {
    const moodMap: Record<string, string> = {
      'vibrant': 'vibrant colors',
      'muted': 'muted color palette',
      'monochrome': 'monochrome',
      'pastel': 'pastel colors',
      'high-contrast': 'high contrast colors',
      'warm': 'warm color palette',
      'cool': 'cool color palette',
    }
    
    return moodMap[color.mood] || color.mood
  }

  private formatTechnicalForDALLE(technical: ImagePromptOptions['technical']): string {
    const qualityMap: Record<number, string> = {
      1: 'basic quality',
      2: 'standard quality',
      3: 'high quality, detailed',
      4: 'ultra high quality, highly detailed',
      5: 'masterpiece quality, extremely detailed',
    }
    
    return qualityMap[technical.quality] || 'high quality'
  }

  private buildContextPrompt(options: ImagePromptOptions): string {
    const dalle = options.modelSpecific?.dalle
    
    return `이미지 생성 프롬프트 컨텍스트 (DALL-E 3):

모델: DALL-E 3
주제: ${options.subject}
스타일: ${options.style.artStyle}${options.style.customStyle ? ` (${options.style.customStyle})` : ''}
구도: ${options.composition.framing}
조명: ${options.lighting.type}
색상: ${options.color.mood} 팔레트
크기: ${dalle?.size || '1024x1024'}
스타일 모드: ${dalle?.style || 'vivid'}
${options.negativePrompt && options.negativePrompt.length > 0 ? `제외 요소: ${options.negativePrompt.join(', ')}` : ''}

DALL-E는 자연어 프롬프트를 선호하므로, 위 프롬프트를 그대로 사용하거나 필요에 따라 자연스럽게 수정하여 사용하세요.`
  }
}


