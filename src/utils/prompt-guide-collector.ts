// 프롬프트 가이드 수집 모듈

import { PromptGuide, GuideUpdateResult, ModelName } from '../types/prompt-guide.types'
import { upsertGuides, getLatestGuide } from './prompt-guide-storage'

// 수집 소스 정의
const COLLECTION_SOURCES: Record<ModelName, string[]> = {
  'openai-gpt-4': [
    'https://platform.openai.com/docs/guides/prompt-engineering',
    'https://platform.openai.com/docs/api-reference/chat',
  ],
  'openai-gpt-3.5': [
    'https://platform.openai.com/docs/guides/prompt-engineering',
  ],
  'claude-3': [
    'https://docs.anthropic.com/claude/docs',
  ],
  'claude-3.5': [
    'https://docs.anthropic.com/claude/docs',
  ],
  'gemini-pro': [
    'https://ai.google.dev/docs/prompt_intro',
  ],
  'gemini-ultra': [
    'https://ai.google.dev/docs/prompt_intro',
  ],
  'gemini-nano-banana-pro': [
    'https://ai.google.dev/docs',
  ],
  'midjourney': [
    'https://docs.midjourney.com/docs',
  ],
  'dalle-3': [
    'https://platform.openai.com/docs/guides/images',
  ],
  'stable-diffusion': [
    'https://stability.ai/docs',
  ],
  'sora': [
    'https://openai.com/research/video-generation-models-as-world-simulators',
  ],
  'veo-3': [
    'https://deepmind.google/technologies/veo/',
  ],
  'llama-3': [
    'https://llama.meta.com/docs',
  ],
  'llama-3.1': [
    'https://llama.meta.com/docs',
  ],
}

// 서버 API를 통한 가이드 수집
const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001'

// 서버 API를 통한 가이드 수집
export async function collectGuideFromServer(
  modelName: ModelName
): Promise<Partial<PromptGuide> | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/guides/collect/${modelName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.success && data.result && data.result.guide) {
      return data.result.guide
    }
    
    return null
  } catch (error) {
    console.error(`서버 가이드 수집 실패 (${modelName}):`, error)
    return null
  }
}

// HTML 파싱은 서버 사이드에서 처리됨

// 수동 가이드 추가 (개발자가 직접 추가)
export function addManualGuide(guide: Omit<PromptGuide, 'id' | 'metadata'>): PromptGuide {
  const fullGuide: PromptGuide = {
    ...guide,
    id: `${guide.modelName}-${guide.version}-${Date.now()}`,
    metadata: {
      collectedAt: Date.now(),
      collectedBy: 'manual',
      confidence: 1.0,
    },
  }
  
  upsertGuides([fullGuide])
  return fullGuide
}

// 모든 모델의 가이드 수집 (서버 API 호출)
export async function collectAllGuides(): Promise<GuideUpdateResult[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/guides/collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || '수집 실패')
    }
    
    // 서버 결과를 클라이언트 형식으로 변환
    const results: GuideUpdateResult[] = []
    
    for (const serverResult of data.results || []) {
      const result: GuideUpdateResult = {
        success: serverResult.success,
        modelName: serverResult.modelName as ModelName,
        guidesAdded: 0,
        guidesUpdated: 0,
        errors: serverResult.error ? [serverResult.error] : [],
      }
      
      if (serverResult.success && serverResult.guide) {
        const existing = getLatestGuide(serverResult.modelName as ModelName)
        const guide: PromptGuide = {
          ...serverResult.guide,
          id: `${serverResult.modelName}-${serverResult.guide.version}-${Date.now()}`,
        }
        
        upsertGuides([guide])
        
        if (existing) {
          result.guidesUpdated = 1
        } else {
          result.guidesAdded = 1
        }
      }
      
      results.push(result)
    }
    
    return results
  } catch (error: any) {
    console.error('서버 가이드 수집 실패:', error)
    // 서버 연결 실패 시 빈 결과 반환
    return Object.keys(COLLECTION_SOURCES).map(modelName => ({
      success: false,
      modelName: modelName as ModelName,
      guidesAdded: 0,
      guidesUpdated: 0,
      errors: [error.message || '서버 연결 실패'],
    }))
  }
}

// 버전 증가는 서버에서 처리됨

// 모델명에서 카테고리 추출
function getCategoryFromModel(modelName: ModelName): 'llm' | 'image' | 'video' {
  if (['midjourney', 'dalle-3', 'stable-diffusion'].includes(modelName)) {
    return 'image'
  }
  if (['sora', 'veo-3'].includes(modelName)) {
    return 'video'
  }
  return 'llm'
}

// 기본 가이드 템플릿 생성 (수동 추가용)
export function createDefaultGuide(
  modelName: ModelName,
  customData?: Partial<PromptGuide>
): PromptGuide {
  return {
    id: `${modelName}-default-${Date.now()}`,
    modelName,
    category: getCategoryFromModel(modelName),
    version: '1.0.0',
    title: `${modelName} 프롬프트 가이드`,
    description: `${modelName} 모델을 위한 프롬프트 작성 가이드`,
    lastUpdated: Date.now(),
    source: 'manual',
    content: {
      bestPractices: [],
      tips: [],
    },
    metadata: {
      collectedAt: Date.now(),
      collectedBy: 'manual',
      confidence: 1.0,
    },
    ...customData,
  }
}

