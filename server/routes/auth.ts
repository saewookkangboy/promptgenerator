// 인증 관련 API 라우트
import { Router, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import { prisma } from '../db/prisma'
import { authenticateToken, AuthRequest } from '../middleware/auth'
import { validateRegisterInput, validateLoginInput } from '../middleware/validation'
import { log } from '../utils/logger'

const router = Router()

// 인증 API에 대한 엄격한 Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 5, // 최대 5회
  message: {
    error: '요청 횟수를 초과했습니다. 15분 후 다시 시도해주세요.',
    retryAfter: '15분'
  },
  skipSuccessfulRequests: true, // 성공한 요청은 카운트에서 제외
  standardHeaders: true,
  legacyHeaders: false,
})

// 소셜 로그인에 대한 Rate Limiting
const socialAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 10, // 최대 10회
  message: {
    error: '소셜 로그인 시도 횟수를 초과했습니다. 15분 후 다시 시도해주세요.',
    retryAfter: '15분'
  },
  standardHeaders: true,
  legacyHeaders: false,
})

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
router.post('/register', authLimiter, validateRegisterInput, async (req, res: Response) => {
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
router.post('/login', authLimiter, validateLoginInput, async (req, res: Response) => {
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

// 소셜 로그인 엔드포인트 (Google, GitHub)
router.get('/google', socialAuthLimiter, async (req, res: Response) => {
  try {
    const { redirect_uri } = req.query
    const clientId = process.env.GOOGLE_CLIENT_ID
    
    if (!clientId) {
      res.status(500).json({ error: 'Google OAuth가 설정되지 않았습니다' })
      return
    }

    const redirectUri = (redirect_uri as string) || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback`
    const scope = 'openid email profile'
    const responseType = 'code'
    const state = jwt.sign({ redirectUri }, process.env.JWT_SECRET || 'secret', { expiresIn: '10m' })
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=${responseType}&` +
      `scope=${scope}&` +
      `state=${state}`

    res.redirect(authUrl)
  } catch (error: any) {
    console.error('Google OAuth 오류:', error)
    res.status(500).json({ error: 'Google 로그인에 실패했습니다' })
  }
})

router.get('/github', socialAuthLimiter, async (req, res: Response) => {
  try {
    const { redirect_uri } = req.query
    const clientId = process.env.GITHUB_CLIENT_ID
    
    if (!clientId) {
      res.status(500).json({ error: 'GitHub OAuth가 설정되지 않았습니다' })
      return
    }

    const redirectUri = (redirect_uri as string) || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback`
    const scope = 'user:email'
    const state = jwt.sign({ redirectUri }, process.env.JWT_SECRET || 'secret', { expiresIn: '10m' })
    
    const authUrl = `https://github.com/login/oauth/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${scope}&` +
      `state=${state}`

    res.redirect(authUrl)
  } catch (error: any) {
    console.error('GitHub OAuth 오류:', error)
    res.status(500).json({ error: 'GitHub 로그인에 실패했습니다' })
  }
})

// 소셜 로그인 콜백 처리
router.get('/callback', socialAuthLimiter, async (req, res: Response) => {
  try {
    const { code, state, provider } = req.query

    if (!code || !state) {
      res.status(400).json({ error: '인증 코드가 없습니다' })
      return
    }

    // State 검증
    let decodedState: { redirectUri: string }
    try {
      decodedState = jwt.verify(state as string, process.env.JWT_SECRET || 'secret') as { redirectUri: string }
    } catch {
      res.status(400).json({ error: '유효하지 않은 요청입니다' })
      return
    }

    // Provider에 따라 처리
    const providerName = (provider as string) || 'google'
    
    if (providerName === 'google') {
      await handleGoogleCallback(code as string, decodedState.redirectUri, res)
    } else if (providerName === 'github') {
      await handleGitHubCallback(code as string, decodedState.redirectUri, res)
    } else {
      res.status(400).json({ error: '지원하지 않는 소셜 로그인 제공자입니다' })
    }
  } catch (error: any) {
    console.error('소셜 로그인 콜백 오류:', error)
    res.status(500).json({ error: '소셜 로그인에 실패했습니다' })
  }
})

// Google OAuth 콜백 처리
async function handleGoogleCallback(code: string, redirectUri: string, res: Response) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      res.status(500).json({ error: 'Google OAuth가 설정되지 않았습니다' })
      return
    }

    // Access Token 요청
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      res.status(400).json({ error: '토큰을 받아오는데 실패했습니다' })
      return
    }

    // 사용자 정보 요청
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })

    const userData = await userResponse.json()

    // 사용자 생성 또는 조회
    let user = await prisma.user.findUnique({
      where: { email: userData.email },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name || null,
          passwordHash: '', // 소셜 로그인은 비밀번호 없음
          tier: 'FREE',
          subscriptionStatus: 'ACTIVE',
        },
      })
    }

    // JWT 토큰 생성
    if (!user) {
      res.status(500).json({ error: '사용자 생성에 실패했습니다' })
      return
    }
    
    const accessToken = generateAccessToken(user.id, user.email)
    const refreshToken = generateRefreshToken(user.id, user.email)

    // 프론트엔드로 리다이렉트 (팝업 메시지 전송)
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>로그인 중...</title></head>
        <body>
          <script>
            window.opener.postMessage({
              type: 'SOCIAL_LOGIN_SUCCESS',
              token: '${accessToken}',
              refreshToken: '${refreshToken}',
              user: ${JSON.stringify(user)}
            }, '${redirectUri.split('/').slice(0, 3).join('/')}');
            window.close();
          </script>
        </body>
      </html>
    `
    res.send(html)
  } catch (error: any) {
    console.error('Google 콜백 처리 오류:', error)
    res.status(500).json({ error: 'Google 로그인 처리에 실패했습니다' })
  }
}

// GitHub OAuth 콜백 처리
async function handleGitHubCallback(code: string, redirectUri: string, res: Response) {
  try {
    const clientId = process.env.GITHUB_CLIENT_ID
    const clientSecret = process.env.GITHUB_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      res.status(500).json({ error: 'GitHub OAuth가 설정되지 않았습니다' })
      return
    }

    // Access Token 요청
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      res.status(400).json({ error: '토큰을 받아오는데 실패했습니다' })
      return
    }

    // 사용자 정보 요청
    const userResponse = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })

    const userData = await userResponse.json()

    // 이메일 요청 (별도 엔드포인트)
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })

    const emails = await emailResponse.json()
    const primaryEmail = emails.find((e: any) => e.primary)?.email || emails[0]?.email

    if (!primaryEmail) {
      res.status(400).json({ error: '이메일 정보를 가져올 수 없습니다' })
      return
    }

    // 사용자 생성 또는 조회
    let user = await prisma.user.findUnique({
      where: { email: primaryEmail },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: primaryEmail,
          name: userData.name || userData.login || null,
          passwordHash: '', // 소셜 로그인은 비밀번호 없음
          tier: 'FREE',
          subscriptionStatus: 'ACTIVE',
        },
      })
    }

    // JWT 토큰 생성
    if (!user) {
      res.status(500).json({ error: '사용자 생성에 실패했습니다' })
      return
    }
    
    const accessToken = generateAccessToken(user.id, user.email)
    const refreshToken = generateRefreshToken(user.id, user.email)

    // 프론트엔드로 리다이렉트 (팝업 메시지 전송)
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>로그인 중...</title></head>
        <body>
          <script>
            window.opener.postMessage({
              type: 'SOCIAL_LOGIN_SUCCESS',
              token: '${accessToken}',
              refreshToken: '${refreshToken}',
              user: ${JSON.stringify(user)}
            }, '${redirectUri.split('/').slice(0, 3).join('/')}');
            window.close();
          </script>
        </body>
      </html>
    `
    res.send(html)
  } catch (error: any) {
    console.error('GitHub 콜백 처리 오류:', error)
    res.status(500).json({ error: 'GitHub 로그인 처리에 실패했습니다' })
  }
}

export default router

