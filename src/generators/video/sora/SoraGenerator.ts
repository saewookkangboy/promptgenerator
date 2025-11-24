// Sora 프롬프트 생성기

import { VideoPromptGenerator } from '../VideoPromptGenerator'
import { VideoPromptOptions } from '../../../types/video.types'
import { PromptResult } from '../../../types/prompt.types'
import { addEnglishVersion, convertToNativeEnglish } from '../../../utils/englishTranslator'

export class SoraGenerator extends VideoPromptGenerator {
  generate(options: VideoPromptOptions): PromptResult {
    const scenes = options.scenes.map((scene, index) => ({
      order: index + 1,
      prompt: this.buildScenePrompt(scene, options),
      duration: scene.duration,
    }))
    
    const fullPrompt = scenes.map(s => s.prompt).join('\n\n---\n\n')
    const metaPrompt = this.buildMetaPrompt(options)
    
    const result = {
      metaPrompt,
      contextPrompt: this.buildContextPrompt(options),
      hashtags: this.generateHashtags(options.userInput, 'video'),
      fullPrompt,
      scenes: scenes.map(scene => ({
        ...scene,
        englishPrompt: convertToNativeEnglish(scene.prompt),
      })),
      modelSpecific: {
        sora: {
          maxDuration: options.technical.totalDuration,
          consistency: options.modelSpecific?.sora?.consistency || 'high',
        }
      }
    }

    // 영문 버전 추가
    return addEnglishVersion(result)
  }

  private buildScenePrompt(scene: VideoPromptOptions['scenes'][0], options: VideoPromptOptions): string {
    const parts: string[] = []
    
    // 기본 장면 설명 (상세하게 확장)
    const detailedDescription = this.enhanceDescription(scene.description, options)
    parts.push(detailedDescription)
    
    // 참조 이미지 정보
    if (options.hasReferenceImage && options.referenceImageDescription) {
      parts.push(`based on reference image: ${options.referenceImageDescription}`)
    }
    
    // 카메라 설정
    const camera = this.formatCamera(scene.camera)
    if (camera) parts.push(camera)
    
    // 모션 설정
    const motion = this.formatMotion(scene.motion)
    if (motion) parts.push(motion)
    
    // 톤앤매너 반영
    const toneAndManner = this.formatToneAndManner(options.overallStyle)
    if (toneAndManner) parts.push(toneAndManner)
    
    // 전환 효과
    if (scene.transition) {
      const transition = this.formatTransition(scene.transition)
      if (transition) parts.push(transition)
    }
    
    return parts.filter(Boolean).join(', ')
  }

  /**
   * 설명을 상세하게 확장
   */
  private enhanceDescription(description: string, options: VideoPromptOptions): string {
    let enhanced = description
    
    // 문맥적 톤앤매너 반영
    if (options.overallStyle.contextualTone) {
      enhanced = `${enhanced}, ${options.overallStyle.contextualTone}`
    }
    
    // 정성적 톤앤매너 반영
    if (options.overallStyle.qualitativeTone) {
      enhanced = `${enhanced}, ${options.overallStyle.qualitativeTone}`
    }
    
    // 장르에 따른 상세 묘사 추가
    const genreEnhancements: Record<string, string> = {
      'action': 'dynamic action, intense movement, high energy',
      'drama': 'emotional depth, character-driven, nuanced performance',
      'comedy': 'light-hearted, humorous, playful atmosphere',
      'horror': 'suspenseful, eerie, atmospheric tension',
      'sci-fi': 'futuristic, technological, otherworldly',
      'documentary': 'realistic, authentic, observational',
      'music-video': 'rhythmic, stylized, visually striking',
    }
    
    if (genreEnhancements[options.overallStyle.genre]) {
      enhanced = `${enhanced}, ${genreEnhancements[options.overallStyle.genre]}`
    }
    
    // 분위기에 따른 상세 묘사 추가
    const moodEnhancements: Record<string, string> = {
      'tense': 'building tension, suspenseful pacing, dramatic moments',
      'peaceful': 'tranquil atmosphere, gentle pacing, serene mood',
      'dynamic': 'energetic movement, fast-paced, vibrant energy',
      'melancholic': 'somber tone, reflective mood, emotional depth',
      'energetic': 'high energy, fast-paced, vibrant',
      'mysterious': 'enigmatic atmosphere, subtle hints, intriguing',
    }
    
    if (moodEnhancements[options.overallStyle.mood]) {
      enhanced = `${enhanced}, ${moodEnhancements[options.overallStyle.mood]}`
    }
    
    return enhanced
  }

  /**
   * 톤앤매너 포맷팅
   */
  private formatToneAndManner(style: VideoPromptOptions['overallStyle']): string {
    const parts: string[] = []
    
    if (style.contextualTone) {
      parts.push(`contextual tone: ${style.contextualTone}`)
    }
    
    if (style.qualitativeTone) {
      parts.push(`qualitative tone: ${style.qualitativeTone}`)
    }
    
    return parts.join(', ')
  }

  private buildMetaPrompt(options: VideoPromptOptions): string {
    const style = this.formatStyle(options.overallStyle)
    
    return `동영상 생성 프롬프트 (Sora 2):

장르: ${options.overallStyle.genre}
분위기: ${options.overallStyle.mood}
색감: ${options.overallStyle.colorGrading}
${options.overallStyle.cinematic ? '영화적 품질' : ''}

총 길이: ${options.technical.totalDuration}초
해상도: ${options.technical.resolution}
프레임레이트: ${options.technical.fps}fps
아스펙트 비율: ${options.technical.aspectRatio}

전체 스타일: ${style}

장면 구성 (${options.scenes.length}개):
${options.scenes.map((scene, i) => 
  `${i + 1}. ${scene.description} (${scene.duration}초) - ${this.formatCamera(scene.camera)}`
).join('\n')}`
  }

  private buildContextPrompt(options: VideoPromptOptions): string {
    const sora = options.modelSpecific?.sora
    
    let context = `동영상 생성 컨텍스트 (OpenAI Sora 2):

모델: OpenAI Sora 2
전체 스타일: ${options.overallStyle.genre}, ${options.overallStyle.mood}
기술 사양: ${options.technical.resolution}, ${options.technical.fps}fps
아스펙트 비율: ${options.technical.aspectRatio}
총 장면 수: ${options.scenes.length}
총 길이: ${options.technical.totalDuration}초
일관성: ${sora?.consistency || 'high'}
최대 길이: ${sora?.maxDuration || options.technical.totalDuration}초
`

    if (options.hasReferenceImage && options.referenceImageDescription) {
      context += `\n참조 이미지: ${options.referenceImageDescription}`
    }

    if (options.overallStyle.contextualTone) {
      context += `\n문맥적 톤앤매너: ${options.overallStyle.contextualTone}`
    }

    if (options.overallStyle.qualitativeTone) {
      context += `\n정성적 톤앤매너: ${options.overallStyle.qualitativeTone}`
    }

    context += `\n\n각 장면은 자연스럽게 연결되며, 전체적인 스토리 흐름을 유지합니다.
Sora는 자연어 프롬프트를 선호하므로, 각 장면의 프롬프트를 그대로 사용하거나 필요에 따라 자연스럽게 수정하여 사용하세요.
${options.hasReferenceImage ? '참조 이미지의 스타일과 구도를 반영하여 일관된 비주얼을 유지하세요.' : ''}
${options.overallStyle.contextualTone || options.overallStyle.qualitativeTone ? '톤앤매너를 일관되게 유지하여 전체적인 분위기를 조성하세요.' : ''}`

    return context
  }
}


