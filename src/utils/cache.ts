// 캐싱 유틸리티

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiry: number
}

/**
 * 메모리 기반 캐시
 */
class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private maxSize: number = 100

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    // 캐시 크기 제한
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl,
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // 만료 확인
    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // 만료된 항목 정리
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key)
      }
    }
  }
}

// 전역 캐시 인스턴스
const memoryCache = new MemoryCache()

// 주기적으로 만료된 항목 정리 (5분마다)
if (typeof window !== 'undefined') {
  setInterval(() => {
    memoryCache.cleanup()
  }, 5 * 60 * 1000)
}

/**
 * API 응답 캐싱
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 5 * 60 * 1000
): Promise<T> {
  // 캐시 확인
  const cached = memoryCache.get<T>(key)
  if (cached !== null) {
    return cached
  }

  // 캐시 미스 - 데이터 가져오기
  const data = await fetcher()
  
  // 캐시 저장
  memoryCache.set(key, data, ttl)
  
  return data
}

/**
 * localStorage 기반 영구 캐시 (선택적)
 */
export function setPersistentCache<T>(key: string, data: T, ttl: number = 24 * 60 * 60 * 1000): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl,
    }
    localStorage.setItem(`cache_${key}`, JSON.stringify(entry))
  } catch (error) {
    console.warn('캐시 저장 실패:', error)
  }
}

export function getPersistentCache<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(`cache_${key}`)
    if (!cached) return null

    const entry: CacheEntry<T> = JSON.parse(cached)
    
    // 만료 확인
    if (Date.now() > entry.expiry) {
      localStorage.removeItem(`cache_${key}`)
      return null
    }

    return entry.data
  } catch (error) {
    console.warn('캐시 조회 실패:', error)
    return null
  }
}

/**
 * 이미지 프리로딩
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = reject
    img.src = src
  })
}

/**
 * 리소스 프리페칭
 */
export function prefetchResource(url: string, type: 'script' | 'style' | 'fetch' = 'fetch'): void {
  if (type === 'script') {
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.as = 'script'
    link.href = url
    document.head.appendChild(link)
  } else if (type === 'style') {
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.as = 'style'
    link.href = url
    document.head.appendChild(link)
  } else {
    // fetch API 사용
    fetch(url, { method: 'GET', mode: 'no-cors' }).catch(() => {
      // 프리페치 실패는 무시
    })
  }
}

export { memoryCache }
