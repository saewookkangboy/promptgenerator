// Admin 관리 API 라우트
import { Router, Response } from 'express'
import { prisma } from '../db/prisma'
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth'

const router = Router()

// 모든 라우트는 Admin 권한 필요
router.use(authenticateToken)
router.use(requireAdmin)

// 감사 로그 기록 헬퍼
async function logAdminAction(
  adminUserId: string,
  action: string,
  resourceType: string | null,
  resourceId: string | null,
  details: any,
  req: AuthRequest
) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminUserId,
        action,
        resourceType,
        resourceId,
        details,
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.headers['user-agent'] || null,
      },
    })
  } catch (error) {
    console.error('감사 로그 기록 실패:', error)
  }
}

// 전체 통계 조회
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalPrompts,
      totalWorkspaces,
      tierDistribution,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          subscriptionStatus: 'ACTIVE',
        },
      }),
      prisma.prompt.count({
        where: { deletedAt: null },
      }),
      prisma.workspace.count(),
      prisma.user.groupBy({
        by: ['tier'],
        _count: {
          id: true,
        },
      }),
      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          tier: true,
          createdAt: true,
        },
      }),
    ])

    await logAdminAction(
      req.user!.id,
      'VIEW_STATS',
      null,
      null,
      {},
      req
    )

    res.json({
      overview: {
        totalUsers,
        activeUsers,
        totalPrompts,
        totalWorkspaces,
      },
      tierDistribution: tierDistribution.map((t: { tier: string; _count: { id: number } }) => ({
        tier: t.tier,
        count: t._count.id,
      })),
      recentUsers,
    })
  } catch (error: any) {
    console.error('통계 조회 오류:', error)
    res.status(500).json({ error: '통계를 가져오는데 실패했습니다' })
  }
})

// 사용자 목록 조회
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', tier, status, search } = req.query

    const where: any = {}

    if (tier) {
      where.tier = tier
    }

    if (status) {
      where.subscriptionStatus = status
    }

    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { name: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
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
      }),
      prisma.user.count({ where }),
    ])

    await logAdminAction(
      req.user!.id,
      'VIEW_USERS',
      null,
      null,
      { filters: { tier, status, search } },
      req
    )

    res.json({
      users,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    })
  } catch (error: any) {
    console.error('사용자 목록 조회 오류:', error)
    res.status(500).json({ error: '사용자 목록을 가져오는데 실패했습니다' })
  }
})

// 사용자 상세 조회
router.get('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
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

    // 사용자 통계
    const [promptCount, workspaceCount] = await Promise.all([
      prisma.prompt.count({
        where: {
          userId: user.id,
          deletedAt: null,
        },
      }),
      prisma.workspace.count({
        where: {
          ownerId: user.id,
        },
      }),
    ])

    await logAdminAction(
      req.user!.id,
      'VIEW_USER',
      'USER',
      user.id,
      {},
      req
    )

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
    console.error('사용자 상세 조회 오류:', error)
    res.status(500).json({ error: '사용자 정보를 가져오는데 실패했습니다' })
  }
})

// 사용자 Tier 변경
router.patch('/users/:id/tier', async (req: AuthRequest, res: Response) => {
  try {
    const { tier } = req.body

    if (!tier || !['FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE'].includes(tier)) {
      res.status(400).json({ error: '유효한 Tier를 입력해주세요' })
      return
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { tier },
      select: {
        id: true,
        email: true,
        tier: true,
      },
    })

    await logAdminAction(
      req.user!.id,
      'UPDATE_USER_TIER',
      'USER',
      user.id,
      { oldTier: 'unknown', newTier: tier },
      req
    )

    res.json({
      message: '사용자 Tier가 변경되었습니다',
      user,
    })
  } catch (error: any) {
    console.error('Tier 변경 오류:', error)
    res.status(500).json({ error: 'Tier 변경에 실패했습니다' })
  }
})

// 사용자 구독 상태 변경
router.patch('/users/:id/subscription', async (req: AuthRequest, res: Response) => {
  try {
    const { status, endsAt } = req.body

    if (!status || !['ACTIVE', 'CANCELLED', 'EXPIRED', 'TRIAL'].includes(status)) {
      res.status(400).json({ error: '유효한 구독 상태를 입력해주세요' })
      return
    }

    const updateData: any = {
      subscriptionStatus: status,
    }

    if (endsAt) {
      updateData.subscriptionEndsAt = new Date(endsAt)
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
      },
    })

    await logAdminAction(
      req.user!.id,
      'UPDATE_USER_SUBSCRIPTION',
      'USER',
      user.id,
      { status, endsAt },
      req
    )

    res.json({
      message: '구독 상태가 변경되었습니다',
      user,
    })
  } catch (error: any) {
    console.error('구독 상태 변경 오류:', error)
    res.status(500).json({ error: '구독 상태 변경에 실패했습니다' })
  }
})

// 프롬프트 목록 조회 (Admin)
router.get('/prompts', async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', category, userId, search } = req.query

    const where: any = {
      deletedAt: null,
    }

    if (category) {
      where.category = category
    }

    if (userId) {
      where.userId = userId
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { content: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

    const [prompts, total] = await Promise.all([
      prisma.prompt.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          folder: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.prompt.count({ where }),
    ])

    await logAdminAction(
      req.user!.id,
      'VIEW_PROMPTS',
      null,
      null,
      { filters: { category, userId, search } },
      req
    )

    res.json({
      prompts,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    })
  } catch (error: any) {
    console.error('프롬프트 목록 조회 오류:', error)
    res.status(500).json({ error: '프롬프트 목록을 가져오는데 실패했습니다' })
  }
})

// 감사 로그 조회
router.get('/audit-logs', async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '50', action, resourceType } = req.query

    const where: any = {}

    if (action) {
      where.action = action
    }

    if (resourceType) {
      where.resourceType = resourceType
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

    const [logs, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: {
          adminUser: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      }),
      prisma.adminAuditLog.count({ where }),
    ])

    res.json({
      logs,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    })
  } catch (error: any) {
    console.error('감사 로그 조회 오류:', error)
    res.status(500).json({ error: '감사 로그를 가져오는데 실패했습니다' })
  }
})

export default router

