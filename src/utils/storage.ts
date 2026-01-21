// 로컬 스토리지 기반 데이터 저장 유틸리티

const STORAGE_KEYS = {
  ADMIN_AUTH: 'admin_auth',
  PROMPT_HISTORY: 'prompt_history',
  VISIT_COUNT: 'visit_count',
  DAILY_VISITS: 'daily_visits',
  STATS: 'prompt_stats',
  GUIDE_COLLECTION_HISTORY: 'guide_collection_history',
  PROMPT_FAVORITES: 'prompt_favorites',
  PROMPT_TAGS: 'prompt_tags',
  USER_PREFERENCES: 'user_preferences',
} as const

export interface PromptRecord {
  id: string
  timestamp: number
  category: 'text' | 'image' | 'video' | 'engineering'
  userInput: string
  model?: string
  // 새로운 필드들
  title?: string
  content?: string // 생성된 프롬프트 내용
  metaPrompt?: string
  contextPrompt?: string
  hashtags?: string[]
  isFavorite?: boolean
  tags?: string[]
  notes?: string
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

// 프롬프트 기록 저장 (재시도 로직 포함)
export function savePromptRecord(record: Omit<PromptRecord, 'id' | 'timestamp'>): void {
  const maxRetries = 3
  let retries = 0
  
  while (retries < maxRetries) {
    try {
      const records = getPromptRecordsInternal()
      const newRecord: PromptRecord = {
        ...record,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
      }
      records.unshift(newRecord) // 최신이 앞에 오도록
      // 최대 1000개까지만 저장
      const limitedRecords = records.slice(0, 1000)
      
      // localStorage 저장 시도
      localStorage.setItem(STORAGE_KEYS.PROMPT_HISTORY, JSON.stringify(limitedRecords))
      
      // 통계 업데이트
      updateStats(record.category)
      
      // 성공 시 즉시 반환
      return
    } catch (error: any) {
      retries++
      console.error(`프롬프트 기록 저장 실패 (시도 ${retries}/${maxRetries}):`, error)
      
      // QuotaExceededError인 경우 오래된 기록 삭제 후 재시도
      if (error.name === 'QuotaExceededError' && retries < maxRetries) {
        try {
          const records = getPromptRecordsInternal()
          // 가장 오래된 100개 삭제
          const trimmedRecords = records.slice(0, 900)
          localStorage.setItem(STORAGE_KEYS.PROMPT_HISTORY, JSON.stringify(trimmedRecords))
          // 재시도
          continue
        } catch (trimError) {
          console.error('기록 정리 실패:', trimError)
        }
      }
      
      // 마지막 시도 실패 시에도 계속 진행 (기록 손실 방지)
      if (retries >= maxRetries) {
        console.error('프롬프트 기록 저장 최종 실패 - 기록이 저장되지 않았습니다')
        // 메모리에 임시 저장 (세션 동안 유지)
        if (typeof window !== 'undefined') {
          (window as any).__promptRecordQueue = (window as any).__promptRecordQueue || []
          ;(window as any).__promptRecordQueue.push({
            ...record,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
          })
        }
      }
    }
  }
}

// 프롬프트 기록 조회 (내부용 - 재귀 방지)
function getPromptRecordsInternal(): PromptRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PROMPT_HISTORY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('프롬프트 기록 조회 실패:', error)
    return []
  }
}

// 프롬프트 기록 조회 (메모리 큐 포함)
export function getPromptRecords(): PromptRecord[] {
  try {
    const records = getPromptRecordsInternal()
    
    // 메모리 큐에 저장된 기록이 있으면 병합 시도
    if (typeof window !== 'undefined' && (window as any).__promptRecordQueue) {
      const queue = (window as any).__promptRecordQueue
      if (Array.isArray(queue) && queue.length > 0) {
        // 큐의 기록들을 다시 저장 시도
        const recordsToSave = [...records]
        const savedRecords: PromptRecord[] = []
        
        queue.forEach((record: PromptRecord) => {
          try {
            recordsToSave.unshift(record)
            const limitedRecords = recordsToSave.slice(0, 1000)
            localStorage.setItem(STORAGE_KEYS.PROMPT_HISTORY, JSON.stringify(limitedRecords))
            savedRecords.push(record)
          } catch (error) {
            // 저장 실패 시 큐에 유지
            console.log('큐 기록 저장 재시도 실패:', error)
          }
        })
        
        // 성공한 기록은 큐에서 제거
        savedRecords.forEach(saved => {
          const index = queue.indexOf(saved)
          if (index >= 0) {
            queue.splice(index, 1)
          }
        })
        
        // 큐가 비었으면 제거
        if (queue.length === 0) {
          delete (window as any).__promptRecordQueue
        }
        
        // 업데이트된 기록 반환
        return getPromptRecordsInternal()
      }
    }
    
    return records
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

// 가이드 수집 이력 타입
export interface GuideCollectionHistory {
  id: string
  timestamp: number
  success: boolean
  modelName: string
  guidesAdded: number
  guidesUpdated: number
  errors?: string[]
  appliedToService: boolean // 서비스에 적용되었는지 여부
  collectionType: 'manual' | 'scheduled' // 수동 수집 또는 자동 수집
}

// 가이드 수집 이력 저장
export function saveGuideCollectionHistory(history: Omit<GuideCollectionHistory, 'id' | 'timestamp'>): void {
  try {
    const histories = getGuideCollectionHistories()
    const newHistory: GuideCollectionHistory = {
      ...history,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
    }
    histories.unshift(newHistory) // 최신이 앞에 오도록
    // 최대 500개까지만 저장
    const limitedHistories = histories.slice(0, 500)
    localStorage.setItem(STORAGE_KEYS.GUIDE_COLLECTION_HISTORY, JSON.stringify(limitedHistories))
  } catch (error) {
    console.error('가이드 수집 이력 저장 실패:', error)
  }
}

// 가이드 수집 이력 조회
export function getGuideCollectionHistories(): GuideCollectionHistory[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.GUIDE_COLLECTION_HISTORY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('가이드 수집 이력 조회 실패:', error)
    return []
  }
}

// 가이드 수집 이력 업데이트 (서비스 적용 여부 등)
export function updateGuideCollectionHistory(
  id: string,
  updates: Partial<Pick<GuideCollectionHistory, 'appliedToService'>>
): void {
  try {
    const histories = getGuideCollectionHistories()
    const index = histories.findIndex(h => h.id === id)
    if (index >= 0) {
      histories[index] = { ...histories[index], ...updates }
      localStorage.setItem(STORAGE_KEYS.GUIDE_COLLECTION_HISTORY, JSON.stringify(histories))
    }
  } catch (error) {
    console.error('가이드 수집 이력 업데이트 실패:', error)
  }
}

// 즐겨찾기 관리
export function toggleFavorite(promptId: string): boolean {
  try {
    const favorites = getFavorites()
    const index = favorites.indexOf(promptId)
    
    if (index >= 0) {
      favorites.splice(index, 1)
    } else {
      favorites.push(promptId)
    }
    
    localStorage.setItem(STORAGE_KEYS.PROMPT_FAVORITES, JSON.stringify(favorites))
    
    // 프롬프트 기록도 업데이트
    const records = getPromptRecordsInternal()
    const recordIndex = records.findIndex(r => r.id === promptId)
    if (recordIndex >= 0) {
      records[recordIndex].isFavorite = index < 0
      localStorage.setItem(STORAGE_KEYS.PROMPT_HISTORY, JSON.stringify(records))
    }
    
    return index < 0 // true면 즐겨찾기 추가됨
  } catch (error) {
    console.error('즐겨찾기 토글 실패:', error)
    return false
  }
}

export function getFavorites(): string[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PROMPT_FAVORITES)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('즐겨찾기 조회 실패:', error)
    return []
  }
}

export function isFavorite(promptId: string): boolean {
  return getFavorites().includes(promptId)
}

// 태그 관리
export function getAllTags(): string[] {
  try {
    const records = getPromptRecordsInternal()
    const tagSet = new Set<string>()
    
    records.forEach(record => {
      if (record.tags && Array.isArray(record.tags)) {
        record.tags.forEach(tag => tagSet.add(tag))
      }
    })
    
    return Array.from(tagSet).sort()
  } catch (error) {
    console.error('태그 조회 실패:', error)
    return []
  }
}

export function addTagsToPrompt(promptId: string, tags: string[]): void {
  try {
    const records = getPromptRecordsInternal()
    const recordIndex = records.findIndex(r => r.id === promptId)
    
    if (recordIndex >= 0) {
      const existingTags = records[recordIndex].tags || []
      const newTags = [...new Set([...existingTags, ...tags])]
      records[recordIndex].tags = newTags
      localStorage.setItem(STORAGE_KEYS.PROMPT_HISTORY, JSON.stringify(records))
    }
  } catch (error) {
    console.error('태그 추가 실패:', error)
  }
}

export function removeTagFromPrompt(promptId: string, tag: string): void {
  try {
    const records = getPromptRecordsInternal()
    const recordIndex = records.findIndex(r => r.id === promptId)
    
    if (recordIndex >= 0) {
      const existingTags = records[recordIndex].tags || []
      records[recordIndex].tags = existingTags.filter(t => t !== tag)
      localStorage.setItem(STORAGE_KEYS.PROMPT_HISTORY, JSON.stringify(records))
    }
  } catch (error) {
    console.error('태그 제거 실패:', error)
  }
}

export function updatePromptRecord(
  promptId: string,
  updates: Partial<Pick<PromptRecord, 'title' | 'notes' | 'tags' | 'isFavorite'>>
): void {
  try {
    const records = getPromptRecordsInternal()
    const recordIndex = records.findIndex(r => r.id === promptId)
    
    if (recordIndex >= 0) {
      records[recordIndex] = { ...records[recordIndex], ...updates }
      localStorage.setItem(STORAGE_KEYS.PROMPT_HISTORY, JSON.stringify(records))
      
      // 즐겨찾기도 업데이트
      if (updates.isFavorite !== undefined) {
        const favorites = getFavorites()
        if (updates.isFavorite) {
          if (!favorites.includes(promptId)) {
            favorites.push(promptId)
            localStorage.setItem(STORAGE_KEYS.PROMPT_FAVORITES, JSON.stringify(favorites))
          }
        } else {
          const index = favorites.indexOf(promptId)
          if (index >= 0) {
            favorites.splice(index, 1)
            localStorage.setItem(STORAGE_KEYS.PROMPT_FAVORITES, JSON.stringify(favorites))
          }
        }
      }
    }
  } catch (error) {
    console.error('프롬프트 기록 업데이트 실패:', error)
  }
}

// 검색 기능
export function searchPromptRecords(query: string, filters?: {
  category?: PromptRecord['category']
  tags?: string[]
  favoritesOnly?: boolean
  dateFrom?: number
  dateTo?: number
}): PromptRecord[] {
  try {
    let records = getPromptRecords()
    
    // 카테고리 필터
    if (filters?.category) {
      records = records.filter(r => r.category === filters.category)
    }
    
    // 태그 필터
    if (filters?.tags && filters.tags.length > 0) {
      records = records.filter(r => {
        const recordTags = r.tags || []
        return filters.tags!.some(tag => recordTags.includes(tag))
      })
    }
    
    // 즐겨찾기만
    if (filters?.favoritesOnly) {
      const favorites = getFavorites()
      records = records.filter(r => favorites.includes(r.id))
    }
    
    // 날짜 필터
    if (filters?.dateFrom) {
      records = records.filter(r => r.timestamp >= filters.dateFrom!)
    }
    if (filters?.dateTo) {
      records = records.filter(r => r.timestamp <= filters.dateTo!)
    }
    
    // 검색어 필터
    if (query.trim()) {
      const lowerQuery = query.toLowerCase()
      records = records.filter(r => {
        const searchableText = [
          r.userInput,
          r.title,
          r.content,
          r.metaPrompt,
          r.contextPrompt,
          ...(r.tags || []),
          r.notes,
        ].filter(Boolean).join(' ').toLowerCase()
        
        return searchableText.includes(lowerQuery)
      })
    }
    
    return records
  } catch (error) {
    console.error('프롬프트 검색 실패:', error)
    return []
  }
}

// 사용자 선호도 저장
export interface UserPreferences {
  preferredContentTypes?: string[]
  preferredToneStyles?: string[]
  defaultOptions?: Partial<PromptRecord['options']>
  theme?: 'light' | 'dark'
  language?: string
}

export function getUserPreferences(): UserPreferences {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES)
    return data ? JSON.parse(data) : {}
  } catch (error) {
    console.error('사용자 선호도 조회 실패:', error)
    return {}
  }
}

export function updateUserPreferences(updates: Partial<UserPreferences>): void {
  try {
    const current = getUserPreferences()
    const updated = { ...current, ...updates }
    localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(updated))
  } catch (error) {
    console.error('사용자 선호도 업데이트 실패:', error)
  }
}

