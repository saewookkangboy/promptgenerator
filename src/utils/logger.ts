/**
 * 구조화된 로깅 유틸리티
 */

const isDevelopment = import.meta.env.DEV

/**
 * 로그 레벨
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * 로거 인터페이스
 */
interface Logger {
  debug: (...args: any[]) => void
  info: (...args: any[]) => void
  warn: (...args: any[]) => void
  error: (...args: any[]) => void
}

/**
 * 로그 포맷터
 */
function formatLog(level: LogLevel, ...args: any[]): string {
  const timestamp = new Date().toISOString()
  return `[${timestamp}] [${level}] ${args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ')}`
}

/**
 * 프로덕션 환경에서 에러 리포팅
 */
function reportError(_error: Error, _context?: Record<string, any>) {
  if (!isDevelopment) {
    // TODO: 실제 에러 리포팅 서비스 연동 (예: Sentry, LogRocket 등)
    // 예시:
    // errorReportingService.captureException(error, { extra: context })
  }
}

/**
 * 로거 구현
 */
export const logger: Logger = {
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.log(formatLog(LogLevel.DEBUG, ...args))
    }
  },
  
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(formatLog(LogLevel.INFO, ...args))
    }
  },
  
  warn: (...args: any[]) => {
    console.warn(formatLog(LogLevel.WARN, ...args))
  },
  
  error: (...args: any[]) => {
    const errorMessage = formatLog(LogLevel.ERROR, ...args)
    console.error(errorMessage)
    
    // Error 객체가 있으면 리포팅
    const errorArg = args.find(arg => arg instanceof Error)
    if (errorArg) {
      reportError(errorArg as Error, {
        additionalArgs: args.filter(arg => !(arg instanceof Error)),
      })
    }
  },
}

/**
 * 성능 측정 헬퍼
 */
export function measurePerformance(label: string) {
  const startTime = performance.now()
  
  return {
    end: () => {
      const duration = performance.now() - startTime
      logger.debug(`[Performance] ${label}: ${duration.toFixed(2)}ms`)
      return duration
    },
  }
}
