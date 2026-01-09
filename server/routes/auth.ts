// 인증 관련 API 라우트
import { Router, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../db/prisma'
import { authenticateToken, AuthRequest } from '../middleware/auth'
import { validateRegisterInput, validateLoginInput } from '../middleware/validation'
import { log } from '../utils/logger'

const router = Router()

// Access Token 생성 (15분 만료)
function generateAccessToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email, type: 'access' },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '15m' }
  )
}

// Refresh Token 생성 (7일 만료)
function generateRefreshToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email, type: 'refresh' },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }
  )
}

// 레거시 호환성을 위한 함수 (Access Token 반환)
function generateToken(userId: string, email: string): string {
  return generateAccessToken(userId, email)
}

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: 회원가입
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: 최소 8자, 대소문자, 숫자, 특수문자(@$!%*?&) 각각 1개 이상 포함
 *                 example: Password123!
 *               name:
 *                 type: string
 *                 nullable: true
 *                 example: 홍길동
 *     responses:
 *       201:
 *         description: 회원가입 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 회원가입이 완료되었습니다
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 accessToken:
 *                   type: string
 *                   description: Access Token (15분 만료)
 *                 refreshToken:
 *                   type: string
 *                   description: Refresh Token (7일 만료)
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: 이미 사용 중인 이메일
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

    // 비밀번호 복잡도 검증 (최소 8자, 대소문자, 숫자, 특수문자)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    if (!passwordRegex.test(password)) {
      res.status(400).json({
        error: '비밀번호는 최소 8자 이상이며, 대문자, 소문자, 숫자, 특수문자(@$!%*?&)를 각각 1개 이상 포함해야 합니다',
      })
      return
    }

    // 비밀번호 해시 (bcrypt 라운드 수: 12 - 보안 강화)
    const passwordHash = await bcrypt.hash(password, 12)

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

    // JWT 토큰 생성 (Access Token + Refresh Token)
    const accessToken = generateAccessToken(user.id, user.email)
    const refreshToken = generateRefreshToken(user.id, user.email)

    // Refresh Token을 데이터베이스에 저장 (선택사항 - 향후 블랙리스트 관리용)
    // 현재는 클라이언트에 반환만 함

    res.status(201).json({
      message: '회원가입이 완료되었습니다',
      user,
      accessToken,
      refreshToken,
      // 레거시 호환성
      token: accessToken,
    })
  } catch (error: any) {
    console.error('회원가입 오류:', error)
    res.status(500).json({ error: '회원가입에 실패했습니다' })
  }
})

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 로그인
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: Password123!
 *     responses:
 *       200:
 *         description: 로그인 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 로그인 성공
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 accessToken:
 *                   type: string
 *                   description: Access Token (15분 만료)
 *                 refreshToken:
 *                   type: string
 *                   description: Refresh Token (7일 만료)
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', validateLoginInput, async (req, res: Response) => {
  try {
    const { email, password } = req.body

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      // 보안 이벤트: 로그인 실패 (존재하지 않는 사용자)
      log.security('login_failed', {
        reason: 'user_not_found',
        email: email,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      })
      res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' })
      return
    }

    // 비밀번호 확인
    const isValidPassword = await bcrypt.compare(password, user.passwordHash)

    if (!isValidPassword) {
      // 보안 이벤트: 로그인 실패 (잘못된 비밀번호)
      log.security('login_failed', {
        reason: 'invalid_password',
        userId: user.id,
        email: email,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      })
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

    // JWT 토큰 생성 (Access Token + Refresh Token)
    const accessToken = generateAccessToken(user.id, user.email)
    const refreshToken = generateRefreshToken(user.id, user.email)

    // 보안 이벤트: 로그인 성공
    log.security('login_success', {
      userId: user.id,
      email: user.email,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    })

    // 쿠키 설정 (Refresh Token을 HttpOnly Cookie로 저장 - 선택사항)
    // 현재는 클라이언트에 반환만 하며, 향후 HttpOnly Cookie 사용 고려
    // res.cookie('refreshToken', refreshToken, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === 'production',
    //   sameSite: 'strict',
    //   maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
    // })

    res.json({
      message: '로그인 성공',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
      },
      accessToken,
      refreshToken,
      // 레거시 호환성
      token: accessToken,
    })
  } catch (error: any) {
    console.error('로그인 오류:', error)
    res.status(500).json({ error: '로그인에 실패했습니다' })
  }
})

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: 현재 사용자 정보 조회
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 사용자 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: 인증 필요
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: 토큰 갱신 (Refresh Token 사용)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh Token
 *     responses:
 *       200:
 *         description: 토큰 갱신 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 토큰이 갱신되었습니다
 *                 accessToken:
 *                   type: string
 *                   description: 새로운 Access Token
 *       401:
 *         description: Refresh Token이 유효하지 않음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/refresh', async (req, res: Response) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh Token이 필요합니다' })
      return
    }

    try {
      // Refresh Token 검증
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || 'secret') as {
        userId: string
        email: string
        type: string
      }

      // Refresh Token 타입 확인
      if (decoded.type !== 'refresh') {
        res.status(401).json({ error: '유효하지 않은 Refresh Token입니다' })
        return
      }

      // 사용자 확인
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          subscriptionStatus: true,
        },
      })

      if (!user || user.subscriptionStatus !== 'ACTIVE') {
        res.status(401).json({ error: '유효하지 않은 사용자입니다' })
        return
      }

      // 새로운 Access Token 생성
      const newAccessToken = generateAccessToken(user.id, user.email)

      res.json({
        message: '토큰이 갱신되었습니다',
        accessToken: newAccessToken,
        // 레거시 호환성
        token: newAccessToken,
      })
    } catch (jwtError: any) {
      if (jwtError.name === 'TokenExpiredError') {
        res.status(401).json({ error: 'Refresh Token이 만료되었습니다. 다시 로그인해주세요' })
      } else {
        res.status(401).json({ error: '유효하지 않은 Refresh Token입니다' })
      }
    }
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

    // 새 비밀번호 복잡도 검증
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    if (!passwordRegex.test(newPassword)) {
      res.status(400).json({
        error: '새 비밀번호는 최소 8자 이상이며, 대문자, 소문자, 숫자, 특수문자(@$!%*?&)를 각각 1개 이상 포함해야 합니다',
      })
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
    // 비밀번호 해시 (bcrypt 라운드 수: 12 - 보안 강화)
    const newPasswordHash = await bcrypt.hash(newPassword, 12)

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

