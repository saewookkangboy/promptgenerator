// 로컬 스토리지 기반 데이터 저장 유틸리티

const STORAGE_KEYS = {
  ADMIN_AUTH: 'admin_auth',
  PROMPT_HISTORY: 'prompt_history',
  VISIT_COUNT: 'visit_count',
  DAILY_VISITS: 'daily_visits',
  STATS: 'prompt_stats',
} as const

export interface PromptRecord {
  id: string
  timestamp: number
  category: 'text' | 'image' | 'video' | 'engineering'
  userInput: string
  model?: string
  options?: {
    // Text options
    contentType?: string
    age?: string
    gender?: string
    occupation?: string
    conversational?: boolean
    // Image options
    artStyle?: string
    framing?: string
    lighting?: string
    colorMood?: string
    aspectRatio?: string
    quality?: number
    negativePrompt?: string[]
    // Video options
    genre?: string
    mood?: string
    totalDuration?: number
    fps?: number
    resolution?: string
    sceneCount?: number
    hasReferenceImage?: boolean
    // Engineering options
    method?: string
    [key: string]: any
  }
}

export interface PromptStats {
  text: number
  image: number
  video: number
  engineering: number
  total: number
}

// 프롬프트 기록 저장
export function savePromptRecord(record: Omit<PromptRecord, 'id' | 'timestamp'>): void {
  try {
    const records = getPromptRecords()
    const newRecord: PromptRecord = {
      ...record,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
    }
    records.unshift(newRecord) // 최신이 앞에 오도록
    // 최대 1000개까지만 저장
    const limitedRecords = records.slice(0, 1000)
    localStorage.setItem(STORAGE_KEYS.PROMPT_HISTORY, JSON.stringify(limitedRecords))
    
    // 통계 업데이트
    updateStats(record.category)
  } catch (error) {
    console.error('프롬프트 기록 저장 실패:', error)
  }
}

// 프롬프트 기록 조회
export function getPromptRecords(): PromptRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PROMPT_HISTORY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('프롬프트 기록 조회 실패:', error)
    return []
  }
}

// 통계 업데이트
function updateStats(category: PromptRecord['category']): void {
  try {
    const stats = getStats()
    stats[category]++
    stats.total++
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats))
  } catch (error) {
    console.error('통계 업데이트 실패:', error)
  }
}

// 통계 조회
export function getStats(): PromptStats {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.STATS)
    return data ? JSON.parse(data) : { text: 0, image: 0, video: 0, engineering: 0, total: 0 }
  } catch (error) {
    console.error('통계 조회 실패:', error)
    return { text: 0, image: 0, video: 0, engineering: 0, total: 0 }
  }
}

// 방문수 증가
export function incrementVisitCount(): void {
  try {
    const count = getVisitCount()
    localStorage.setItem(STORAGE_KEYS.VISIT_COUNT, String(count + 1))
    
    // 일별 방문수 증가
    incrementDailyVisit()
  } catch (error) {
    console.error('방문수 증가 실패:', error)
  }
}

// 일별 방문수 증가
function incrementDailyVisit(): void {
  try {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD 형식
    const dailyVisits = getDailyVisits()
    
    if (dailyVisits[today]) {
      dailyVisits[today]++
    } else {
      dailyVisits[today] = 1
    }
    
    localStorage.setItem(STORAGE_KEYS.DAILY_VISITS, JSON.stringify(dailyVisits))
  } catch (error) {
    console.error('일별 방문수 증가 실패:', error)
  }
}

// 일별 방문수 조회
export function getDailyVisits(): { [date: string]: number } {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.DAILY_VISITS)
    return data ? JSON.parse(data) : {}
  } catch (error) {
    console.error('일별 방문수 조회 실패:', error)
    return {}
  }
}

// 일별 방문수 배열로 조회 (최근 N일)
export function getDailyVisitsArray(days: number = 30): Array<{ date: string; count: number }> {
  try {
    const dailyVisits = getDailyVisits()
    const dates = Object.keys(dailyVisits).sort()
    const recentDates = dates.slice(-days)
    
    return recentDates.map(date => ({
      date,
      count: dailyVisits[date],
    }))
  } catch (error) {
    console.error('일별 방문수 배열 조회 실패:', error)
    return []
  }
}

// 방문수 조회
export function getVisitCount(): number {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.VISIT_COUNT)
    return data ? parseInt(data, 10) : 0
  } catch (error) {
    console.error('방문수 조회 실패:', error)
    return 0
  }
}

// Admin 인증 저장
export function setAdminAuth(isAuthenticated: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, String(isAuthenticated))
  } catch (error) {
    console.error('인증 상태 저장 실패:', error)
  }
}

// Admin 인증 확인
export function getAdminAuth(): boolean {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ADMIN_AUTH)
    return data === 'true'
  } catch (error) {
    console.error('인증 상태 조회 실패:', error)
    return false
  }
}

// Admin 로그아웃
export function clearAdminAuth(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH)
  } catch (error) {
    console.error('인증 상태 삭제 실패:', error)
  }
}

