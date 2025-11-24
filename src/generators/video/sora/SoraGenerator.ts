// Sora 프롬프트 생성기

import { VideoPromptGenerator } from '../VideoPromptGenerator'
import { VideoPromptOptions, VideoToneProfile } from '../../../types/video.types'
import { PromptResult } from '../../../types/prompt.types'

export class SoraGenerator extends VideoPromptGenerator {
  generate(options: VideoPromptOptions): PromptResult {
    const toneProfile = this.analyzeTone(options)
    const scenes = options.scenes.map((scene, index) => ({
      order: index + 1,
      prompt: this.buildScenePrompt(scene, toneProfile),
      duration: scene.duration,
    }))
    
    const fullPrompt = scenes.map(s => s.prompt).join('\n\n---\n\n')
    const metaPrompt = this.buildMetaPrompt(options, toneProfile)
    
    return {
      metaPrompt,
      contextPrompt: this.buildContextPrompt(options, toneProfile),
      hashtags: this.generateHashtags(options.userInput, 'video'),
      fullPrompt,
      scenes,
      toneProfile,
      modelSpecific: {
        sora: {
          maxDuration: options.technical.totalDuration,
          consistency: options.modelSpecific?.sora?.consistency || 'high',
        }
      }
    }
  }

  private buildScenePrompt(scene: VideoPromptOptions['scenes'][0], toneProfile: VideoToneProfile): string {
    const parts: string[] = []
    
    // 기본 장면 설명
    parts.push(`${scene.description} (include tactile, auditory, and atmospheric cues for ${toneProfile.contextTone.toLowerCase()})`)
    
    // 카메라 설정
    const camera = this.formatCamera(scene.camera)
    if (camera) parts.push(camera)
    
    // 모션 설정
    const motion = this.formatMotion(scene.motion)
    if (motion) parts.push(motion)
    
    // 전환 효과
    if (scene.transition) {
      const transition = this.formatTransition(scene.transition)
      if (transition) parts.push(transition)
    }
    
    parts.push(`Tone & Emotion: ${toneProfile.contextTone}, ${toneProfile.emotionalTone}`)
    parts.push(`Descriptive focus: ${toneProfile.descriptiveKeywords.join(', ')}`)
    
    return parts.filter(Boolean).join(', ')
  }

  private buildMetaPrompt(options: VideoPromptOptions, toneProfile: VideoToneProfile): string {
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
톤: ${toneProfile.contextTone}
감정선: ${toneProfile.emotionalTone}
감각 묘사 가이드: ${toneProfile.sensoryFocus}
페이싱: ${toneProfile.pacing}
${options.hasReferenceImage ? '- 참고 사진 또는 스틸컷 정보가 있으므로 장면 묘사 시 해당 이미지를 기반으로 정확한 색감과 구도를 반영' : '- 참고 사진 없이 텍스트 묘사만으로 감각적 디테일을 강화'}

장면 구성 (${options.scenes.length}개):
${options.scenes.map((scene, i) => 
  `${i + 1}. ${scene.description} (${scene.duration}초) - ${this.formatCamera(scene.camera)}`
).join('\n')}`
  }

  private buildContextPrompt(options: VideoPromptOptions, toneProfile: VideoToneProfile): string {
    const sora = options.modelSpecific?.sora
    
    return `동영상 생성 컨텍스트 (OpenAI Sora 2):

모델: OpenAI Sora 2
전체 스타일: ${options.overallStyle.genre}, ${options.overallStyle.mood}
기술 사양: ${options.technical.resolution}, ${options.technical.fps}fps
아스펙트 비율: ${options.technical.aspectRatio}
총 장면 수: ${options.scenes.length}
총 길이: ${options.technical.totalDuration}초
일관성: ${sora?.consistency || 'high'}
최대 길이: ${sora?.maxDuration || options.technical.totalDuration}초
톤앤매너: ${toneProfile.contextTone} / ${toneProfile.emotionalTone}
핵심 묘사 키워드: ${toneProfile.descriptiveKeywords.join(', ')}
감각 묘사 지침: ${toneProfile.sensoryFocus}
${options.hasReferenceImage ? '참조 이미지가 제공되어 있으므로, 장면에서 해당 이미지를 기반으로 색채, 구도, 피사체 특징을 충실히 반영합니다.' : '참조 이미지가 없으므로 텍스트로 제시된 분위기와 감정선을 중심으로 장면을 구성합니다.'}

각 장면은 자연스럽게 연결되며, 전체적인 스토리 흐름을 유지합니다.
Sora는 자연어 프롬프트를 선호하므로, 각 장면의 프롬프트를 그대로 사용하거나 필요에 따라 자연스럽게 수정하여 사용하세요.`
  }
}


