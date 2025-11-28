// Admin 관리 API 라우트
import { Router, Response } from 'express'
import { prisma } from '../db/prisma'
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth'

const router = Router()
const MAX_TEMPLATE_HISTORY = 20

// 모든 라우트는 Admin 권한 필요
router.use(authenticateToken)
router.use(requireAdmin)

// 디버깅: 라우트 등록 확인
router.use((req: AuthRequest, res, next) => {
  console.log(`[Admin Route] ${req.method} ${req.path} - User: ${req.user?.email || 'none'}`)
  next()
})

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

// DB 연결 정보 마스킹
function maskDatabaseUrl(url?: string | null): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.hostname}:${parsed.port || ''}/${parsed.pathname.replace('/', '')}`
  } catch {
    return 'masked'
  }
}

type TemplateHistoryEntry = {
  version: number
  name: string
  description?: string | null
  category: string
  model?: string | null
  content: string
  variables?: any
  updatedAt: string
  authorId?: string | null
  changeSummary?: string | null
}

function parseTemplateJSON<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function serializeHistory(history: any): TemplateHistoryEntry[] {
  if (!Array.isArray(history)) return []
  return history.map((entry) => ({
    version: entry.version,
    name: entry.name,
    description: entry.description,
    category: entry.category,
    model: entry.model,
    content: entry.content,
    variables: entry.variables,
    updatedAt: entry.updatedAt,
    authorId: entry.authorId,
    changeSummary: entry.changeSummary,
  }))
}

function serializeTemplate(template: any) {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    category: template.category,
    model: template.model,
    version: template.version,
    isPublic: template.isPublic,
    isPremium: template.isPremium,
    tierRequired: template.tierRequired,
    usageCount: template.usageCount,
    rating: template.rating,
    authorId: template.authorId,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
    content: parseTemplateJSON(template.content),
    variables: template.variables,
    history: serializeHistory(template.history),
  }
}

// DB 상태 체크
router.get('/db/health', async (req: AuthRequest, res: Response) => {
  const startedAt = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({
      status: 'ok',
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
      database: maskDatabaseUrl(process.env.DATABASE_URL),
    })
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      latencyMs: Date.now() - startedAt,
      message: error?.message || 'DB 연결 확인 중 오류가 발생했습니다.',
    })
  }
})

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
      categoryStats,
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
      // 카테고리별 프롬프트 통계
      prisma.prompt.groupBy({
        by: ['category'],
        where: { deletedAt: null },
        _count: {
          id: true,
        },
      }),
    ])

    // 카테고리별 통계 변환
    const categoryCounts = {
      text: 0,
      image: 0,
      video: 0,
      engineering: 0,
      total: totalPrompts,
    }
    
    categoryStats.forEach((stat: { category: string; _count: { id: number } }) => {
      const category = stat.category.toLowerCase()
      if (category === 'text' || category === 'image' || category === 'video' || category === 'engineering') {
        categoryCounts[category as keyof typeof categoryCounts] = stat._count.id
      }
    })

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
      // 프론트엔드 호환성을 위한 통계
      stats: categoryCounts,
      visitCount: totalUsers, // 사용자 수를 방문 카운트로 사용 (실제 방문 카운트는 별도 구현 필요)
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

// 템플릿 목록 조회
router.get('/templates', async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', category, search } = req.query

    const where: any = {}
    if (category) {
      where.category = category
    }
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.template.count({ where }),
    ])

    res.json({
      templates: templates.map(serializeTemplate),
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    })
  } catch (error: any) {
    console.error('템플릿 목록 조회 오류:', error)
    res.status(500).json({ error: '템플릿 목록을 가져오는데 실패했습니다' })
  }
})

// 템플릿 상세 조회
router.get('/templates/:id', async (req: AuthRequest, res: Response) => {
  try {
    const template = await prisma.template.findUnique({
      where: { id: req.params.id },
    })

    if (!template) {
      res.status(404).json({ error: '템플릿을 찾을 수 없습니다' })
      return
    }

    res.json(serializeTemplate(template))
  } catch (error: any) {
    console.error('템플릿 조회 오류:', error)
    res.status(500).json({ error: '템플릿을 가져오는데 실패했습니다' })
  }
})

// 템플릿 생성
router.post('/templates', async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      description,
      category,
      model,
      template,
      variables,
      isPublic = false,
      isPremium = false,
      tierRequired = 'FREE',
    } = req.body

    if (!name || !category || !template) {
      res.status(400).json({ error: 'name, category, template 필드는 필수입니다.' })
      return
    }

    const created = await prisma.template.create({
      data: {
        name,
        description,
        category,
        model,
        content: JSON.stringify(template),
        variables: variables ?? [],
        isPublic,
        isPremium,
        tierRequired,
        authorId: req.user!.id,
      },
    })

    await logAdminAction(
      req.user!.id,
      'CREATE_TEMPLATE',
      'TEMPLATE',
      created.id,
      { category },
      req
    )

    res.status(201).json(serializeTemplate(created))
  } catch (error: any) {
    console.error('템플릿 생성 오류:', error)
    res.status(500).json({ error: '템플릿 생성에 실패했습니다' })
  }
})

// 템플릿 수정
router.patch('/templates/:id', async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      description,
      category,
      model,
      template,
      variables,
      isPublic,
      isPremium,
      tierRequired,
      changeSummary,
    } = req.body

    const existing = await prisma.template.findUnique({
      where: { id: req.params.id },
    })

    if (!existing) {
      res.status(404).json({ error: '템플릿을 찾을 수 없습니다' })
      return
    }

    const history = serializeHistory(existing.history)
    const newHistoryEntry: TemplateHistoryEntry = {
      version: existing.version,
      name: existing.name,
      description: existing.description,
      category: existing.category,
      model: existing.model,
      content: existing.content,
      variables: existing.variables,
      updatedAt: existing.updatedAt.toISOString(),
      authorId: req.user!.id,
      changeSummary: changeSummary || null,
    }

    const updated = await prisma.template.update({
      where: { id: existing.id },
      data: {
        name: name ?? existing.name,
        description: description ?? existing.description,
        category: category ?? existing.category,
        model: model ?? existing.model,
        content: template ? JSON.stringify(template) : existing.content,
        variables: variables ?? existing.variables,
        isPublic: typeof isPublic === 'boolean' ? isPublic : existing.isPublic,
        isPremium: typeof isPremium === 'boolean' ? isPremium : existing.isPremium,
        tierRequired: tierRequired ?? existing.tierRequired,
        version: existing.version + 1,
        history: [newHistoryEntry, ...history].slice(0, MAX_TEMPLATE_HISTORY),
      },
    })

    await logAdminAction(
      req.user!.id,
      'UPDATE_TEMPLATE',
      'TEMPLATE',
      existing.id,
      { version: updated.version },
      req
    )

    res.json(serializeTemplate(updated))
  } catch (error: any) {
    console.error('템플릿 수정 오류:', error)
    res.status(500).json({ error: '템플릿 수정에 실패했습니다' })
  }
})

// 템플릿 삭제
router.delete('/templates/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.template.delete({
      where: { id: req.params.id },
    })

    await logAdminAction(
      req.user!.id,
      'DELETE_TEMPLATE',
      'TEMPLATE',
      req.params.id,
      {},
      req
    )

    res.json({ message: '템플릿이 삭제되었습니다.' })
  } catch (error: any) {
    console.error('템플릿 삭제 오류:', error)
    res.status(500).json({ error: '템플릿 삭제에 실패했습니다' })
  }
})

// 템플릿 롤백
router.post('/templates/:id/rollback', async (req: AuthRequest, res: Response) => {
  try {
    const { version, changeSummary } = req.body
    if (typeof version !== 'number') {
      res.status(400).json({ error: 'version 값이 필요합니다.' })
      return
    }

    const existing = await prisma.template.findUnique({
      where: { id: req.params.id },
    })

    if (!existing) {
      res.status(404).json({ error: '템플릿을 찾을 수 없습니다' })
      return
    }

    const history = serializeHistory(existing.history)
    const targetVersion = history.find((entry) => entry.version === version)

    if (!targetVersion) {
      res.status(404).json({ error: '해당 버전을 찾을 수 없습니다' })
      return
    }

    const remainingHistory = history.filter((entry) => entry.version !== version)
    const rollbackHistoryEntry: TemplateHistoryEntry = {
      version: existing.version,
      name: existing.name,
      description: existing.description,
      category: existing.category,
      model: existing.model,
      content: existing.content,
      variables: existing.variables,
      updatedAt: existing.updatedAt.toISOString(),
      authorId: req.user!.id,
      changeSummary: changeSummary || `Rollback to version ${version}`,
    }

    const updated = await prisma.template.update({
      where: { id: existing.id },
      data: {
        name: targetVersion.name,
        description: targetVersion.description,
        category: targetVersion.category,
        model: targetVersion.model,
        content: targetVersion.content,
        variables: targetVersion.variables ?? existing.variables,
        version: existing.version + 1,
        history: [rollbackHistoryEntry, ...remainingHistory].slice(0, MAX_TEMPLATE_HISTORY),
      },
    })

    await logAdminAction(
      req.user!.id,
      'ROLLBACK_TEMPLATE',
      'TEMPLATE',
      existing.id,
      { targetVersion: version },
      req
    )

    res.json(serializeTemplate(updated))
  } catch (error: any) {
    console.error('템플릿 롤백 오류:', error)
    res.status(500).json({ error: '템플릿 롤백에 실패했습니다' })
  }
})

// 템플릿 대시보드 데이터
router.get('/templates/dashboard', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 오늘의 통계
    const todayUsage = await prisma.analytics.count({
      where: {
        eventType: 'TEMPLATE_USED',
        createdAt: { gte: today },
      },
    })

    // 가장 인기 있는 템플릿
    const topTemplates = await prisma.template.findMany({
      where: { isPublic: true },
      orderBy: { usageCount: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        usageCount: true,
        rating: true,
        category: true,
      },
    })

    // 카테고리별 통계
    const categoryStats = await prisma.template.groupBy({
      by: ['category'],
      where: { isPublic: true },
      _count: { id: true },
      _sum: { usageCount: true },
    })

    // 최근 7일 사용 추이
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const dailyUsage = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT 
        DATE(created_at) as date,
        COUNT(*)::bigint as count
      FROM analytics
      WHERE event_type = 'TEMPLATE_USED'
        AND created_at >= ${sevenDaysAgo}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `

    res.json({
      todayUsage,
      topTemplates,
      categoryStats: categoryStats.map(stat => ({
        category: stat.category,
        count: stat._count.id,
        totalUsage: stat._sum.usageCount || 0,
      })),
      dailyUsage: dailyUsage.map(item => ({
        date: item.date,
        count: Number(item.count),
      })),
    })
  } catch (error: any) {
    console.error('템플릿 대시보드 오류:', error)
    res.status(500).json({ error: '대시보드 데이터를 가져오는데 실패했습니다' })
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
