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

// 웹 스크래핑을 통한 가이드 수집 (실제 구현은 서버 사이드에서 권장)
export async function collectGuideFromWeb(
  modelName: ModelName,
  sourceUrl: string
): Promise<Partial<PromptGuide>> {
  try {
    // CORS 문제로 인해 실제로는 서버 사이드에서 수집해야 함
    // 여기서는 구조만 제공
    const response = await fetch(sourceUrl, {
      mode: 'cors',
      headers: {
        'Accept': 'text/html',
      },
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const html = await response.text()
    
    // HTML 파싱 (실제로는 더 정교한 파싱 필요)
    return parseGuideFromHTML(html, modelName, sourceUrl)
  } catch (error) {
    console.error(`가이드 수집 실패 (${modelName}):`, error)
    return {}
  }
}

// HTML에서 가이드 정보 파싱
function parseGuideFromHTML(
  html: string,
  modelName: ModelName,
  sourceUrl: string
): Partial<PromptGuide> {
  // 실제 구현에서는 cheerio, jsdom 등의 라이브러리 사용
  // 여기서는 기본 구조만 제공
  
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  
  // 메타 정보 추출
  const title = doc.querySelector('title')?.textContent || ''
  const description = doc.querySelector('meta[name="description"]')?.getAttribute('content') || ''
  
  // 가이드 내용 추출 (실제로는 더 정교한 파싱 필요)
  const content: PromptGuide['content'] = {
    bestPractices: extractBestPractices(doc),
    tips: extractTips(doc),
  }
  
  return {
    modelName,
    source: sourceUrl,
    title,
    description,
    content,
    metadata: {
      collectedAt: Date.now(),
      collectedBy: 'scraper',
      confidence: 0.7, // 기본 신뢰도
    },
  }
}

// 모범 사례 추출
function extractBestPractices(_doc: Document): string[] {
  const practices: string[] = []
  // 실제 구현에서는 특정 셀렉터로 추출
  // 예: doc.querySelectorAll('.best-practice, .tip, .guideline')
  return practices
}

// 팁 추출
function extractTips(_doc: Document): string[] {
  const tips: string[] = []
  // 실제 구현에서는 특정 셀렉터로 추출
  return tips
}

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

// 모든 모델의 가이드 수집 (스케줄러에서 호출)
export async function collectAllGuides(): Promise<GuideUpdateResult[]> {
  const results: GuideUpdateResult[] = []
  
  for (const [modelName, sources] of Object.entries(COLLECTION_SOURCES)) {
    const result: GuideUpdateResult = {
      success: false,
      modelName: modelName as ModelName,
      guidesAdded: 0,
      guidesUpdated: 0,
      errors: [],
    }
    
    try {
      for (const sourceUrl of sources) {
        try {
          const guideData = await collectGuideFromWeb(
            modelName as ModelName,
            sourceUrl
          )
          
          if (Object.keys(guideData).length > 0) {
            const existing = getLatestGuide(modelName as ModelName)
            const version = existing
              ? incrementVersion(existing.version)
              : '1.0.0'
            
            const guide: PromptGuide = {
              id: `${modelName}-${version}-${Date.now()}`,
              modelName: modelName as ModelName,
              category: getCategoryFromModel(modelName as ModelName),
              version,
              title: guideData.title || `${modelName} 가이드`,
              description: guideData.description || '',
              lastUpdated: Date.now(),
              source: guideData.source || sourceUrl,
              content: guideData.content || {},
              metadata: {
                collectedAt: Date.now(),
                collectedBy: 'scraper',
                confidence: 0.7,
              },
            }
            
            upsertGuides([guide])
            
            if (existing) {
              result.guidesUpdated++
            } else {
              result.guidesAdded++
            }
          }
        } catch (error: any) {
          result.errors?.push(`Source ${sourceUrl}: ${error.message}`)
        }
      }
      
      result.success = result.guidesAdded > 0 || result.guidesUpdated > 0
    } catch (error: any) {
      result.errors?.push(error.message)
    }
    
    results.push(result)
  }
  
  return results
}

// 버전 증가
function incrementVersion(version: string): string {
  const parts = version.split('.')
  const minor = parseInt(parts[1] || '0', 10) + 1
  return `${parts[0]}.${minor}.0`
}

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

