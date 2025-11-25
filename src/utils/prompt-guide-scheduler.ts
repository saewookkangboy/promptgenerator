// 프롬프트 가이드 자동 수집 스케줄러

import { collectAllGuides } from './prompt-guide-collector'
import { GuideUpdateResult } from '../types/prompt-guide.types'
import { getNextCollectionSchedule, setNextCollectionSchedule, cleanupOldGuides } from './prompt-guide-storage'

const COLLECTION_INTERVAL_DAYS = 7 // 7일마다 수집
const CLEANUP_INTERVAL_DAYS = 90 // 90일 이상 된 가이드 정리

// 다음 수집 일정 계산
export function calculateNextCollectionDate(): number {
  return Date.now() + COLLECTION_INTERVAL_DAYS * 24 * 60 * 60 * 1000
}

// 스케줄러 초기화
export function initializeScheduler(): void {
  const nextSchedule = getNextCollectionSchedule()
  const now = Date.now()
  
  // 다음 수집 일정이 지났거나 없으면 즉시 수집
  if (nextSchedule === 0 || nextSchedule <= now) {
    scheduleCollection()
  } else {
    // 다음 수집 일정까지 대기
    const delay = nextSchedule - now
    setTimeout(() => {
      scheduleCollection()
    }, delay)
  }
  
  // 정기적인 체크 (매 시간)
  setInterval(() => {
    checkAndCollect()
  }, 60 * 60 * 1000) // 1시간마다 체크
}

// 수집 실행
async function scheduleCollection(): Promise<void> {
  try {
    console.log('프롬프트 가이드 수집 시작...')
    const results = await collectAllGuides()
    
    // 결과 로깅
    results.forEach(result => {
      if (result.success) {
        console.log(
          `✓ ${result.modelName}: ${result.guidesAdded}개 추가, ${result.guidesUpdated}개 업데이트`
        )
      } else {
        console.warn(`✗ ${result.modelName}: 수집 실패`, result.errors)
      }
    })
    
    // 다음 수집 일정 설정
    const nextDate = calculateNextCollectionDate()
    setNextCollectionSchedule(nextDate)
    
    // 오래된 가이드 정리
    cleanupOldGuides(CLEANUP_INTERVAL_DAYS)
    
    console.log(`다음 수집 일정: ${new Date(nextDate).toLocaleString()}`)
  } catch (error) {
    console.error('가이드 수집 중 오류:', error)
  }
}

// 수집 필요 여부 확인 및 실행
function checkAndCollect(): void {
  const nextSchedule = getNextCollectionSchedule()
  const now = Date.now()
  
  if (nextSchedule > 0 && nextSchedule <= now) {
    scheduleCollection()
  }
}

// 수동 수집 트리거 (Admin에서 사용)
export async function triggerManualCollection(): Promise<GuideUpdateResult[]> {
  return await collectAllGuides()
}

// 수집 상태 조회
export function getCollectionStatus(): {
  nextCollection: number
  daysUntilNext: number
  isOverdue: boolean
} {
  const nextCollection = getNextCollectionSchedule()
  const now = Date.now()
  const daysUntilNext = nextCollection > 0
    ? Math.ceil((nextCollection - now) / (24 * 60 * 60 * 1000))
    : 0
  
  return {
    nextCollection,
    daysUntilNext,
    isOverdue: nextCollection > 0 && nextCollection <= now,
  }
}

