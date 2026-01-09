/**
 * Sentry 에러 추적 시스템 설정
 * 
 * 이 모듈은 Sentry를 초기화하고 에러 추적을 위한 유틸리티를 제공합니다.
 * 
 * @module sentry
 * @example
 * ```typescript
 * import { initSentry, captureException } from './utils/sentry'
 * 
 * initSentry()
 * 
 * try {
 *   // ...
 * } catch (error) {
 *   captureException(error)
 * }
 * ```
 */

import * as Sentry from '@sentry/node'

/**
 * Sentry 초기화
 * 
 * 환경 변수:
 * - SENTRY_DSN: Sentry DSN (필수)
 * - SENTRY_ENVIRONMENT: 환경 (development, staging, production)
 * - SENTRY_TRACES_SAMPLE_RATE: 트레이스 샘플링 비율 (0.0 ~ 1.0)
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN
  const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development'
  const parsed = parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1')
  const tracesSampleRate = isNaN(parsed) || !Number.isFinite(parsed) || parsed < 0 || parsed > 1
    ? 0.1
    : parsed

  if (!dsn) {
    console.warn('⚠️  Sentry DSN이 설정되지 않았습니다. 에러 추적이 비활성화됩니다.')
    return
  }

  Sentry.init({
    dsn,
    environment,
    
    // 트레이싱 설정
    tracesSampleRate,
    
    // 릴리스 정보
    release: process.env.SENTRY_RELEASE || undefined,
    
    // 필터링할 에러
    ignoreErrors: [
      // 네트워크 에러
      'NetworkError',
      'Network request failed',
      // 브라우저 확장 프로그램 에러
      'ResizeObserver loop limit exceeded',
      // Chrome 확장 프로그램 에러
      'Non-Error promise rejection captured',
    ],
    
    // 필터링할 URL
    denyUrls: [
      // 브라우저 확장 프로그램
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
    ],
    
    // 민감한 데이터 필터링
    beforeSend(event, hint) {
      // 민감한 정보 제거
      if (event.request) {
        // 쿼리 파라미터에서 민감한 정보 제거
        if (event.request.query_string && typeof event.request.query_string === 'object') {
          const sensitiveParams = ['password', 'token', 'apiKey', 'secret']
          sensitiveParams.forEach(param => {
            if (event.request?.query_string && typeof event.request.query_string === 'object') {
              delete (event.request.query_string as Record<string, any>)[param]
            }
          })
        }
        
        // 헤더에서 민감한 정보 제거
        if (event.request.headers && typeof event.request.headers === 'object') {
          const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key']
          sensitiveHeaders.forEach(header => {
            if (event.request?.headers && typeof event.request.headers === 'object') {
              delete (event.request.headers as Record<string, any>)[header]
            }
          })
        }
      }
      
      return event
    },
  })

  console.log(`✅ Sentry 초기화 완료 (환경: ${environment})`)
}

/**
 * 예외 캡처
 * 
 * @param error - 캡처할 에러
 * @param context - 추가 컨텍스트 정보
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  if (context) {
    Sentry.withScope(scope => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value)
      })
      Sentry.captureException(error)
    })
  } else {
    Sentry.captureException(error)
  }
}

/**
 * 메시지 캡처
 * 
 * @param message - 캡처할 메시지
 * @param level - 로그 레벨 (fatal, error, warning, info, debug)
 * @param context - 추가 컨텍스트 정보
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
): void {
  if (context) {
    Sentry.withScope(scope => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value)
      })
      Sentry.captureMessage(message, level)
    })
  } else {
    Sentry.captureMessage(message, level)
  }
}

/**
 * 사용자 컨텍스트 설정
 * 
 * @param user - 사용자 정보
 */
export function setUser(user: { id: string; email?: string; username?: string }): void {
  Sentry.setUser(user)
}

/**
 * 태그 설정
 * 
 * @param tags - 태그 객체
 */
export function setTags(tags: Record<string, string>): void {
  Object.entries(tags).forEach(([key, value]) => {
    Sentry.setTag(key, value)
  })
}

/**
 * 컨텍스트 설정
 * 
 * @param name - 컨텍스트 이름
 * @param context - 컨텍스트 데이터
 */
export function setContext(name: string, context: Record<string, any>): void {
  Sentry.setContext(name, context)
}

/**
 * 코드를 Sentry span으로 감싸서 실행
 * 
 * @param name - Span 이름
 * @param op - 작업 유형
 * @param callback - 실행할 코드
 * @returns 콜백의 반환값
 */
export function withSpan<T>(
  name: string,
  op: string = 'custom',
  callback: () => T | Promise<T>
): T | Promise<T> {
  return Sentry.startSpan({ name, op }, callback)
}

/**
 * 비활성 span 시작 (트랜잭션 스타일 API)
 * 
 * @param name - Span 이름
 * @param op - 작업 유형
 * @returns Span 객체
 */
export function startInactiveSpan(name: string, op: string = 'custom') {
  return Sentry.startInactiveSpan({ name, op })
}

/**
 * @deprecated withSpan 또는 startInactiveSpan을 사용하세요
 */
export function startTransaction(
  name: string,
  op: string = 'custom'
): ReturnType<typeof startInactiveSpan> {
  return startInactiveSpan(name, op)
}

export default {
  initSentry,
  captureException,
  captureMessage,
  setUser,
  setTags,
  setContext,
  withSpan,
  startInactiveSpan,
  startTransaction,
}
