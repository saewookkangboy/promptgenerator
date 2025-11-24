// 이미지 프롬프트 생성기 기본 클래스

import { BasePromptGenerator } from '../base/BasePromptGenerator'
import { ImagePromptOptions, ImageStyle, Composition, Lighting, ColorPalette } from '../../types/image.types'
import { PromptResult } from '../../types/prompt.types'

export abstract class ImagePromptGenerator extends BasePromptGenerator {
  abstract generate(options: ImagePromptOptions): PromptResult

  /**
   * 스타일을 문자열로 변환
   */
  protected formatStyle(style: ImageStyle): string {
    const styleMap: Record<string, string> = {
      'realistic': 'photorealistic, highly detailed, 8k resolution',
      'illustration': 'digital illustration, professional artwork, detailed',
      '3d-render': '3D render, octane render, cinematic lighting, highly detailed',
      'watercolor': 'watercolor painting, soft brushstrokes, artistic',
      'oil-painting': 'oil painting, classical art style, rich colors',
      'digital-art': 'digital art, modern style, vibrant colors',
      'photography': 'professional photography, high quality',
    }

    const parts: string[] = []
    
    if (style.artStyle !== 'custom') {
      parts.push(styleMap[style.artStyle] || style.artStyle)
    } else if (style.customStyle) {
      parts.push(style.customStyle)
    }
    
    if (style.medium) {
      parts.push(style.medium)
    }
    
    if (style.technique) {
      parts.push(style.technique)
    }
    
    if (style.era) {
      const eraMap: Record<string, string> = {
        'classic': 'classical style, timeless',
        'modern': 'modern style, contemporary',
        'futuristic': 'futuristic, sci-fi aesthetic',
        'vintage': 'vintage style, retro aesthetic',
      }
      parts.push(eraMap[style.era])
    }
    
    return parts.filter(Boolean).join(', ')
  }

  /**
   * 구도를 문자열로 변환
   */
  protected formatComposition(composition: Composition): string {
    const framingMap: Record<string, string> = {
      'close-up': 'close-up shot, detailed view',
      'medium-shot': 'medium shot, balanced composition',
      'wide-shot': 'wide shot, expansive view',
      'extreme-wide': 'extreme wide shot, establishing shot, panoramic',
      'dutch-angle': 'dutch angle, dynamic composition',
    }

    const ruleMap: Record<string, string> = {
      'rule-of-thirds': 'rule of thirds composition',
      'golden-ratio': 'golden ratio composition, harmonious',
      'symmetry': 'symmetrical composition, balanced',
      'centered': 'centered composition, focused',
      'dynamic': 'dynamic composition, energetic',
    }

    const parts: string[] = []
    parts.push(framingMap[composition.framing] || composition.framing)
    parts.push(ruleMap[composition.rule] || composition.rule)
    
    if (composition.perspective) {
      const perspectiveMap: Record<string, string> = {
        'eye-level': 'eye level perspective',
        'bird-eye': 'bird\'s eye view, aerial perspective',
        'worm-eye': 'worm\'s eye view, low angle',
        'aerial': 'aerial view, top-down perspective',
      }
      parts.push(perspectiveMap[composition.perspective])
    }
    
    return parts.filter(Boolean).join(', ')
  }

  /**
   * 조명을 문자열로 변환
   */
  protected formatLighting(lighting: Lighting): string {
    const typeMap: Record<string, string> = {
      'natural': 'natural lighting, soft and warm',
      'studio': 'studio lighting, professional',
      'dramatic': 'dramatic lighting, high contrast',
      'soft': 'soft lighting, gentle and diffused',
      'harsh': 'harsh lighting, strong shadows',
      'rim': 'rim lighting, edge glow',
      'backlit': 'backlit, silhouette effect',
    }

    const directionMap: Record<string, string> = {
      'front': 'front lighting',
      'side': 'side lighting, chiaroscuro',
      'back': 'back lighting, rim light',
      'top': 'top lighting, overhead',
      'bottom': 'bottom lighting, dramatic',
    }

    const parts: string[] = []
    parts.push(typeMap[lighting.type] || lighting.type)
    parts.push(directionMap[lighting.direction] || lighting.direction)
    
    if (lighting.intensity !== undefined) {
      if (lighting.intensity < 30) {
        parts.push('low intensity, subtle')
      } else if (lighting.intensity > 70) {
        parts.push('high intensity, bright')
      }
    }
    
    if (lighting.color) {
      const colorMap: Record<string, string> = {
        'warm': 'warm tone, golden hour',
        'cool': 'cool tone, blue hour',
        'neutral': 'neutral tone, balanced',
        'golden-hour': 'golden hour, warm sunset light',
        'blue-hour': 'blue hour, cool twilight',
      }
      parts.push(colorMap[lighting.color])
    }
    
    return parts.filter(Boolean).join(', ')
  }

  /**
   * 색상을 문자열로 변환
   */
  protected formatColor(color: ColorPalette): string {
    const parts: string[] = []
    
    if (color.primary && color.primary.length > 0) {
      parts.push(`color palette: ${color.primary.join(', ')}`)
    }
    
    const moodMap: Record<string, string> = {
      'vibrant': 'vibrant colors, saturated, energetic',
      'muted': 'muted colors, desaturated, subtle',
      'monochrome': 'monochrome, black and white',
      'pastel': 'pastel colors, soft and gentle',
      'high-contrast': 'high contrast, bold colors',
      'warm': 'warm color palette, oranges and reds',
      'cool': 'cool color palette, blues and greens',
    }
    
    if (color.mood) {
      parts.push(moodMap[color.mood] || color.mood)
    }
    
    if (color.harmony) {
      const harmonyMap: Record<string, string> = {
        'complementary': 'complementary color harmony',
        'analogous': 'analogous color harmony',
        'triadic': 'triadic color harmony',
        'monochromatic': 'monochromatic color scheme',
      }
      parts.push(harmonyMap[color.harmony])
    }
    
    return parts.filter(Boolean).join(', ')
  }

  /**
   * 기술적 설정을 문자열로 변환
   */
  protected formatTechnical(technical: ImagePromptOptions['technical']): string {
    const parts: string[] = []
    
    if (technical.resolution) {
      parts.push(`${technical.resolution} resolution`)
    }
    
    if (technical.quality) {
      const qualityMap: Record<number, string> = {
        1: 'basic quality',
        2: 'standard quality',
        3: 'high quality',
        4: 'ultra high quality',
        5: 'masterpiece quality',
      }
      parts.push(qualityMap[technical.quality] || 'high quality')
    }
    
    return parts.filter(Boolean).join(', ')
  }
}


