// Midjourney 프롬프트 생성기

import { ImagePromptGenerator } from '../ImagePromptGenerator'
import { ImagePromptOptions } from '../../../types/image.types'
import { PromptResult } from '../../../types/prompt.types'

export class MidjourneyGenerator extends ImagePromptGenerator {
  generate(options: ImagePromptOptions): PromptResult {
    const prompt = this.buildPrompt(options)
    const parameters = this.buildParameters(options)
    const fullPrompt = `${prompt} ${parameters}`.trim()
    
    return {
      metaPrompt: prompt,
      contextPrompt: this.buildContextPrompt(options),
      hashtags: this.generateHashtags(options.subject, 'image'),
      fullPrompt,
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
    
    // Subject (주제)
    parts.push(options.subject)
    
    // Style (스타일)
    const style = this.formatStyle(options.style)
    if (style) parts.push(style)
    
    // Composition (구도)
    const composition = this.formatComposition(options.composition)
    if (composition) parts.push(composition)
    
    // Lighting (조명)
    const lighting = this.formatLighting(options.lighting)
    if (lighting) parts.push(lighting)
    
    // Color (색상)
    const color = this.formatColor(options.color)
    if (color) parts.push(color)
    
    // Technical (기술적 세부사항)
    const technical = this.formatTechnical(options.technical)
    if (technical) parts.push(technical)
    
    // Negative Prompt
    if (options.negativePrompt && options.negativePrompt.length > 0) {
      parts.push(`--no ${options.negativePrompt.join(', ')}`)
    }
    
    return parts.filter(Boolean).join(', ')
  }

  private buildParameters(options: ImagePromptOptions): string {
    const params: string[] = []
    const midjourney = options.modelSpecific?.midjourney
    
    if (midjourney) {
      // Version
      if (midjourney.version) {
        params.push(`--v ${midjourney.version}`)
      }
      
      // Chaos (0-100)
      if (midjourney.chaos !== undefined && midjourney.chaos > 0) {
        params.push(`--chaos ${midjourney.chaos}`)
      }
      
      // Seed
      if (midjourney.seed) {
        params.push(`--seed ${midjourney.seed}`)
      }
      
      // Style
      if (midjourney.style) {
        params.push(`--style ${midjourney.style}`)
      }
      
      // Quality
      if (midjourney.quality) {
        params.push(`--q ${midjourney.quality}`)
      }
    }
    
    // Aspect Ratio
    const aspectRatio = this.formatAspectRatio(options.technical.aspectRatio)
    if (aspectRatio) {
      params.push(aspectRatio)
    }
    
    return params.join(' ')
  }

  private formatAspectRatio(aspectRatio: string): string {
    if (aspectRatio === 'custom') return ''
    
    // Midjourney 형식으로 변환 (예: 16:9 -> 16:9)
    const ratioMap: Record<string, string> = {
      '1:1': '--ar 1:1',
      '4:3': '--ar 4:3',
      '16:9': '--ar 16:9',
      '21:9': '--ar 21:9',
      '9:16': '--ar 9:16',
    }
    
    return ratioMap[aspectRatio] || `--ar ${aspectRatio}`
  }

  private buildContextPrompt(options: ImagePromptOptions): string {
    const midjourney = options.modelSpecific?.midjourney
    
    return `이미지 생성 프롬프트 컨텍스트 (Midjourney):

모델: Midjourney ${midjourney?.version || 6}
주제: ${options.subject}
스타일: ${options.style.artStyle}${options.style.customStyle ? ` (${options.style.customStyle})` : ''}
구도: ${options.composition.framing}, ${options.composition.rule}
조명: ${options.lighting.type}, ${options.lighting.direction}
색상: ${options.color.mood} 팔레트
해상도: ${options.technical.aspectRatio}
${options.negativePrompt && options.negativePrompt.length > 0 ? `제외 요소: ${options.negativePrompt.join(', ')}` : ''}
${midjourney?.chaos ? `창의성 (Chaos): ${midjourney.chaos}` : ''}
${midjourney?.seed ? `시드: ${midjourney.seed}` : ''}`
  }
}

