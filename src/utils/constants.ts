// 공통 상수

export const MAX_PROMPT_LENGTH = 5000
export const MIN_PROMPT_LENGTH = 3

export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const

export const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1200,
} as const

export const STORAGE_KEYS = {
  userPreferences: 'prompt-generator-preferences',
  recentPrompts: 'prompt-generator-recent',
} as const

