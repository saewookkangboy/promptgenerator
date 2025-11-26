// 프롬프트 가이드 타입 정의

export type ModelCategory = 'llm' | 'image' | 'video'

export type ModelName =
  | 'gpt-4.1'
  | 'gpt-4o'
  | 'claude-3.5-sonnet'
  | 'claude-3.5-haiku'
  | 'gemini-2.0-flash'
  | 'llama-3.1'
  | 'midjourney'
  | 'dalle-3'
  | 'stable-diffusion'
  | 'sora'
  | 'veo-3'

export interface PromptGuide {
  id: string
  modelName: ModelName
  category: ModelCategory
  version: string | number
  title: string
  description: string
  summary?: string | null
  lastUpdated?: number
  source?: string
  sourcePrimary?: string | null
  status?: string
  confidence?: number
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
    collectedAt?: number
    collectedBy?: 'manual' | 'scraper' | 'api'
    confidence?: number
    [key: string]: any
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

export interface GuideHistoryEntry {
  id: string
  modelName: ModelName
  success: boolean
  errorMessage?: string | null
  completedAt: string
  guide?: PromptGuide | null
  job?: {
    id: string
    status: string
    triggerType?: string | null
    triggeredBy?: string | null
    startedAt?: string | null
    completedAt?: string | null
  } | null
}

export interface GuideContextSummary {
  guideId: string
  modelName: string
  title?: string
  summary?: string | null
  bestPractices?: string[]
  tips?: string[]
  confidence?: number
}

