/**
 * 성능 모니터링 유틸리티
 * 
 * 이 모듈은 API 응답 시간, 데이터베이스 쿼리 성능 등을 추적합니다.
 * 
 * @module performance
 * @example
 * ```typescript
 * import { trackResponseTime, trackDBQuery } from './utils/performance'
 * 
 * const startTime = Date.now()
 * // ... 작업 수행
 * trackResponseTime('/api/prompts', 'GET', Date.now() - startTime)
 * ```
 */

import { log } from './logger'

/**
 * API 응답 시간 추적
 * 
 * @param endpoint - API 엔드포인트
 * @param method - HTTP 메서드
 * @param duration - 응답 시간 (밀리초)
 * @param statusCode - HTTP 상태 코드
 */
export function trackResponseTime(
  endpoint: string,
  method: string,
  duration: number,
  statusCode?: number
): void {
  const threshold = 1000 // 1초 이상이면 경고

  const logData = {
    type: 'performance',
    metric: 'api_response_time',
    endpoint,
    method,
    duration: `${duration}ms`,
    statusCode,
  }

  if (duration > threshold) {
    log.warn(logData, `Slow API response: ${endpoint} took ${duration}ms`)
  } else {
    log.info(logData, `API response time: ${endpoint}`)
  }

  // TODO: 외부 모니터링 서비스로 전송 (예: Datadog, New Relic)
}

/**
 * 데이터베이스 쿼리 성능 추적
 * 
 * @param query - 쿼리 이름 또는 SQL
 * @param duration - 쿼리 실행 시간 (밀리초)
 * @param model - Prisma 모델 이름 (선택사항)
 */
export function trackDBQuery(
  query: string,
  duration: number,
  model?: string
): void {
  const threshold = 500 // 500ms 이상이면 경고

  const logData = {
    type: 'performance',
    metric: 'db_query_time',
    query: query.substring(0, 100), // 긴 쿼리는 잘라서 로깅
    model,
    duration: `${duration}ms`,
  }

  if (duration > threshold) {
    log.warn(logData, `Slow database query: ${query.substring(0, 50)}... took ${duration}ms`)
  } else {
    log.debug(logData, `Database query executed`)
  }

  // TODO: 외부 모니터링 서비스로 전송
}

/**
 * 메모리 사용량 추적
 */
export function trackMemoryUsage(): void {
  const usage = process.memoryUsage()
  const mb = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100

  log.info({
    type: 'performance',
    metric: 'memory_usage',
    heapUsed: `${mb(usage.heapUsed)}MB`,
    heapTotal: `${mb(usage.heapTotal)}MB`,
    external: `${mb(usage.external)}MB`,
    rss: `${mb(usage.rss)}MB`,
  }, 'Memory usage')
}

/**
 * CPU 사용률 추적 (간단한 버전)
 * 
 * @param duration - 측정 기간 (밀리초)
 */
export async function trackCPUUsage(duration: number = 1000): Promise<void> {
  const startUsage = process.cpuUsage()
  
  return new Promise((resolve) => {
    setTimeout(() => {
      const currentUsage = process.cpuUsage(startUsage)
      const totalMicroseconds = currentUsage.user + currentUsage.system
      const percentage = (totalMicroseconds / (duration * 1000)) * 100

      log.info({
        type: 'performance',
        metric: 'cpu_usage',
        user: `${(currentUsage.user / 1000).toFixed(2)}ms`,
        system: `${(currentUsage.system / 1000).toFixed(2)}ms`,
        percentage: `${percentage.toFixed(2)}%`,
      }, 'CPU usage')

      resolve()
    }, duration)
  })
}

/**
 * 성능 메트릭 수집기
 */
export class PerformanceCollector {
  private metrics: Map<string, number[]> = new Map()

  /**
   * 메트릭 기록
   * 
   * @param name - 메트릭 이름
   * @param value - 메트릭 값
   */
  record(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    this.metrics.get(name)!.push(value)
  }

  /**
   * 메트릭 통계 계산
   * 
   * @param name - 메트릭 이름
   * @returns 통계 정보 (평균, 최소, 최대, 중앙값)
   */
  getStats(name: string): {
    count: number
    avg: number
    min: number
    max: number
    median: number
  } | null {
    const values = this.metrics.get(name)
    if (!values || values.length === 0) {
      return null
    }

    const sorted = [...values].sort((a, b) => a - b)
    const sum = values.reduce((a, b) => a + b, 0)
    const avg = sum / values.length
    const min = sorted[0]
    const max = sorted[sorted.length - 1]
    
    // 중앙값 계산: 짝수 길이 배열인 경우 두 중앙값의 평균
    const mid = Math.floor(sorted.length / 2)
    const median = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid]

    return {
      count: values.length,
      avg: Math.round(avg * 100) / 100,
      min,
      max,
      median: Math.round(median * 100) / 100,
    }
  }

  /**
   * 모든 메트릭 통계 반환
   */
  getAllStats(): Record<string, ReturnType<typeof this.getStats>> {
    const stats: Record<string, ReturnType<typeof this.getStats>> = {}
    this.metrics.forEach((_, name) => {
      stats[name] = this.getStats(name)
    })
    return stats
  }

  /**
   * 메트릭 초기화
   */
  reset(): void {
    this.metrics.clear()
  }
}

// 전역 성능 수집기 인스턴스
export const performanceCollector = new PerformanceCollector()

// 주기적으로 성능 메트릭 로깅 (프로덕션에서만)
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    trackMemoryUsage()
    const stats = performanceCollector.getAllStats()
    if (Object.keys(stats).length > 0) {
      log.info({
        type: 'performance',
        metric: 'aggregated_stats',
        stats,
      }, 'Performance metrics summary')
    }
  }, 5 * 60 * 1000) // 5분마다
}
