export type ContentType = 
  | 'blog'
  | 'linkedin'
  | 'facebook'
  | 'instagram'
  | 'youtube'

export interface DetailedOptions {
  age?: string
  gender?: string
  occupation?: string
  conversational: boolean
}

export interface PromptResult {
  metaPrompt: string
  contextPrompt: string
  hashtags: string[]
}

