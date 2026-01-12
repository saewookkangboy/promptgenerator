/**
 * 강화된 CSRF 보호 미들웨어
 * 
 * 세션 기반 CSRF 토큰 검증을 제공합니다.
 */

import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { log } from '../utils/logger'
import { getClientIp } from './security'

/**
 * CSRF 토큰 저장소 (메모리 기반, 프로덕션에서는 Redis 등 사용 권장)
 */
class CSRFTokenStore {
  private tokens: Map<string, { token: string; expiresAt: number }> = new Map()
  private readonly TTL = 60 * 60 * 1000 // 1시간

  generate(userId: string): string {
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = Date.now() + this.TTL

    this.tokens.set(userId, { token, expiresAt })

    // 만료된 토큰 정리
    this.cleanup()

    return token
  }

  validate(userId: string, token: string): boolean {
    const stored = this.tokens.get(userId)

    if (!stored) {
      return false
    }

    if (Date.now() > stored.expiresAt) {
      this.tokens.delete(userId)
      return false
    }

    return crypto.timingSafeEqual(
      Buffer.from(stored.token),
      Buffer.from(token)
    )
  }

  revoke(userId: string) {
    this.tokens.delete(userId)
  }

  private cleanup() {
    const now = Date.now()
    for (const [userId, data] of this.tokens.entries()) {
      if (now > data.expiresAt) {
        this.tokens.delete(userId)
      }
    }
  }
}

const tokenStore = new CSRFTokenStore()

/**
 * CSRF 토큰 생성 및 발급
 */
export function generateCSRFToken(userId?: string): string {
  if (!userId) {
    // 사용자 ID가 없는 경우 세션 ID나 IP 기반 토큰 생성
    return crypto.randomBytes(32).toString('hex')
  }
  return tokenStore.generate(userId)
}

/**
 * CSRF 토큰 검증 미들웨어 (강화 버전)
 */
export function validateCSRFTokenEnhanced(req: Request, res: Response, next: NextFunction) {
  // 안전한 메서드 (읽기 전용)는 CSRF 검증 제외
  const safeMethods = ['GET', 'HEAD', 'OPTIONS']
  if (safeMethods.includes(req.method)) {
    return next()
  }

  // 사용자 ID 추출 (JWT 토큰에서)
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  let userId: string | undefined

  if (token) {
    try {
      const jwt = require('jsonwebtoken')
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any
      userId = decoded.userId || decoded.id
    } catch (error) {
      // JWT 검증 실패는 인증 미들웨어에서 처리
    }
  }

  // CSRF 토큰 가져오기 (여러 위치에서 시도)
  const tokenFromHeader = req.headers['x-csrf-token'] as string
  const tokenFromBody = req.body?._csrf
  const tokenFromQuery = req.query?._csrf as string
  const csrfToken = tokenFromHeader || tokenFromBody || tokenFromQuery

  // 토큰이 없는 경우
  if (!csrfToken) {
    log.security('csrf_token_missing', {
      ip: getClientIp(req),
      path: req.path,
      method: req.method,
      userId,
    })
    return res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_MISSING',
        message: 'CSRF 토큰이 필요합니다. 요청 헤더에 X-CSRF-Token을 포함해주세요.',
      },
    })
  }

  // 토큰 형식 검증
  if (csrfToken.length !== 64 || !/^[a-f0-9]+$/i.test(csrfToken)) {
    log.security('csrf_token_invalid_format', {
      ip: getClientIp(req),
      path: req.path,
      method: req.method,
      userId,
      tokenLength: csrfToken.length,
    })
    return res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_INVALID',
        message: '유효하지 않은 CSRF 토큰 형식입니다.',
      },
    })
  }

  // 사용자 ID가 있는 경우 세션 기반 검증
  if (userId) {
    if (!tokenStore.validate(userId, csrfToken)) {
      log.security('csrf_token_verification_failed', {
        ip: getClientIp(req),
        path: req.path,
        method: req.method,
        userId,
      })
      return res.status(403).json({
        success: false,
        error: {
          code: 'CSRF_TOKEN_INVALID',
          message: 'CSRF 토큰 검증에 실패했습니다.',
        },
      })
    }
  } else {
    // 사용자 ID가 없는 경우 쿠키 기반 검증
    const cookieToken = req.cookies?._csrf
    if (!cookieToken || !crypto.timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(csrfToken)
    )) {
      log.security('csrf_token_cookie_mismatch', {
        ip: getClientIp(req),
        path: req.path,
        method: req.method,
      })
      return res.status(403).json({
        success: false,
        error: {
          code: 'CSRF_TOKEN_INVALID',
          message: 'CSRF 토큰이 일치하지 않습니다.',
        },
      })
    }
  }

  next()
}

/**
 * CSRF 토큰 발급 엔드포인트 (강화 버전)
 */
export function getCSRFTokenEnhanced(req: Request, res: Response) {
  // 사용자 ID 추출
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  let userId: string | undefined

  if (token) {
    try {
      const jwt = require('jsonwebtoken')
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any
      userId = decoded.userId || decoded.id
    } catch (error) {
      // JWT 검증 실패 시 익명 사용자로 처리
    }
  }

  let csrfToken: string

  if (userId) {
    // 인증된 사용자: 세션 기반 토큰
    csrfToken = tokenStore.generate(userId)
  } else {
    // 익명 사용자: 쿠키 기반 토큰
    csrfToken = crypto.randomBytes(32).toString('hex')
  }

  // 쿠키에 CSRF 토큰 저장
  res.cookie('_csrf', csrfToken, {
    httpOnly: false, // 프론트엔드에서 읽을 수 있도록
    secure: process.env.NODE_ENV === 'production', // HTTPS에서만 전송
    sameSite: 'strict', // CSRF 공격 방지
    maxAge: 3600000, // 1시간
    path: '/',
  })

  res.json({
    success: true,
    csrfToken,
    expiresIn: 3600, // 1시간 (초)
  })
}

/**
 * CSRF 토큰 갱신
 */
export function refreshCSRFToken(userId?: string): string {
  if (userId) {
    tokenStore.revoke(userId)
    return tokenStore.generate(userId)
  }
  return crypto.randomBytes(32).toString('hex')
}

/**
 * CSRF 보호가 필요한 라우트에 적용할 미들웨어
 */
export function requireCSRFEnhanced(req: Request, res: Response, next: NextFunction) {
  return validateCSRFTokenEnhanced(req, res, next)
}
