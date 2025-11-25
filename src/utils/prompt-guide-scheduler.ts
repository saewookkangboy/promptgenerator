// 프롬프트 가이드 자동 수집 스케줄러 (클라이언트 사이드)

import { GuideUpdateResult } from '../types/prompt-guide.types'
import { getNextCollectionSchedule } from './prompt-guide-storage'

// 스케줄러 초기화 (클라이언트 사이드 - 서버 상태만 확인)
export function initializeScheduler(): void {
  // 클라이언트에서는 서버 스케줄러 상태만 확인
  // 실제 수집은 서버에서 자동으로 수행됨
  console.log('프롬프트 가이드 스케줄러 초기화 (서버 사이드에서 실행)')
  
  // 서버 상태 확인 (선택사항)
  checkServerStatus()
  
  // 정기적으로 서버 상태 확인 (1시간마다)
  setInterval(() => {
    checkServerStatus()
  }, 60 * 60 * 1000)
}

// 서버 상태 확인
async function checkServerStatus(): Promise<void> {
  try {
    const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001'
    const response = await fetch(`${API_BASE_URL}/api/guides/status`)
    
    if (response.ok) {
      const status = await response.json()
      console.log('서버 스케줄러 상태:', status)
    }
  } catch (error) {
    // 서버가 실행되지 않은 경우 무시
    console.log('서버 연결 불가 (서버가 실행되지 않았을 수 있음)')
  }
}

// 수동 수집 트리거 (Admin에서 사용)
export async function triggerManualCollection(): Promise<GuideUpdateResult[]> {
  const { collectAllGuides } = await import('./prompt-guide-collector')
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
