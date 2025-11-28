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
    const englishMetaPrompt = this.buildEnglishMetaPrompt(options, scenes)
    const englishContextPrompt = this.buildEnglishContextPrompt(options)
    const englishFullPrompt = convertToNativeEnglish(fullPrompt)
    
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
    return addEnglishVersion(result, {
      metaPrompt: englishMetaPrompt,
      contextPrompt: englishContextPrompt,
      fullPrompt: englishFullPrompt,
    })
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

  private getModelDisplayName(model: VideoPromptOptions['model']): string {
    const modelNames: Record<string, string> = {
      'sora': 'OpenAI Sora',
      'sora-2': 'OpenAI Sora 2',
      'veo': 'Google Veo',
      'veo-3': 'Google Veo 3',
      'runway': 'Runway',
      'runway-gen3': 'Runway Gen-3',
      'pika': 'Pika Labs',
      'pika-2': 'Pika Labs 2.0',
      'stable-video': 'Stable Video Diffusion',
      'kling': 'Kling AI',
      'luma': 'Luma Dream Machine',
    }
    return modelNames[model] || model
  }

  private buildMetaPrompt(options: VideoPromptOptions): string {
    const style = this.formatStyle(options.overallStyle)
    const modelName = this.getModelDisplayName(options.model)
    
    return `동영상 생성 프롬프트 (${modelName}):

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

  private getModelSpecificGuidance(model: VideoPromptOptions['model']): string {
    const guidanceMap: Record<string, string> = {
      'sora': 'OpenAI Sora는 자연어 프롬프트를 선호합니다. 각 장면의 프롬프트를 그대로 사용하거나 필요에 따라 자연스럽게 수정하여 사용하세요.',
      'sora-2': 'OpenAI Sora 2는 자연어 프롬프트를 선호합니다. 각 장면의 프롬프트를 그대로 사용하거나 필요에 따라 자연스럽게 수정하여 사용하세요.',
      'runway': 'Runway는 자연어 프롬프트를 선호합니다. 각 장면의 프롬프트를 그대로 사용하거나 필요에 따라 자연스럽게 수정하여 사용하세요.',
      'runway-gen3': 'Runway Gen-3는 자연어 프롬프트를 선호합니다. 각 장면의 프롬프트를 그대로 사용하거나 필요에 따라 자연스럽게 수정하여 사용하세요.',
      'pika': 'Pika Labs는 자연어 프롬프트를 선호합니다. 각 장면의 프롬프트를 그대로 사용하거나 필요에 따라 자연스럽게 수정하여 사용하세요.',
      'pika-2': 'Pika Labs 2.0는 자연어 프롬프트를 선호합니다. 각 장면의 프롬프트를 그대로 사용하거나 필요에 따라 자연스럽게 수정하여 사용하세요.',
      'stable-video': 'Stable Video Diffusion은 구조화된 프롬프트를 선호합니다. 각 장면의 프롬프트를 그대로 사용하거나 필요에 따라 수정하여 사용하세요.',
      'kling': 'Kling AI는 자연어 프롬프트를 선호합니다. 각 장면의 프롬프트를 그대로 사용하거나 필요에 따라 자연스럽게 수정하여 사용하세요.',
      'luma': 'Luma Dream Machine는 자연어 프롬프트를 선호합니다. 각 장면의 프롬프트를 그대로 사용하거나 필요에 따라 자연스럽게 수정하여 사용하세요.',
    }
    return guidanceMap[model] || '각 장면의 프롬프트를 그대로 사용하거나 필요에 따라 자연스럽게 수정하여 사용하세요.'
  }

  private buildContextPrompt(options: VideoPromptOptions): string {
    const sora = options.modelSpecific?.sora
    const sora2 = options.modelSpecific?.sora2
    const runway = options.modelSpecific?.runway
    const runwayGen3 = options.modelSpecific?.runwayGen3
    const pika = options.modelSpecific?.pika
    const pika2 = options.modelSpecific?.pika2
    const kling = options.modelSpecific?.kling
    const modelName = this.getModelDisplayName(options.model)
    const modelGuidance = this.getModelSpecificGuidance(options.model)
    
    // 모델별 특정 정보 구성
    let modelSpecificInfo = ''
    if (options.model === 'sora' || options.model === 'sora-2') {
      modelSpecificInfo = `일관성: ${sora2?.consistency || sora?.consistency || 'high'}
최대 길이: ${sora2?.maxDuration || sora?.maxDuration || options.technical.totalDuration}초
${sora2?.motionControl ? `모션 제어: ${sora2.motionControl}` : ''}
${sora2?.promptStructure ? `프롬프트 구조: ${sora2.promptStructure}` : ''}
`
    } else if (options.model === 'runway' || options.model === 'runway-gen3') {
      modelSpecificInfo = `${runwayGen3?.style || runway?.style ? `스타일: ${runwayGen3?.style || runway?.style}` : ''}
${runwayGen3?.motion || runway?.motion ? `모션: ${runwayGen3?.motion || runway?.motion}` : ''}
${runwayGen3?.interpolation !== undefined ? `프레임 보간: ${runwayGen3.interpolation ? '활성화' : '비활성화'}` : ''}
`
    } else if (options.model === 'pika' || options.model === 'pika-2') {
      modelSpecificInfo = `${pika2?.motion || pika?.motion ? `모션: ${pika2?.motion || pika?.motion}` : ''}
${pika2?.promptStrength ? `Prompt Strength: ${pika2.promptStrength}` : ''}
`
    } else if (options.model === 'kling') {
      modelSpecificInfo = `${kling?.duration ? `길이: ${kling.duration}초` : ''}
${kling?.style ? `스타일: ${kling.style}` : ''}
`
    }
    
    let context = `동영상 생성 컨텍스트 (${modelName}):

모델: ${modelName}
전체 스타일: ${options.overallStyle.genre}, ${options.overallStyle.mood}
기술 사양: ${options.technical.resolution}, ${options.technical.fps}fps
아스펙트 비율: ${options.technical.aspectRatio}
총 장면 수: ${options.scenes.length}
총 길이: ${options.technical.totalDuration}초
${modelSpecificInfo}`

    if (options.hasReferenceImage && options.referenceImageDescription) {
      context += `참조 이미지: ${options.referenceImageDescription}\n`
    }

    if (options.overallStyle.contextualTone) {
      context += `문맥적 톤앤매너: ${options.overallStyle.contextualTone}\n`
    }

    if (options.overallStyle.qualitativeTone) {
      context += `정성적 톤앤매너: ${options.overallStyle.qualitativeTone}\n`
    }

    context += `\n각 장면은 자연스럽게 연결되며, 전체적인 스토리 흐름을 유지합니다.
${modelGuidance}
${options.hasReferenceImage ? '참조 이미지의 스타일과 구도를 반영하여 일관된 비주얼을 유지하세요.' : ''}
${options.overallStyle.contextualTone || options.overallStyle.qualitativeTone ? '톤앤매너를 일관되게 유지하여 전체적인 분위기를 조성하세요.' : ''}`

    return context
  }

  private buildEnglishMetaPrompt(
    options: VideoPromptOptions,
    scenes: Array<{ order: number; prompt: string; duration: number }>
  ): string {
    const toneParts: string[] = []
    if (options.overallStyle.contextualTone) {
      toneParts.push(`Contextual tone: ${options.overallStyle.contextualTone}`)
    }
    if (options.overallStyle.qualitativeTone) {
      toneParts.push(`Qualitative tone: ${options.overallStyle.qualitativeTone}`)
    }
    const modelName = this.getModelDisplayName(options.model)

    return `Video generation prompt (${modelName}):

Genre: ${options.overallStyle.genre}
Mood: ${options.overallStyle.mood}
Color grading: ${options.overallStyle.colorGrading}
${options.overallStyle.cinematic ? 'Cinematic quality required' : ''}
${toneParts.join('\n')}

Total duration: ${options.technical.totalDuration} seconds
Resolution: ${options.technical.resolution}
Frame rate: ${options.technical.fps}fps
Aspect ratio: ${options.technical.aspectRatio}
${options.hasReferenceImage && options.referenceImageDescription ? `Reference image: ${options.referenceImageDescription}` : ''}

Scene outline (${scenes.length} total):
${scenes
  .map(scene => `- Scene ${scene.order}: ${convertToNativeEnglish(scene.prompt)} (${scene.duration}s)`)
  .join('\n')}`
  }

  private getModelSpecificGuidanceEnglish(model: VideoPromptOptions['model']): string {
    const guidanceMap: Record<string, string> = {
      'sora': 'OpenAI Sora prefers natural language prompts. Use each scene prompt as-is or adjust wording to match your creative direction.',
      'sora-2': 'OpenAI Sora 2 prefers natural language prompts. Use each scene prompt as-is or adjust wording to match your creative direction.',
      'runway': 'Runway prefers natural language prompts. Use each scene prompt as-is or adjust wording to match your creative direction.',
      'runway-gen3': 'Runway Gen-3 prefers natural language prompts. Use each scene prompt as-is or adjust wording to match your creative direction.',
      'pika': 'Pika Labs prefers natural language prompts. Use each scene prompt as-is or adjust wording to match your creative direction.',
      'pika-2': 'Pika Labs 2.0 prefers natural language prompts. Use each scene prompt as-is or adjust wording to match your creative direction.',
      'stable-video': 'Stable Video Diffusion prefers structured prompts. Use each scene prompt as-is or adjust wording to match your creative direction.',
      'kling': 'Kling AI prefers natural language prompts. Use each scene prompt as-is or adjust wording to match your creative direction.',
      'luma': 'Luma Dream Machine prefers natural language prompts. Use each scene prompt as-is or adjust wording to match your creative direction.',
    }
    return guidanceMap[model] || 'Use each scene prompt as-is or adjust wording to match your creative direction.'
  }

  private buildEnglishContextPrompt(options: VideoPromptOptions): string {
    const sora = options.modelSpecific?.sora
    const sora2 = options.modelSpecific?.sora2
    const runway = options.modelSpecific?.runway
    const runwayGen3 = options.modelSpecific?.runwayGen3
    const pika = options.modelSpecific?.pika
    const pika2 = options.modelSpecific?.pika2
    const kling = options.modelSpecific?.kling
    const modelName = this.getModelDisplayName(options.model)
    const modelGuidance = this.getModelSpecificGuidanceEnglish(options.model)
    const toneParts: string[] = []
    if (options.overallStyle.contextualTone) {
      toneParts.push(`Contextual tone: ${options.overallStyle.contextualTone}`)
    }
    if (options.overallStyle.qualitativeTone) {
      toneParts.push(`Qualitative tone: ${options.overallStyle.qualitativeTone}`)
    }
    
    // 모델별 특정 정보 구성
    let modelSpecificInfo = ''
    if (options.model === 'sora' || options.model === 'sora-2') {
      modelSpecificInfo = `Consistency: ${sora2?.consistency || sora?.consistency || 'high'}
Max duration: ${sora2?.maxDuration || sora?.maxDuration || options.technical.totalDuration} seconds
${sora2?.motionControl ? `Motion control: ${sora2.motionControl}` : ''}
${sora2?.promptStructure ? `Prompt structure: ${sora2.promptStructure}` : ''}
`
    } else if (options.model === 'runway' || options.model === 'runway-gen3') {
      modelSpecificInfo = `${runwayGen3?.style || runway?.style ? `Style: ${runwayGen3?.style || runway?.style}` : ''}
${runwayGen3?.motion || runway?.motion ? `Motion: ${runwayGen3?.motion || runway?.motion}` : ''}
${runwayGen3?.interpolation !== undefined ? `Frame interpolation: ${runwayGen3.interpolation ? 'enabled' : 'disabled'}` : ''}
`
    } else if (options.model === 'pika' || options.model === 'pika-2') {
      modelSpecificInfo = `${pika2?.motion || pika?.motion ? `Motion: ${pika2?.motion || pika?.motion}` : ''}
${pika2?.promptStrength ? `Prompt Strength: ${pika2.promptStrength}` : ''}
`
    } else if (options.model === 'kling') {
      modelSpecificInfo = `${kling?.duration ? `Duration: ${kling.duration} seconds` : ''}
${kling?.style ? `Style: ${kling.style}` : ''}
`
    }

    return `Video generation context (${modelName}):

Model: ${modelName}
Overall style: ${options.overallStyle.genre}, ${options.overallStyle.mood}
Technical specs: ${options.technical.resolution}, ${options.technical.fps}fps
Aspect ratio: ${options.technical.aspectRatio}
Total scenes: ${options.scenes.length}
Total duration: ${options.technical.totalDuration} seconds
${modelSpecificInfo}${toneParts.join('\n')}
${options.hasReferenceImage && options.referenceImageDescription ? `Reference image: ${options.referenceImageDescription}` : ''}

Ensure each scene flows naturally and supports the overall narrative.
${modelGuidance}
Use the reference image to maintain visual consistency when provided.
Keep the requested tone and mood consistent throughout the video.`
  }
}


