/**
 * 모델 메타데이터 - 각 모델의 상세 정보
 */

export type ModelSpeed = 'very-fast' | 'fast' | 'medium' | 'slow'
export type ModelCost = 'low' | 'medium' | 'high' | 'very-high'

export interface ModelMetadata {
  name: string
  category: 'image' | 'video'
  maxResolution?: string
  speed: ModelSpeed
  cost: ModelCost
  features: string[]
  description: string
  recommendedFor: string[]
  maxDuration?: number // 동영상 모델의 경우 초 단위
  supportsAudio?: boolean
  supportsReferenceImage?: boolean
  maxReferenceImages?: number
  supportsVertical?: boolean
}

export const MODEL_METADATA: Record<string, ModelMetadata> = {
  // 이미지 모델
  'flux-2-pro': {
    name: 'Flux.2 Pro',
    category: 'image',
    maxResolution: '4K',
    speed: 'fast',
    cost: 'medium',
    features: ['고해상도', '빠른 처리', '텍스트 렌더링', '리얼리즘'],
    description: '빠르고 고품질의 이미지 생성에 적합합니다. 범용적으로 사용하기 좋습니다.',
    recommendedFor: ['일반 이미지', '고품질 사진', '상업용 콘텐츠'],
  },
  'flux-2-ultra': {
    name: 'Flux.2 Ultra',
    category: 'image',
    maxResolution: '4K',
    speed: 'medium',
    cost: 'high',
    features: ['최고 해상도', '최고 품질', '세밀한 디테일'],
    description: '최고 품질의 이미지 생성이 필요한 경우 사용합니다.',
    recommendedFor: ['프리미엄 콘텐츠', '인쇄물', '고해상도 필요'],
  },
  'flux': {
    name: 'Flux Pro',
    category: 'image',
    maxResolution: '2K',
    speed: 'fast',
    cost: 'medium',
    features: ['빠른 처리', '고품질', '텍스트 렌더링'],
    description: 'Flux 시리즈의 기본 모델로 빠르고 안정적입니다.',
    recommendedFor: ['일반 이미지', '빠른 생성'],
  },
  'nano-banana-pro': {
    name: 'Nano Banana Pro',
    category: 'image',
    maxResolution: '4K',
    speed: 'very-fast',
    cost: 'medium',
    features: ['텍스트 정렬', '일관성 유지', '다단계 보정', '빠른 처리'],
    description: '텍스트가 포함된 이미지나 정확한 텍스트 렌더링이 필요한 경우 최적입니다.',
    recommendedFor: ['텍스트 포함 이미지', '포스터', '인포그래픽', '빠른 프로토타이핑'],
  },
  'midjourney': {
    name: 'Midjourney v6',
    category: 'image',
    maxResolution: '2K',
    speed: 'medium',
    cost: 'medium',
    features: ['예술적 스타일', '창의적 표현', '다양한 아트 스타일'],
    description: '예술적이고 창의적인 이미지 생성에 특화되어 있습니다.',
    recommendedFor: ['아트워크', '창의적 콘텐츠', '일러스트', '컨셉 아트'],
  },
  'dalle-3': {
    name: 'DALL·E 3',
    category: 'image',
    maxResolution: '2K',
    speed: 'fast',
    cost: 'medium',
    features: ['안전 필터', 'OpenAI 통합', '상업용 안전'],
    description: '안전 필터가 강화되어 상업용 콘텐츠에 적합합니다.',
    recommendedFor: ['상업용 콘텐츠', '안전한 이미지', 'OpenAI 생태계'],
  },
  'stable-diffusion': {
    name: 'Stable Diffusion 3.5 Large',
    category: 'image',
    maxResolution: '4K',
    speed: 'medium',
    cost: 'low',
    features: ['오픈소스', '커스터마이징', '로컬 실행 가능'],
    description: '오픈소스 모델로 커스터마이징이 가능하고 로컬에서도 실행할 수 있습니다.',
    recommendedFor: ['개발자', '커스텀 워크플로우', '오픈소스 선호'],
  },
  'imagen-3': {
    name: 'Imagen 3',
    category: 'image',
    maxResolution: '4K',
    speed: 'fast',
    cost: 'medium',
    features: ['Google 통합', '고품질', '사진 리얼리즘'],
    description: 'Google 생태계와 통합되어 있으며 사진 같은 리얼리즘에 강합니다.',
    recommendedFor: ['Google 생태계', '사진 리얼리즘', '고품질 이미지'],
  },
  'ideogram-2': {
    name: 'Ideogram 2.0',
    category: 'image',
    maxResolution: '2K',
    speed: 'fast',
    cost: 'medium',
    features: ['텍스트 렌더링 특화', '정확한 텍스트', '다양한 스타일'],
    description: '텍스트 렌더링에 특화되어 텍스트가 많은 이미지에 최적입니다.',
    recommendedFor: ['텍스트 포함 이미지', '포스터', '로고', '인포그래픽'],
  },
  'ideogram': {
    name: 'Ideogram 2.0',
    category: 'image',
    maxResolution: '2K',
    speed: 'fast',
    cost: 'medium',
    features: ['텍스트 렌더링 특화', '정확한 텍스트', '다양한 스타일'],
    description: '텍스트 렌더링에 특화되어 텍스트가 많은 이미지에 최적입니다.',
    recommendedFor: ['텍스트 포함 이미지', '포스터', '로고', '인포그래픽'],
  },

  // 동영상 모델
  'sora-2': {
    name: 'OpenAI Sora 2',
    category: 'video',
    maxResolution: '4K',
    speed: 'medium',
    cost: 'high',
    features: ['사실감', '제어 가능성', '오디오 동기화', '영화적 품질'],
    description: '고품질의 영화적인 영상 생성에 최적화되어 있습니다.',
    recommendedFor: ['영화적 영상', '고품질 콘텐츠', '프로페셔널 제작'],
    maxDuration: 60,
    supportsAudio: true,
    supportsReferenceImage: true,
    maxReferenceImages: 1,
  },
  'veo-3.1': {
    name: 'Google Veo 3.1',
    category: 'video',
    maxResolution: '4K',
    speed: 'medium',
    cost: 'high',
    features: ['참조 이미지 3개', '4K 지원', '세로 영상', '일관성 유지'],
    description: '참조 이미지를 최대 3개까지 사용하여 캐릭터나 배경의 일관성을 유지할 수 있습니다.',
    recommendedFor: ['일관성 있는 캐릭터', '배경 유지', '세로 영상', '고품질'],
    maxDuration: 60,
    supportsAudio: false,
    supportsReferenceImage: true,
    maxReferenceImages: 3,
    supportsVertical: true,
  },
  'veo-3': {
    name: 'Google Veo 3',
    category: 'video',
    maxResolution: '4K',
    speed: 'medium',
    cost: 'high',
    features: ['참조 이미지 지원', '4K 지원', '일관성 유지'],
    description: 'Google의 최신 동영상 생성 모델로 고품질 영상을 생성합니다.',
    recommendedFor: ['고품질 영상', '일관성 유지', 'Google 생태계'],
    maxDuration: 60,
    supportsAudio: false,
    supportsReferenceImage: true,
    maxReferenceImages: 2,
  },
  'veo-2': {
    name: 'Google Veo 2',
    category: 'video',
    maxResolution: '4K',
    speed: 'medium',
    cost: 'high',
    features: ['고품질', '4K 지원', '일관성'],
    description: 'Google Veo 시리즈의 이전 버전으로 안정적입니다.',
    recommendedFor: ['고품질 영상', '일관성 유지'],
    maxDuration: 60,
    supportsAudio: false,
    supportsReferenceImage: true,
    maxReferenceImages: 1,
  },
  'kling-2.6': {
    name: 'Kling AI 2.6',
    category: 'video',
    maxResolution: '4K',
    speed: 'fast',
    cost: 'medium',
    features: ['멀티모달', '오디오-비디오 동기화', '종합 제작'],
    description: '오디오와 비디오를 동기화하여 종합적인 영상 제작이 가능합니다.',
    recommendedFor: ['오디오 포함 영상', '종합 제작', '빠른 처리'],
    maxDuration: 30,
    supportsAudio: true,
    supportsReferenceImage: true,
    maxReferenceImages: 1,
  },
  'kling': {
    name: 'Kling AI v1.6',
    category: 'video',
    maxResolution: '2K',
    speed: 'fast',
    cost: 'medium',
    features: ['오디오 동기화', '빠른 처리'],
    description: 'Kling AI의 이전 버전으로 빠른 처리가 가능합니다.',
    recommendedFor: ['빠른 영상 생성', '오디오 포함'],
    maxDuration: 10,
    supportsAudio: true,
    supportsReferenceImage: false,
  },
  'runway-gen3': {
    name: 'Runway Gen-3',
    category: 'video',
    maxResolution: '4K',
    speed: 'medium',
    cost: 'high',
    features: ['영화적 품질', '다양한 스타일', '프로페셔널'],
    description: '영화적 품질의 전문적인 영상 제작에 적합합니다.',
    recommendedFor: ['전문 영상 제작', '영화적 품질', '다양한 스타일'],
    maxDuration: 10,
    supportsAudio: false,
    supportsReferenceImage: true,
    maxReferenceImages: 1,
  },
  'pika-2': {
    name: 'Pika Labs 2.0',
    category: 'video',
    maxResolution: '2K',
    speed: 'very-fast',
    cost: 'medium',
    features: ['빠른 처리', '모션 제어', '즉시 미리보기'],
    description: '빠른 처리가 가능하여 프로토타이핑이나 빠른 결과가 필요한 경우에 적합합니다.',
    recommendedFor: ['빠른 프로토타이핑', '짧은 클립', '즉시 미리보기'],
    maxDuration: 4,
    supportsAudio: false,
    supportsReferenceImage: true,
    maxReferenceImages: 1,
  },
  'pika': {
    name: 'Pika Labs 2.0',
    category: 'video',
    maxResolution: '2K',
    speed: 'very-fast',
    cost: 'medium',
    features: ['빠른 처리', '모션 제어', '즉시 미리보기'],
    description: '빠른 처리가 가능하여 프로토타이핑이나 빠른 결과가 필요한 경우에 적합합니다.',
    recommendedFor: ['빠른 프로토타이핑', '짧은 클립', '즉시 미리보기'],
    maxDuration: 4,
    supportsAudio: false,
    supportsReferenceImage: true,
    maxReferenceImages: 1,
  },
  'ltx-2': {
    name: 'LTX-2',
    category: 'video',
    maxResolution: '4K',
    speed: 'fast',
    cost: 'low',
    features: ['4K 50fps', '오픈소스', '고성능'],
    description: '오픈소스 기반의 고성능 동영상 생성 모델입니다.',
    recommendedFor: ['오픈소스 선호', '고성능 필요', '4K 50fps'],
    maxDuration: 10,
    supportsAudio: true,
    supportsReferenceImage: true,
    maxReferenceImages: 1,
  },
}

/**
 * 모델 ID를 받아 메타데이터를 반환
 */
export function getModelMetadata(modelId: string): ModelMetadata | null {
  return MODEL_METADATA[modelId] || null
}

/**
 * 카테고리별 모델 목록 반환
 */
export function getModelsByCategory(category: 'image' | 'video'): ModelMetadata[] {
  return Object.entries(MODEL_METADATA)
    .filter(([_, metadata]) => metadata.category === category)
    .map(([_, metadata]) => metadata)
}

/**
 * 가이드모드용 추천 모델 목록
 */
export function getRecommendedModelsForGuide(category: 'image' | 'video'): {
  recommended: string
  fast: string
  highQuality: string
  artistic?: string
  audio?: string
} {
  if (category === 'image') {
    return {
      recommended: 'flux-2-pro',
      fast: 'nano-banana-pro',
      highQuality: 'imagen-3',
      artistic: 'midjourney',
    }
  } else {
    return {
      recommended: 'veo-3.1',
      fast: 'pika-2',
      highQuality: 'sora-2',
      audio: 'kling-2.6',
    }
  }
}
