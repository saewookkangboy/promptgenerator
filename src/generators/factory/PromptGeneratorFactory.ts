// 프롬프트 생성기 팩토리

import { BasePromptGenerator } from '../base/BasePromptGenerator'
import { TextPromptGenerator } from '../text/TextPromptGenerator'
import { MidjourneyGenerator } from '../image/midjourney/MidjourneyGenerator'
import { DALLEGenerator } from '../image/dalle/DALLEGenerator'
import { SoraGenerator } from '../video/sora/SoraGenerator'
import { VeoGenerator } from '../video/veo/VeoGenerator'
import { PromptEngineer } from '../engineering/PromptEngineer'
import { PromptCategory } from '../../types/prompt.types'
import { ImageModel } from '../../types/image.types'
import { VideoModel } from '../../types/video.types'

export class PromptGeneratorFactory {
  /**
   * 카테고리와 모델에 따라 적절한 프롬프트 생성기를 반환
   */
  static create(category: PromptCategory, model?: string): BasePromptGenerator {
    switch (category) {
      case 'text':
        return new TextPromptGenerator()
      
      case 'image':
        // 기본 모델로 Midjourney 사용
        const imageModel = (model as ImageModel) || 'midjourney'
        return this.createImageGenerator(imageModel)
      
      case 'video':
        // 기본 모델로 Sora 사용
        const videoModel = (model as VideoModel) || 'sora'
        return this.createVideoGenerator(videoModel)
      
      case 'engineering':
        return new PromptEngineer()
      
      default:
        throw new Error(`Unknown category: ${category}`)
    }
  }

  /**
   * 이미지 모델별 생성기 생성
   */
  static createImageGenerator(model: ImageModel): BasePromptGenerator {
    switch (model) {
      case 'midjourney':
        return new MidjourneyGenerator()
      case 'dalle':
        return new DALLEGenerator()
      case 'stable-diffusion':
        // Phase 2 확장에서 구현 예정
        return new MidjourneyGenerator() // 임시
      case 'imagen':
        // Phase 2 확장에서 구현 예정
        return new MidjourneyGenerator() // 임시
      case 'firefly':
        // Phase 2 확장에서 구현 예정
        return new MidjourneyGenerator() // 임시
      default:
        return new MidjourneyGenerator()
    }
  }

  /**
   * 동영상 모델별 생성기 생성
   */
  static createVideoGenerator(model: VideoModel): BasePromptGenerator {
    switch (model) {
      case 'sora':
        return new SoraGenerator()
      case 'veo':
        return new VeoGenerator()
      case 'runway':
        // Phase 3 확장에서 구현 예정
        return new SoraGenerator() // 임시
      case 'pika':
        // Phase 3 확장에서 구현 예정
        return new SoraGenerator() // 임시
      case 'stable-video':
        // Phase 3 확장에서 구현 예정
        return new SoraGenerator() // 임시
      default:
        return new SoraGenerator()
    }
  }
}

