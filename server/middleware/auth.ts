// 인증 미들웨어
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../db/prisma'

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
      res.status(401).json({ error: '유효하지 않은 사용자입니다' })
      return
    }

    req.user = {
      id: user.id,
      email: user.email,
      tier: user.tier,
    }

    next()
  } catch (error) {
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

  // Admin 체크 (예: 특정 이메일 또는 별도 Admin 테이블)
  const isAdmin = req.user.email === process.env.ADMIN_EMAIL

  if (!isAdmin) {
    res.status(403).json({ error: 'Admin 권한이 필요합니다' })
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

