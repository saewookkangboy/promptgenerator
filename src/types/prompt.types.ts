import { GuideContextSummary } from './prompt-guide.types'

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

export interface PromptTemplateSection {
  key: string
  title: string
  content: string
  helperText?: string
}

export interface PromptTemplate {
  title: string
  description?: string
  sections: PromptTemplateSection[]
}

export interface HashtagKeyword {
  keyword: string
  importance: 'high' | 'medium' | 'low' // 중요도: high(적색), medium(파란색), low(검정색)
  pos: string // 품사: 명사, 동사, 형용사 등
}

export interface PromptResult {
  metaPrompt: string
  contextPrompt: string
  hashtags: string[] // 레거시 호환성 (기본 해시태그)
  hashtagKeywords?: HashtagKeyword[] // AI 추출 키워드 (새로운 방식)
  fullPrompt?: string
  metaTemplate?: PromptTemplate
  contextTemplate?: PromptTemplate
  englishMetaTemplate?: PromptTemplate
  englishContextTemplate?: PromptTemplate
  appliedGuide?: GuideContextSummary
  [key: string]: any // 확장 가능한 필드
}

// 기존 ContentType 유지 (하위 호환성)
export type ContentType = 
  | 'blog'
  | 'linkedin'
  | 'facebook'
  | 'instagram'
  | 'youtube'
  | 'twitter' // X (Twitter)
  | 'threads' // Meta Threads
  | 'tiktok' // TikTok
  | 'podcast' // 팟캐스트
  | 'email' // 이메일 마케팅
  | 'newsletter' // 뉴스레터
  | 'product' // 제품 설명서
  | 'faq' // FAQ
  | 'general' // 일반 텍스트 (비정형 자연어 프롬프트)

// 어투/말 표현 타입
export type ToneStyle = 
  | 'conversational' // 대화체
  | 'formal' // 격식체
  | 'friendly' // 친근한 말투
  | 'professional' // 전문적인 말투
  | 'casual' // 캐주얼한 말투
  | 'polite' // 정중한 말투
  | 'concise' // 간결한 말투
  | 'explanatory' // 설명적인 말투

// 기존 DetailedOptions 유지 (하위 호환성)
export interface DetailedOptions {
  age?: string
  gender?: string
  occupation?: string
  conversational: boolean // 하위 호환성 유지
  toneStyles?: ToneStyle[] // 새로운 어투 옵션 (다중 선택 가능)
  goal?: string
}


