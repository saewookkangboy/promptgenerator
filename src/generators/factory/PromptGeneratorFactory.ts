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
        // Stable Diffusion은 Midjourney와 유사한 구조 사용
        return new MidjourneyGenerator()
      case 'imagen':
      case 'imagen-3':
        // Google Imagen 3 (Nano Banana Pro)는 구조화된 프롬프트 사용
        return new DALLEGenerator() // 구조화된 프롬프트 생성 방식 유사
      case 'firefly':
      case 'leonardo':
      case 'flux':
      case 'ideogram':
      case 'comfyui':
        // 유사한 구조의 생성기 사용
        return new DALLEGenerator()
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
      case 'sora-2':
        return new SoraGenerator()
      case 'veo':
      case 'veo-3':
        return new VeoGenerator()
      case 'runway':
      case 'runway-gen3':
        // Runway Gen-3는 Sora와 유사한 구조
        return new SoraGenerator()
      case 'pika':
      case 'pika-2':
        // Pika Labs는 Sora와 유사한 구조
        return new SoraGenerator()
      case 'stable-video':
        // Stable Video Diffusion은 Sora와 유사한 구조
        return new SoraGenerator()
      case 'kling':
      case 'luma':
        // Kling AI와 Luma는 Sora와 유사한 구조
        return new SoraGenerator()
      default:
        return new SoraGenerator()
    }
  }
}

