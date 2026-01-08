// 인증 관련 API 라우트
import { Router, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../db/prisma'
import { authenticateToken, AuthRequest } from '../middleware/auth'
import { validateRegisterInput, validateLoginInput } from '../middleware/validation'

const router = Router()

// JWT 토큰 생성
function generateToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }
  )
}

// 회원가입
router.post('/register', validateRegisterInput, async (req, res: Response) => {
  try {
    const { email, password, name } = req.body

    // 이메일 중복 확인
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      res.status(409).json({ error: '이미 사용 중인 이메일입니다' })
      return
    }

    // 비밀번호 해시
    const passwordHash = await bcrypt.hash(password, 10)

    // 사용자 생성
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || null,
        tier: 'FREE',
        subscriptionStatus: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        createdAt: true,
      },
    })

    // JWT 토큰 생성
    const token = generateToken(user.id, user.email)

    res.status(201).json({
      message: '회원가입이 완료되었습니다',
      user,
      token,
    })
  } catch (error: any) {
    console.error('회원가입 오류:', error)
    res.status(500).json({ error: '회원가입에 실패했습니다' })
  }
})

// 로그인
router.post('/login', validateLoginInput, async (req, res: Response) => {
  try {
    const { email, password } = req.body

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' })
      return
    }

    // 비밀번호 확인
    const isValidPassword = await bcrypt.compare(password, user.passwordHash)

    if (!isValidPassword) {
      res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' })
      return
    }

    // 구독 상태 확인
    if (user.subscriptionStatus !== 'ACTIVE') {
      res.status(403).json({
        error: '구독이 만료되었거나 비활성화된 계정입니다',
        subscriptionStatus: user.subscriptionStatus,
      })
      return
    }

    // 마지막 로그인 시간 업데이트
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // JWT 토큰 생성
    const token = generateToken(user.id, user.email)

    res.json({
      message: '로그인 성공',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
      },
      token,
    })
  } catch (error: any) {
    console.error('로그인 오류:', error)
    res.status(500).json({ error: '로그인에 실패했습니다' })
  }
})

// 현재 사용자 정보 조회
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        subscriptionStatus: true,
        subscriptionStartedAt: true,
        subscriptionEndsAt: true,
        createdAt: true,
        lastLoginAt: true,
      },
    })

    if (!user) {
      res.status(404).json({ error: '사용자를 찾을 수 없습니다' })
      return
    }

    res.json({ user })
  } catch (error: any) {
    console.error('사용자 정보 조회 오류:', error)
    res.status(500).json({ error: '사용자 정보를 가져오는데 실패했습니다' })
  }
})

// 토큰 갱신
router.post('/refresh', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const newToken = generateToken(req.user!.id, req.user!.email)

    res.json({
      message: '토큰이 갱신되었습니다',
      token: newToken,
    })
  } catch (error: any) {
    console.error('토큰 갱신 오류:', error)
    res.status(500).json({ error: '토큰 갱신에 실패했습니다' })
  }
})

// 비밀번호 변경
router.post('/change-password', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요' })
      return
    }

    if (newPassword.length < 8) {
      res.status(400).json({ error: '새 비밀번호는 최소 8자 이상이어야 합니다' })
      return
    }

    // 현재 사용자 조회
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    })

    if (!user) {
      res.status(404).json({ error: '사용자를 찾을 수 없습니다' })
      return
    }

    // 현재 비밀번호 확인
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash)

    if (!isValidPassword) {
      res.status(401).json({ error: '현재 비밀번호가 올바르지 않습니다' })
      return
    }

    // 새 비밀번호 해시
    const newPasswordHash = await bcrypt.hash(newPassword, 10)

    // 비밀번호 업데이트
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    })

    res.json({ message: '비밀번호가 변경되었습니다' })
  } catch (error: any) {
    console.error('비밀번호 변경 오류:', error)
    res.status(500).json({ error: '비밀번호 변경에 실패했습니다' })
  }
})

export default router

