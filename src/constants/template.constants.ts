/**
 * 템플릿 갤러리 관련 상수 정의
 */

export const TEMPLATE_CONSTANTS = {
  /** 기본 페이지 크기 */
  DEFAULT_PAGE_SIZE: 100,
  
  /** 최대 페이지 크기 */
  MAX_PAGE_SIZE: 500,
  
  /** 캐시 지속 시간 (밀리초) */
  CACHE_DURATION: 5 * 60 * 1000, // 5분
  
  /** 카테고리 목록 */
  CATEGORIES: ['all', 'text', 'image', 'video', 'engineering'] as const,
  
  /** Top 5 식별자 */
  TOP5_IDENTIFIER: '[Top',
  
  /** AI 추천 식별자 */
  AI_IDENTIFIER: '[AI 추천]',
  
  /** 기본 변수 플레이스홀더 */
  DEFAULT_VARIABLE_PLACEHOLDER: '[변수 입력 필요]',
} as const

/**
 * 템플릿 정렬 우선순위
 */
export const TEMPLATE_SORT_PRIORITY = {
  TOP5: 1,
  AI_RECOMMENDED: 2,
  USAGE_COUNT: 3,
} as const

/**
 * 템플릿 카테고리 표시명
 */
export const TEMPLATE_CATEGORY_LABELS: Record<string, string> = {
  all: '전체',
  text: '텍스트',
  image: '이미지',
  video: '비디오',
  engineering: '엔지니어링',
} as const
