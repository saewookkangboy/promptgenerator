/**
 * Sentry 에러 추적 시스템 설정 (프론트엔드)
 * 
 * 이 모듈은 프론트엔드에서 Sentry를 초기화하고 에러 추적을 제공합니다.
 * 
 * @module sentry
 */

import * as Sentry from '@sentry/react'

/**
 * Sentry 초기화
 * 
 * 환경 변수:
 * - VITE_SENTRY_DSN: Sentry DSN (필수)
 * - VITE_SENTRY_ENVIRONMENT: 환경 (development, staging, production)
 * - VITE_SENTRY_TRACES_SAMPLE_RATE: 트레이스 샘플링 비율 (0.0 ~ 1.0)
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || 'development'
  const parsed = parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.1')
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
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    
    // 필터링할 에러
    ignoreErrors: [
      // 네트워크 에러
      'NetworkError',
      'Network request failed',
      // 브라우저 확장 프로그램 에러
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      // Chrome 확장 프로그램 에러
      'Chrome extension error',
    ],
    
    // 필터링할 URL
    denyUrls: [
      // 브라우저 확장 프로그램
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
    ],
    
    // Web Vitals 통합
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // 민감한 데이터 필터링
    beforeSend(event, _hint) {
      // 민감한 정보 제거
      if (event.request) {
        // 쿼리 파라미터에서 민감한 정보 제거
        if (event.request.query_string) {
          const sensitiveParams = ['password', 'token', 'apiKey', 'secret']
          const queryString = event.request.query_string as Record<string, any>
          sensitiveParams.forEach(param => {
            if (queryString && param in queryString) {
              delete queryString[param]
            }
          })
        }
        
        // 헤더에서 민감한 정보 제거
        if (event.request.headers) {
          const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key']
          sensitiveHeaders.forEach(header => {
            if (event.request?.headers) {
              delete event.request.headers[header]
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

export default {
  initSentry,
  captureException,
  captureMessage,
  setUser,
}
