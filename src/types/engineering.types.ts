// 프롬프트 엔지니어링 관련 타입 정의

import { BasePromptOptions } from './prompt.types'

export interface EngineeringPromptOptions extends BasePromptOptions {
  category: 'engineering'
  method: 'cot' | 'few-shot' | 'role-based' | 'zero-shot' | 'optimize'
  basePrompt: string
  engineeringConfig?: EngineeringConfig
}

export interface EngineeringConfig {
  // Chain of Thought 설정
  cot?: {
    steps: string[]
    reasoning: boolean
  }
  // Few-shot 설정
  fewShot?: {
    examples: Array<{
      input: string
      output: string
      explanation?: string
    }>
    numExamples: number
  }
  // Role-based 설정
  roleBased?: {
    role: string
    expertise: string[]
    perspective?: string
  }
  // 최적화 설정
  optimize?: {
    clarity: boolean
    structure: boolean
    keywords: boolean
    length?: 'short' | 'medium' | 'long'
  }
}

export interface OptimizedPrompt {
  original: string
  optimized: string
  score: number
  suggestions: string[]
  improvements: string[]
}


