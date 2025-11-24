// 기본 프롬프트 타입 정의

export type PromptCategory = 
  | 'text' 
  | 'image' 
  | 'video' 
  | 'engineering'

export interface TargetAudience {
  age?: string
  gender?: string
  occupation?: string
  interests?: string[]
}

export interface BasePromptOptions {
  category: PromptCategory
  userInput: string
  targetAudience?: TargetAudience
  tone?: string
  conversational?: boolean
}

export interface PromptResult {
  metaPrompt: string
  contextPrompt: string
  hashtags: string[]
  fullPrompt?: string
  [key: string]: any // 확장 가능한 필드
}

// 기존 ContentType 유지 (하위 호환성)
export type ContentType = 
  | 'blog'
  | 'linkedin'
  | 'facebook'
  | 'instagram'
  | 'youtube'

// 기존 DetailedOptions 유지 (하위 호환성)
export interface DetailedOptions {
  age?: string
  gender?: string
  occupation?: string
  conversational: boolean
}


