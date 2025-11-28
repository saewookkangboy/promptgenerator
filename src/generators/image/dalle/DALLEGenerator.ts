// DALL-E 프롬프트 생성기

import { ImagePromptGenerator } from '../ImagePromptGenerator'
import { ImagePromptOptions } from '../../../types/image.types'
import { PromptResult } from '../../../types/prompt.types'
import { addEnglishVersion } from '../../../utils/englishTranslator'

export class DALLEGenerator extends ImagePromptGenerator {
  generate(options: ImagePromptOptions): PromptResult {
    const prompt = this.buildPrompt(options)
    const englishContextPrompt = this.buildEnglishContextPrompt(options)

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
    return addEnglishVersion(result, {
      metaPrompt: prompt,
      contextPrompt: englishContextPrompt,
      fullPrompt: prompt,
    })
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

  private getModelDisplayName(model: ImagePromptOptions['model']): string {
    const modelNames: Record<string, string> = {
      'midjourney': 'Midjourney',
      'dalle': 'DALL-E 3',
      'stable-diffusion': 'Stable Diffusion',
      'imagen': 'Google Imagen',
      'imagen-3': 'Google Imagen 3 (Nano Banana Pro)',
      'firefly': 'Adobe Firefly',
      'leonardo': 'Leonardo AI',
      'flux': 'Flux',
      'ideogram': 'Ideogram',
      'comfyui': 'ComfyUI',
    }
    return modelNames[model] || model
  }

  private getModelSpecificGuidance(model: ImagePromptOptions['model']): string {
    const guidanceMap: Record<string, string> = {
      'dalle': 'DALL-E는 자연어 프롬프트를 선호하므로, 위 프롬프트를 그대로 사용하거나 필요에 따라 자연스럽게 수정하여 사용하세요.',
      'imagen': 'Google Imagen은 자연어 프롬프트를 선호하므로, 위 프롬프트를 그대로 사용하거나 필요에 따라 자연스럽게 수정하여 사용하세요.',
      'imagen-3': 'Google Imagen 3는 구조화된 자연어 프롬프트를 선호합니다. 위 프롬프트를 그대로 사용하거나 필요에 따라 자연스럽게 수정하여 사용하세요.',
      'firefly': 'Adobe Firefly는 자연어 프롬프트를 선호하므로, 위 프롬프트를 그대로 사용하거나 필요에 따라 자연스럽게 수정하여 사용하세요.',
      'leonardo': 'Leonardo AI는 자연어 프롬프트를 선호하므로, 위 프롬프트를 그대로 사용하거나 필요에 따라 자연스럽게 수정하여 사용하세요.',
      'flux': 'Flux는 자연어 프롬프트를 선호하므로, 위 프롬프트를 그대로 사용하거나 필요에 따라 자연스럽게 수정하여 사용하세요.',
      'ideogram': 'Ideogram은 자연어 프롬프트를 선호하므로, 위 프롬프트를 그대로 사용하거나 필요에 따라 자연스럽게 수정하여 사용하세요.',
      'comfyui': 'ComfyUI는 구조화된 프롬프트를 선호하므로, 위 프롬프트를 그대로 사용하거나 필요에 따라 자연스럽게 수정하여 사용하세요.',
    }
    return guidanceMap[model] || '위 프롬프트를 그대로 사용하거나 필요에 따라 자연스럽게 수정하여 사용하세요.'
  }

  private buildContextPrompt(options: ImagePromptOptions): string {
    const dalle = options.modelSpecific?.dalle
    const modelName = this.getModelDisplayName(options.model)
    const modelGuidance = this.getModelSpecificGuidance(options.model)
    
    // 모델별 특정 정보 구성
    let modelSpecificInfo = ''
    if (options.model === 'imagen-3') {
      const imagen3 = options.modelSpecific?.imagen3
      modelSpecificInfo = `프롬프트 구조: ${imagen3?.promptStructure || 'structured'}
${imagen3?.guidanceScale ? `Guidance Scale: ${imagen3.guidanceScale}` : ''}
${imagen3?.numInferenceSteps ? `Inference Steps: ${imagen3.numInferenceSteps}` : ''}
${imagen3?.safetyFilter ? `안전 필터: ${imagen3.safetyFilter}` : ''}
`
    } else if (options.model === 'firefly') {
      const firefly = options.modelSpecific?.firefly
      modelSpecificInfo = `${firefly?.contentType ? `콘텐츠 타입: ${firefly.contentType}` : ''}
${firefly?.commercialUse !== undefined ? `상업적 사용: ${firefly.commercialUse ? '가능' : '불가능'}` : ''}
`
    } else if (options.model === 'leonardo') {
      const leonardo = options.modelSpecific?.leonardo
      modelSpecificInfo = `${leonardo?.model ? `모델: ${leonardo.model}` : ''}
${leonardo?.guidanceScale ? `Guidance Scale: ${leonardo.guidanceScale}` : ''}
`
    } else if (options.model === 'flux') {
      const flux = options.modelSpecific?.flux
      modelSpecificInfo = `${flux?.promptStrength ? `Prompt Strength: ${flux.promptStrength}` : ''}
`
    } else if (options.model === 'dalle') {
      modelSpecificInfo = `크기: ${dalle?.size || '1024x1024'}
스타일 모드: ${dalle?.style || 'vivid'}
`
    }
    
    return `이미지 생성 프롬프트 컨텍스트 (${modelName}):

모델: ${modelName}
주제: ${options.subject}
스타일: ${options.style.artStyle}${options.style.customStyle ? ` (${options.style.customStyle})` : ''}
구도: ${options.composition.framing}
조명: ${options.lighting.type}
색상: ${options.color.mood} 팔레트
${modelSpecificInfo}${options.negativePrompt && options.negativePrompt.length > 0 ? `제외 요소: ${options.negativePrompt.join(', ')}` : ''}

${modelGuidance}`
  }

  private getModelSpecificGuidanceEnglish(model: ImagePromptOptions['model']): string {
    const guidanceMap: Record<string, string> = {
      'dalle': 'DALL-E prefers natural language prompts. Use the prompt as-is or adjust wording to match your creative direction.',
      'imagen': 'Google Imagen prefers natural language prompts. Use the prompt as-is or adjust wording to match your creative direction.',
      'imagen-3': 'Google Imagen 3 prefers structured natural language prompts. Use the prompt as-is or adjust wording to match your creative direction.',
      'firefly': 'Adobe Firefly prefers natural language prompts. Use the prompt as-is or adjust wording to match your creative direction.',
      'leonardo': 'Leonardo AI prefers natural language prompts. Use the prompt as-is or adjust wording to match your creative direction.',
      'flux': 'Flux prefers natural language prompts. Use the prompt as-is or adjust wording to match your creative direction.',
      'ideogram': 'Ideogram prefers natural language prompts. Use the prompt as-is or adjust wording to match your creative direction.',
      'comfyui': 'ComfyUI prefers structured prompts. Use the prompt as-is or adjust wording to match your creative direction.',
    }
    return guidanceMap[model] || 'Use the prompt as-is or adjust wording to match your creative direction.'
  }

  private buildEnglishContextPrompt(options: ImagePromptOptions): string {
    const dalle = options.modelSpecific?.dalle
    const modelName = this.getModelDisplayName(options.model)
    const modelGuidance = this.getModelSpecificGuidanceEnglish(options.model)
    
    // 모델별 특정 정보 구성
    let modelSpecificInfo = ''
    if (options.model === 'imagen-3') {
      const imagen3 = options.modelSpecific?.imagen3
      modelSpecificInfo = `Prompt structure: ${imagen3?.promptStructure || 'structured'}
${imagen3?.guidanceScale ? `Guidance Scale: ${imagen3.guidanceScale}` : ''}
${imagen3?.numInferenceSteps ? `Inference Steps: ${imagen3.numInferenceSteps}` : ''}
${imagen3?.safetyFilter ? `Safety filter: ${imagen3.safetyFilter}` : ''}
`
    } else if (options.model === 'firefly') {
      const firefly = options.modelSpecific?.firefly
      modelSpecificInfo = `${firefly?.contentType ? `Content type: ${firefly.contentType}` : ''}
${firefly?.commercialUse !== undefined ? `Commercial use: ${firefly.commercialUse ? 'allowed' : 'not allowed'}` : ''}
`
    } else if (options.model === 'leonardo') {
      const leonardo = options.modelSpecific?.leonardo
      modelSpecificInfo = `${leonardo?.model ? `Model: ${leonardo.model}` : ''}
${leonardo?.guidanceScale ? `Guidance Scale: ${leonardo.guidanceScale}` : ''}
`
    } else if (options.model === 'flux') {
      const flux = options.modelSpecific?.flux
      modelSpecificInfo = `${flux?.promptStrength ? `Prompt Strength: ${flux.promptStrength}` : ''}
`
    } else if (options.model === 'dalle') {
      modelSpecificInfo = `Size: ${dalle?.size || '1024x1024'}
Style mode: ${dalle?.style || 'vivid'}
`
    }

    return `Image generation context (${modelName}):

Model: ${modelName}
Subject: ${options.subject}
Style: ${options.style.artStyle}${options.style.customStyle ? ` (${options.style.customStyle})` : ''}
Composition: ${options.composition.framing}
Lighting: ${options.lighting.type}
Color palette: ${options.color.mood}
${modelSpecificInfo}${options.negativePrompt && options.negativePrompt.length > 0 ? `Exclude: ${options.negativePrompt.join(', ')}` : ''}

${modelGuidance}`
  }
}


