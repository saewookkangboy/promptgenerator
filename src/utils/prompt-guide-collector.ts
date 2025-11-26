// 프롬프트 가이드 수집 모듈

import { PromptGuide, GuideUpdateResult, ModelName } from '../types/prompt-guide.types'
import { syncGuideCollection } from './prompt-guide-storage'

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
      await syncGuideCollection(true).catch(() => null)
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
  const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001'
  
  try {
    // 서버 연결 확인
    try {
      const healthCheck = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5초 타임아웃
      })
      
      if (!healthCheck.ok) {
        throw new Error(`서버 헬스 체크 실패 (HTTP ${healthCheck.status})`)
      }
    } catch (healthError: any) {
      if (healthError.name === 'AbortError' || healthError.name === 'TypeError') {
        throw new Error(
          `서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.\n` +
          `서버 실행: npm run server 또는 npm run server:dev\n` +
          `서버 URL: ${API_BASE_URL}`
        )
      }
      throw healthError
    }
    
    const response = await fetch(`${API_BASE_URL}/api/guides/collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(300000), // 5분 타임아웃 (수집에 시간이 걸릴 수 있음)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText || '서버 오류'}`)
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
        result.guidesAdded = 1
      }
      
      results.push(result)
    }

    await syncGuideCollection(true).catch(() => null)
    
    return results
  } catch (error: any) {
    console.error('서버 가이드 수집 실패:', error)
    
    // 네트워크 오류인 경우 더 명확한 메시지
    let errorMessage = error.message || '서버 연결 실패'
    
    if (error.name === 'AbortError') {
      errorMessage = '요청 시간 초과. 서버가 응답하지 않습니다.'
    } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      errorMessage = `서버에 연결할 수 없습니다.\n\n` +
        `해결 방법:\n` +
        `1. 서버가 실행 중인지 확인: npm run server 또는 npm run server:dev\n` +
        `2. 서버 URL 확인: ${API_BASE_URL}\n` +
        `3. 방화벽 또는 네트워크 설정 확인`
    }
    
    // 서버 연결 실패 시 에러 결과 반환
    throw new Error(errorMessage)
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

