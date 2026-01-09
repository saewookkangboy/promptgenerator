// 인증 미들웨어
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../db/prisma'
import { log } from '../utils/logger'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    tier: string
  }
}

// JWT 토큰 검증
export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      res.status(401).json({ error: '인증 토큰이 필요합니다' })
      return
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
      userId: string
      email: string
    }

    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        tier: true,
        subscriptionStatus: true,
      },
    })

    if (!user || user.subscriptionStatus !== 'ACTIVE') {
      // 보안 이벤트: 인증 실패 (비활성 사용자)
      log.security('authentication_failed', {
        reason: 'inactive_user',
        userId: decoded.userId,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      })
      res.status(401).json({ error: '유효하지 않은 사용자입니다' })
      return
    }

    req.user = {
      id: user.id,
      email: user.email,
      tier: user.tier,
    }

    next()
  } catch (error: any) {
    // 보안 이벤트: 토큰 검증 실패
    log.security('token_verification_failed', {
      reason: error.name || 'unknown',
      ip: req.ip,
      userAgent: req.get('user-agent'),
    })
    res.status(403).json({ error: '유효하지 않은 토큰입니다' })
  }
}

// Admin 권한 확인
export async function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: '인증이 필요합니다' })
    return
  }

  // Admin 체크: 여러 방법 지원
  let isAdmin = false
  
  // 1. ADMIN_EMAIL 환경 변수로 확인
  if (process.env.ADMIN_EMAIL) {
    const adminEmails = process.env.ADMIN_EMAIL.split(',').map(e => e.trim())
    isAdmin = adminEmails.includes(req.user.email)
  }
  
  // 2. ADMIN_EMAIL이 없으면 데이터베이스에서 Admin 사용자 확인
  if (!isAdmin) {
    try {
      // Admin 사용자 테이블이 있다면 확인 (선택적)
      // 또는 특정 조건으로 Admin 판단 (예: 첫 번째 사용자, 특정 tier 등)
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          email: true,
          tier: true,
          createdAt: true,
        },
      })
      
      // 조건부 Admin 판단 (예: chunghyo@troe.kr 또는 park@troe.kr)
      if (user) {
        const adminEmails = ['chunghyo@troe.kr', 'park@troe.kr', 'admin@troe.kr']
        isAdmin = adminEmails.includes(user.email.toLowerCase())
        
        // 또는 첫 번째 사용자면 Admin으로 간주 (개발 환경)
        if (!isAdmin && process.env.NODE_ENV !== 'production') {
          const firstUser = await prisma.user.findFirst({
            orderBy: { createdAt: 'asc' },
          })
          if (firstUser && firstUser.id === req.user.id) {
            isAdmin = true
          }
        }
      }
    } catch (error) {
      console.error('Admin 권한 확인 오류:', error)
      // 오류 발생 시 기본적으로 거부
    }
  }

  if (!isAdmin) {
    // 보안 이벤트: 권한 거부 (Admin 접근 시도)
    log.security('permission_denied', {
      reason: 'admin_access_denied',
      userId: req.user?.id,
      email: req.user?.email,
      ip: req.ip,
      path: req.path,
      userAgent: req.get('user-agent'),
    })
    res.status(403).json({ 
      error: 'Admin 권한이 필요합니다',
      hint: process.env.ADMIN_EMAIL 
        ? `Admin 이메일: ${process.env.ADMIN_EMAIL}` 
        : 'ADMIN_EMAIL 환경 변수를 설정하거나 Admin 사용자를 생성해주세요'
    })
    return
  }

  next()
}

// Tier 확인 미들웨어
export function requireTier(...allowedTiers: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: '인증이 필요합니다' })
      return
    }

    if (!allowedTiers.includes(req.user.tier)) {
      res.status(403).json({
        error: `이 기능은 ${allowedTiers.join(' 또는 ')} Tier가 필요합니다`,
        requiredTier: allowedTiers,
        currentTier: req.user.tier,
      })
      return
    }

    next()
  }
}

