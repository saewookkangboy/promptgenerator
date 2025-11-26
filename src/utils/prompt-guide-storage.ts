// 프롬프트 가이드 저장 및 관리

import { PromptGuide, GuideCollection, ModelName } from '../types/prompt-guide.types'

const STORAGE_KEYS = {
  PROMPT_GUIDES: 'prompt_guides_collection',
  GUIDE_UPDATE_SCHEDULE: 'guide_update_schedule',
} as const

// 가이드 컬렉션 조회
export function getGuideCollection(): GuideCollection {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PROMPT_GUIDES)
    return data ? JSON.parse(data) : { guides: [], lastCollectionDate: 0, nextScheduledCollection: 0 }
  } catch (error) {
    console.error('가이드 컬렉션 조회 실패:', error)
    return { guides: [], lastCollectionDate: 0, nextScheduledCollection: 0 }
  }
}

// 가이드 컬렉션 저장
export function saveGuideCollection(collection: GuideCollection): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROMPT_GUIDES, JSON.stringify(collection))
  } catch (error) {
    console.error('가이드 컬렉션 저장 실패:', error)
  }
}

// 특정 모델의 최신 가이드 조회
export function getLatestGuide(modelName: ModelName): PromptGuide | null {
  const collection = getGuideCollection()
  const modelGuides = collection.guides
    .filter(g => g.modelName === modelName)
    .sort((a, b) => b.lastUpdated - a.lastUpdated)
  
  return modelGuides.length > 0 ? modelGuides[0] : null
}

// 모든 모델의 최신 가이드 조회
export function getAllLatestGuides(): Map<ModelName, PromptGuide> {
  const collection = getGuideCollection()
  const latestGuides = new Map<ModelName, PromptGuide>()
  
  collection.guides.forEach(guide => {
    const existing = latestGuides.get(guide.modelName)
    if (!existing || guide.lastUpdated > existing.lastUpdated) {
      latestGuides.set(guide.modelName, guide)
    }
  })
  
  return latestGuides
}

// 가이드 추가 또는 업데이트
export function upsertGuide(guide: PromptGuide): void {
  const collection = getGuideCollection()
  const existingIndex = collection.guides.findIndex(
    g => g.modelName === guide.modelName && g.version === guide.version
  )
  
  if (existingIndex >= 0) {
    collection.guides[existingIndex] = guide
  } else {
    collection.guides.push(guide)
  }
  
  collection.lastCollectionDate = Date.now()
  saveGuideCollection(collection)
}

// 여러 가이드 일괄 추가
export function upsertGuides(guides: PromptGuide[]): void {
  guides.forEach(guide => upsertGuide(guide))
}

// 다음 수집 일정 설정
export function setNextCollectionSchedule(timestamp: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.GUIDE_UPDATE_SCHEDULE, String(timestamp))
  } catch (error) {
    console.error('수집 일정 저장 실패:', error)
  }
}

// 다음 수집 일정 조회
export function getNextCollectionSchedule(): number {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.GUIDE_UPDATE_SCHEDULE)
    return data ? parseInt(data, 10) : 0
  } catch (error) {
    console.error('수집 일정 조회 실패:', error)
    return 0
  }
}

// 오래된 가이드 정리 (90일 이상 된 것)
export function cleanupOldGuides(daysToKeep: number = 90): void {
  const collection = getGuideCollection()
  const cutoffDate = Date.now() - daysToKeep * 24 * 60 * 60 * 1000
  
  collection.guides = collection.guides.filter(
    guide => guide.metadata.collectedAt > cutoffDate
  )
  
  saveGuideCollection(collection)
}

