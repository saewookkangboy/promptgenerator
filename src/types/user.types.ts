import { PromptSummary } from './prompt.types'

export interface UserStats {
  promptCount: number
  workspaceCount: number
}

export interface UserOverview {
  user: {
    id: string
    email: string
    name?: string | null
    tier: string
    subscriptionStatus?: string
    createdAt?: string
    stats?: UserStats
  }
  recentPrompts: PromptSummary[]
}

