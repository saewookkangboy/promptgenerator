// Veo 프롬프트 생성기

import { VideoPromptGenerator } from '../VideoPromptGenerator'
import { VideoPromptOptions, VideoToneProfile } from '../../../types/video.types'
import { PromptResult } from '../../../types/prompt.types'

export class VeoGenerator extends VideoPromptGenerator {
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
        veo: {
          quality: options.modelSpecific?.veo?.quality || 'high',
          extendedDuration: options.modelSpecific?.veo?.extendedDuration || false,
        }
      }
    }
  }

  private buildScenePrompt(scene: VideoPromptOptions['scenes'][0], toneProfile: VideoToneProfile): string {
    const parts: string[] = []
    
    // 기본 장면 설명
    parts.push(`${scene.description} (describe micro-expressions, environment texture, and lighting variations for ${toneProfile.contextTone.toLowerCase()})`)
    
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
    
    parts.push(`Tone focus: ${toneProfile.contextTone}`)
    parts.push(`Emotion direction: ${toneProfile.emotionalTone}`)
    parts.push(`Descriptive cues: ${toneProfile.descriptiveKeywords.join(', ')}`)
    
    return parts.filter(Boolean).join(', ')
  }

  private buildMetaPrompt(options: VideoPromptOptions, toneProfile: VideoToneProfile): string {
    const style = this.formatStyle(options.overallStyle)
    
    return `동영상 생성 프롬프트 (Google Veo 3):

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
감각/질감 지침: ${toneProfile.sensoryFocus}
페이싱: ${toneProfile.pacing}
${options.hasReferenceImage ? '- 참고 사진을 기반으로 실제 촬영 질감과 동일한 디테일을 재현' : '- 텍스트 묘사를 기반으로 분위기와 감정선을 정교하게 재현'}

장면 구성 (${options.scenes.length}개):
${options.scenes.map((scene, i) => 
  `${i + 1}. ${scene.description} (${scene.duration}초) - ${this.formatCamera(scene.camera)}`
).join('\n')}`
  }

  private buildContextPrompt(options: VideoPromptOptions, toneProfile: VideoToneProfile): string {
    const veo = options.modelSpecific?.veo
    
    return `동영상 생성 컨텍스트 (Google Veo 3):

모델: Google Veo 3
전체 스타일: ${options.overallStyle.genre}, ${options.overallStyle.mood}
기술 사양: ${options.technical.resolution}, ${options.technical.fps}fps
아스펙트 비율: ${options.technical.aspectRatio}
총 장면 수: ${options.scenes.length}
총 길이: ${options.technical.totalDuration}초
품질: ${veo?.quality || 'high'}
확장 길이: ${veo?.extendedDuration ? '활성화' : '비활성화'}
톤앤매너: ${toneProfile.contextTone} / ${toneProfile.emotionalTone}
핵심 묘사 키워드: ${toneProfile.descriptiveKeywords.join(', ')}
감각 묘사 지침: ${toneProfile.sensoryFocus}
${options.hasReferenceImage ? '참조 사진이 있으므로 동일한 피사체 특성과 색감을 유지하세요.' : '참조 사진이 없으므로 텍스트 기반 감각 묘사를 충실히 반영하세요.'}

Veo 3는 초고해상도와 긴 컷을 지원합니다.
각 장면은 자연스럽게 연결되며, 전체적인 스토리 흐름을 유지합니다.`
  }
}


