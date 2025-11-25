// 프롬프트 가이드 타입 정의

export type ModelCategory = 'llm' | 'image' | 'video'

export type ModelName =
  | 'openai-gpt-4'
  | 'openai-gpt-3.5'
  | 'claude-3'
  | 'claude-3.5'
  | 'gemini-pro'
  | 'gemini-ultra'
  | 'gemini-nano-banana-pro'
  | 'midjourney'
  | 'dalle-3'
  | 'stable-diffusion'
  | 'sora'
  | 'veo-3'
  | 'llama-3'
  | 'llama-3.1'

export interface PromptGuide {
  id: string
  modelName: ModelName
  category: ModelCategory
  version: string
  title: string
  description: string
  lastUpdated: number // timestamp
  source: string // 출처 URL
  content: {
    bestPractices?: string[]
    promptStructure?: string
    examples?: Array<{
      input: string
      output: string
      explanation?: string
    }>
    parameters?: {
      [key: string]: {
        description: string
        type: string
        default?: any
        options?: string[]
      }
    }
    tips?: string[]
    commonMistakes?: string[]
    styleGuide?: string
  }
  metadata: {
    collectedAt: number
    collectedBy: 'manual' | 'scraper' | 'api'
    confidence: number // 0-1, 수집된 데이터의 신뢰도
  }
}

export interface GuideCollection {
  guides: PromptGuide[]
  lastCollectionDate: number
  nextScheduledCollection: number
}

export interface GuideUpdateResult {
  success: boolean
  modelName: ModelName
  guidesAdded: number
  guidesUpdated: number
  errors?: string[]
}

