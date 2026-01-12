/**
 * 구조화된 로깅 시스템 (Pino 기반)
 * 
 * 이 모듈은 애플리케이션 전반에서 사용되는 로깅 시스템을 제공합니다.
 * 개발 환경에서는 pretty print를 사용하고, 프로덕션 환경에서는 파일 로깅을 사용합니다.
 * 
 * @module logger
 * @example
 * ```typescript
 * import { log } from './utils/logger'
 * 
 * log.info({ userId: '123' }, 'User logged in')
 * log.error({ error }, 'Failed to process request')
 * ```
 */
import pino from 'pino'
import path from 'path'
import fs from 'fs'

// 로그 디렉토리 설정
const LOG_DIR = path.resolve(__dirname, '..', '..', 'logs')
const ERROR_LOG_PATH = path.join(LOG_DIR, 'error.log')
const COMBINED_LOG_PATH = path.join(LOG_DIR, 'combined.log')

// 로그 디렉토리 생성
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

// 환경별 로그 레벨 설정
const getLogLevel = (): pino.Level => {
  const env = process.env.NODE_ENV || 'development'
  const level = process.env.LOG_LEVEL || (env === 'production' ? 'info' : 'debug')
  return level as pino.Level
}

// 개발 환경용 pretty print 설정
const isDevelopment = process.env.NODE_ENV === 'development'

// Pino 설정
const pinoConfig: pino.LoggerOptions = {
  level: getLogLevel(),
  
  // 개발 환경에서는 pretty print 사용
  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  }),

  // 프로덕션 환경에서는 파일 로깅
  ...(!isDevelopment && {
    transport: {
      targets: [
        // 에러 로그 (에러만)
        {
          target: 'pino/file',
          level: 'error',
          options: {
            destination: ERROR_LOG_PATH,
            mkdir: true,
          },
        },
        // 통합 로그 (모든 레벨)
        {
          target: 'pino/file',
          options: {
            destination: COMBINED_LOG_PATH,
            mkdir: true,
          },
        },
      ],
    },
  }),

  // 기본 메타데이터
  base: {
    env: process.env.NODE_ENV || 'development',
    pid: process.pid,
  },

  // 타임스탬프 형식
  timestamp: pino.stdTimeFunctions.isoTime,

  // 로그 포맷 (JSON) - transport.targets와 함께 사용할 수 없으므로 개발 환경에서만 사용
  ...(isDevelopment && {
    formatters: {
      level: (label) => {
        return { level: label }
      },
    },
  }),
}

// 로거 인스턴스 생성
const logger = pino(pinoConfig)

/**
 * 로그 레벨별 헬퍼 함수
 */
export const log = {
  /**
   * Debug 레벨 로그 (개발 환경에서만)
   */
  debug: (obj: object, msg?: string) => logger.debug(obj, msg),
  
  /**
   * Info 레벨 로그
   */
  info: (obj: object, msg?: string) => logger.info(obj, msg),
  
  /**
   * Warn 레벨 로그
   */
  warn: (obj: object, msg?: string) => logger.warn(obj, msg),
  
  /**
   * Error 레벨 로그
   */
  error: (obj: object, msg?: string) => logger.error(obj, msg),
  
  /**
   * Fatal 레벨 로그
   */
  fatal: (obj: object, msg?: string) => logger.fatal(obj, msg),
  
  /**
   * HTTP 요청 로그
   */
  http: (req: any, res: any, responseTime?: number) => {
    logger.info({
      type: 'http',
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: responseTime ? `${responseTime}ms` : undefined,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    }, 'HTTP Request')
  },
  
  /**
   * 데이터베이스 쿼리 로그
   */
  db: (query: string, duration?: number) => {
    logger.debug({
      type: 'database',
      query,
      duration: duration ? `${duration}ms` : undefined,
    }, 'Database Query')
  },
  
  /**
   * API 에러 로그
   */
  apiError: (error: Error, req: any, context?: object) => {
    logger.error({
      type: 'api_error',
      error: {
        name: error.name,
        message: error.message,
        stack: isDevelopment ? error.stack : undefined,
      },
      request: {
        method: req.method,
        url: req.url,
        ip: req.ip,
      },
      ...context,
    }, 'API Error')
  },

  /**
   * 보안 이벤트 로그 (로그인 실패, 권한 거부 등)
   */
  security: (event: string, details: object) => {
    logger.warn({
      type: 'security_event',
      event,
      ...details,
      timestamp: new Date().toISOString(),
    }, `Security Event: ${event}`)
  },
}

// 기본 로거도 export
export default logger

