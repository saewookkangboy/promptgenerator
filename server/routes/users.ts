// 사용자 관리 API 라우트
import { Router, Response } from 'express'
import { prisma } from '../db/prisma'
import { authenticateToken, requireTier, AuthRequest } from '../middleware/auth'

const router = Router()

// 모든 라우트는 인증 필요
router.use(authenticateToken)

// 사용자 프로필 조회
router.get('/profile', async (req: AuthRequest, res: Response) => {
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

    // 통계 정보 추가
    const [promptCount, workspaceCount] = await Promise.all([
      prisma.prompt.count({
        where: {
          userId: req.user!.id,
          deletedAt: null,
        },
      }),
      prisma.workspace.count({
        where: {
          ownerId: req.user!.id,
        },
      }),
    ])

    res.json({
      user: {
        ...user,
        stats: {
          promptCount,
          workspaceCount,
        },
      },
    })
  } catch (error: any) {
    console.error('프로필 조회 오류:', error)
    res.status(500).json({ error: '프로필을 가져오는데 실패했습니다' })
  }
})

// 사용자 프로필 수정
router.patch('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        name: name || undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        updatedAt: true,
      },
    })

    res.json({
      message: '프로필이 업데이트되었습니다',
      user,
    })
  } catch (error: any) {
    console.error('프로필 수정 오류:', error)
    res.status(500).json({ error: '프로필 수정에 실패했습니다' })
  }
})

// 사용자 계정 삭제
router.delete('/profile', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.delete({
      where: { id: req.user!.id },
    })

    res.json({ message: '계정이 삭제되었습니다' })
  } catch (error: any) {
    console.error('계정 삭제 오류:', error)
    if (error.code === 'P2025') {
      res.status(404).json({ error: '사용자를 찾을 수 없습니다' })
      return
    }
    res.status(500).json({ error: '계정 삭제에 실패했습니다' })
  }
})

// 사용자 개요 및 프롬프트 이력
router.get('/overview', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        subscriptionStatus: true,
        createdAt: true,
      },
    })

    if (!user) {
      res.status(404).json({ error: '사용자를 찾을 수 없습니다' })
      return
    }

    const [promptCount, workspaceCount, recentPrompts] = await Promise.all([
      prisma.prompt.count({
        where: { userId: req.user!.id, deletedAt: null },
      }),
      prisma.workspace.count({
        where: { ownerId: req.user!.id },
      }),
      prisma.prompt.findMany({
        where: { userId: req.user!.id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          category: true,
          createdAt: true,
        },
      }),
    ])

    res.json({
      user: {
        ...user,
        stats: {
          promptCount,
          workspaceCount,
        },
      },
      recentPrompts,
    })
  } catch (error: any) {
    console.error('사용자 개요 조회 오류:', error)
    res.status(500).json({ error: '사용자 개요를 가져오는데 실패했습니다' })
  }
})

// API 키 생성/조회
router.get('/api-key', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        apiKey: true,
        tier: true,
      },
    })

    if (!user) {
      res.status(404).json({ error: '사용자를 찾을 수 없습니다' })
      return
    }

    // BASIC 이상만 API 키 사용 가능
    if (user.tier === 'FREE') {
      res.status(403).json({
        error: 'API 키는 BASIC 이상 Tier에서 사용할 수 있습니다',
        requiredTier: 'BASIC',
      })
      return
    }

    res.json({
      apiKey: user.apiKey || null,
      hasApiKey: !!user.apiKey,
    })
  } catch (error: any) {
    console.error('API 키 조회 오류:', error)
    res.status(500).json({ error: 'API 키를 가져오는데 실패했습니다' })
  }
})

// API 키 생성
router.post('/api-key', requireTier('BASIC', 'PROFESSIONAL', 'ENTERPRISE'), async (req: AuthRequest, res: Response) => {
  try {
    // API 키 생성 (간단한 랜덤 문자열)
    const apiKey = `pk_${Buffer.from(`${req.user!.id}-${Date.now()}`).toString('base64').replace(/[^a-zA-Z0-9]/g, '')}`

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { apiKey },
    })

    res.json({
      message: 'API 키가 생성되었습니다',
      apiKey,
      warning: '이 키는 한 번만 표시됩니다. 안전한 곳에 저장하세요.',
    })
  } catch (error: any) {
    console.error('API 키 생성 오류:', error)
    res.status(500).json({ error: 'API 키 생성에 실패했습니다' })
  }
})

// API 키 삭제
router.delete('/api-key', requireTier('BASIC', 'PROFESSIONAL', 'ENTERPRISE'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { apiKey: null },
    })

    res.json({ message: 'API 키가 삭제되었습니다' })
  } catch (error: any) {
    console.error('API 키 삭제 오류:', error)
    res.status(500).json({ error: 'API 키 삭제에 실패했습니다' })
  }
})

export default router

