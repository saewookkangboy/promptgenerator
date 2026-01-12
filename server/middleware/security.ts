/**
 * 보안 미들웨어 모음
 * 
 * 요청 크기 제한, IP 필터링, 보안 헤더 추가 등의 보안 기능을 제공합니다.
 */

import { Request, Response, NextFunction } from 'express'
import { log } from '../utils/logger'
import rateLimit from 'express-rate-limit'

/**
 * IP 주소 추출 (프록시 환경 고려)
 */
export function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    req.ip ||
    'unknown'
  )
}

/**
 * IP 화이트리스트/블랙리스트 관리
 */
class IPFilter {
  private whitelist: Set<string> = new Set()
  private blacklist: Set<string> = new Set()
  private suspiciousIPs: Map<string, { count: number; lastAttempt: number }> = new Map()

  constructor() {
    // 환경 변수에서 화이트리스트/블랙리스트 로드
    if (process.env.IP_WHITELIST) {
      process.env.IP_WHITELIST.split(',').forEach(ip => {
        this.whitelist.add(ip.trim())
      })
    }

    if (process.env.IP_BLACKLIST) {
      process.env.IP_BLACKLIST.split(',').forEach(ip => {
        this.blacklist.add(ip.trim())
      })
    }
  }

  isWhitelisted(ip: string): boolean {
    return this.whitelist.has(ip)
  }

  isBlacklisted(ip: string): boolean {
    return this.blacklist.has(ip)
  }

  addToBlacklist(ip: string, reason: string) {
    this.blacklist.add(ip)
    log.security('ip_blacklisted', { ip, reason, timestamp: new Date().toISOString() })
  }

  recordSuspiciousActivity(ip: string) {
    const existing = this.suspiciousIPs.get(ip) || { count: 0, lastAttempt: 0 }
    this.suspiciousIPs.set(ip, {
      count: existing.count + 1,
      lastAttempt: Date.now(),
    })

    // 의심스러운 활동이 10회 이상이면 블랙리스트에 추가
    if (existing.count + 1 >= 10) {
      this.addToBlacklist(ip, 'suspicious_activity_threshold')
    }
  }

  getSuspiciousCount(ip: string): number {
    return this.suspiciousIPs.get(ip)?.count || 0
  }
}

const ipFilter = new IPFilter()

/**
 * IP 필터링 미들웨어
 */
export function ipFilterMiddleware(req: Request, res: Response, next: NextFunction) {
  const clientIp = getClientIp(req)

  // 블랙리스트 확인
  if (ipFilter.isBlacklisted(clientIp)) {
    log.security('ip_blocked', {
      ip: clientIp,
      path: req.path,
      method: req.method,
      userAgent: req.get('user-agent'),
    })
    return res.status(403).json({
      success: false,
      error: {
        code: 'IP_BLOCKED',
        message: '접근이 차단된 IP 주소입니다',
      },
    })
  }

  // 화이트리스트 모드인 경우 (환경 변수로 활성화)
  if (process.env.ENABLE_IP_WHITELIST === 'true' && !ipFilter.isWhitelisted(clientIp)) {
    log.security('ip_not_whitelisted', {
      ip: clientIp,
      path: req.path,
      method: req.method,
    })
    return res.status(403).json({
      success: false,
      error: {
        code: 'IP_NOT_WHITELISTED',
        message: '허용되지 않은 IP 주소입니다',
      },
    })
  }

  next()
}

/**
 * 요청 크기 제한 미들웨어
 */
export function requestSizeLimiter(maxSize: number = 10 * 1024 * 1024) { // 기본 10MB
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10)

    if (contentLength > maxSize) {
      log.security('request_too_large', {
        ip: getClientIp(req),
        contentLength,
        maxSize,
        path: req.path,
      })
      return res.status(413).json({
        success: false,
        error: {
          code: 'REQUEST_TOO_LARGE',
          message: `요청 크기가 너무 큽니다. 최대 ${Math.round(maxSize / 1024 / 1024)}MB까지 허용됩니다`,
        },
      })
    }

    next()
  }
}

/**
 * 보안 헤더 추가 미들웨어
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // X-Content-Type-Options: MIME 타입 스니핑 방지
  res.setHeader('X-Content-Type-Options', 'nosniff')

  // X-Frame-Options: 클릭재킹 방지
  res.setHeader('X-Frame-Options', 'DENY')

  // X-XSS-Protection: XSS 필터 활성화 (구형 브라우저용)
  res.setHeader('X-XSS-Protection', '1; mode=block')

  // Referrer-Policy: 리퍼러 정보 제어
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions-Policy: 브라우저 기능 제어
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  )

  // X-Request-ID: 요청 추적용 고유 ID
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  res.setHeader('X-Request-ID', requestId)
  ;(req as any).requestId = requestId

  next()
}

/**
 * SQL Injection 패턴 감지
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/i,
  /(--|\#|\/\*|\*\/|;|'|"|`)/,
  /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
  /(\b(OR|AND)\s+['"]\w+['"]\s*=\s*['"]\w+['"])/i,
  /(\bUNION\s+SELECT\b)/i,
  /(\bDROP\s+TABLE\b)/i,
  /(\bEXEC\s*\()/i,
  /(\bxp_\w+)/i,
]

/**
 * NoSQL Injection 패턴 감지
 */
const NOSQL_INJECTION_PATTERNS = [
  /\$where/i,
  /\$ne/i,
  /\$gt/i,
  /\$lt/i,
  /\$gte/i,
  /\$lte/i,
  /\$regex/i,
  /\$in/i,
  /\$nin/i,
  /\$exists/i,
  /\$or/i,
  /\$and/i,
  /\$not/i,
  /\$nor/i,
  /\$mod/i,
  /\$size/i,
  /\$type/i,
  /\$all/i,
  /\$elemMatch/i,
]

/**
 * XSS 패턴 감지
 */
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<img[^>]*src[^>]*=.*?javascript:/gi,
  /<svg[^>]*onload/gi,
  /<body[^>]*onload/gi,
  /<input[^>]*onfocus/gi,
]

/**
 * 입력 검증 및 Injection 방지 미들웨어
 */
export function injectionPreventionMiddleware(req: Request, res: Response, next: NextFunction) {
  const checkValue = (value: any, path: string = ''): boolean => {
    if (value === null || value === undefined) {
      return true
    }

    if (typeof value === 'string') {
      const combinedPatterns = [
        ...SQL_INJECTION_PATTERNS,
        ...NOSQL_INJECTION_PATTERNS,
        ...XSS_PATTERNS,
      ]

      for (const pattern of combinedPatterns) {
        if (pattern.test(value)) {
          log.security('injection_attempt', {
            ip: getClientIp(req),
            path: req.path,
            field: path,
            pattern: pattern.toString(),
            value: value.substring(0, 100), // 처음 100자만 로깅
            userAgent: req.get('user-agent'),
          })
          return false
        }
      }
    } else if (typeof value === 'object') {
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          if (!checkValue(value[i], `${path}[${i}]`)) {
            return false
          }
        }
      } else {
        for (const key in value) {
          if (!checkValue(value[key], path ? `${path}.${key}` : key)) {
            return false
          }
        }
      }
    }

    return true
  }

  // 요청 본문 검증
  if (req.body && Object.keys(req.body).length > 0) {
    if (!checkValue(req.body)) {
      const clientIp = getClientIp(req)
      ipFilter.recordSuspiciousActivity(clientIp)
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: '입력 데이터에 유효하지 않은 문자가 포함되어 있습니다',
        },
      })
    }
  }

  // 쿼리 파라미터 검증
  if (req.query && Object.keys(req.query).length > 0) {
    if (!checkValue(req.query)) {
      const clientIp = getClientIp(req)
      ipFilter.recordSuspiciousActivity(clientIp)
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUERY',
          message: '쿼리 파라미터에 유효하지 않은 문자가 포함되어 있습니다',
        },
      })
    }
  }

  next()
}

/**
 * API 버전 검증 미들웨어
 */
export function apiVersionMiddleware(req: Request, res: Response, next: NextFunction) {
  const apiVersion = req.headers['api-version'] || req.headers['x-api-version']
  const supportedVersions = ['v1', 'v2']

  if (apiVersion && !supportedVersions.includes(apiVersion as string)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'UNSUPPORTED_API_VERSION',
        message: `지원되지 않는 API 버전입니다. 지원 버전: ${supportedVersions.join(', ')}`,
        supportedVersions,
      },
    })
  }

  // API 버전을 요청 객체에 저장
  ;(req as any).apiVersion = apiVersion || 'v1'

  next()
}

/**
 * 요청 타임아웃 미들웨어
 */
export function requestTimeoutMiddleware(timeoutMs: number = 30000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        log.warn({
          type: 'request_timeout',
          ip: getClientIp(req),
          path: req.path,
          method: req.method,
          timeout: timeoutMs,
        }, 'Request timeout')
        res.status(408).json({
          success: false,
          error: {
            code: 'REQUEST_TIMEOUT',
            message: '요청 시간이 초과되었습니다',
          },
        })
      }
    }, timeoutMs)

    // 응답 완료 시 타임아웃 제거
    res.on('finish', () => {
      clearTimeout(timeout)
    })

    next()
  }
}

/**
 * 의심스러운 요청 패턴 감지
 */
export function suspiciousActivityDetection(req: Request, res: Response, next: NextFunction) {
  const clientIp = getClientIp(req)
  const userAgent = req.get('user-agent') || ''

  // 의심스러운 패턴들
  const suspiciousPatterns = [
    // User-Agent가 없는 경우
    !userAgent,
    // 매우 짧은 User-Agent
    userAgent.length < 10,
    // 알려진 봇/스캐너 User-Agent
    /bot|crawler|spider|scraper|curl|wget|python|java|go-http/i.test(userAgent),
    // 비정상적인 경로 패턴
    /\.\.\/|\.\.\\|%2e%2e|%2f|%5c/i.test(req.path),
    // 비정상적인 쿼리 파라미터
    Object.keys(req.query).length > 50,
    // 비정상적으로 긴 경로
    req.path.length > 500,
  ]

  const suspiciousCount = suspiciousPatterns.filter(Boolean).length

  if (suspiciousCount >= 2) {
    ipFilter.recordSuspiciousActivity(clientIp)
    log.security('suspicious_activity', {
      ip: clientIp,
      path: req.path,
      method: req.method,
      userAgent,
      suspiciousCount,
      queryKeys: Object.keys(req.query).length,
    })
  }

  next()
}

/**
 * Rate Limiting 설정 (보안 강화 버전)
 */
export function createSecurityRateLimiter(options: {
  windowMs?: number
  max?: number
  message?: string
  skipSuccessfulRequests?: boolean
}) {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // 15분
    max: options.max || 100,
    message: options.message || {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    handler: (req, res) => {
      const clientIp = getClientIp(req)
      ipFilter.recordSuspiciousActivity(clientIp)
      
      log.security('rate_limit_exceeded', {
        ip: clientIp,
        path: req.path,
        method: req.method,
      })

      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
          retryAfter: Math.ceil((options.windowMs || 15 * 60 * 1000) / 1000),
        },
      })
    },
  })
}

export { ipFilter }
