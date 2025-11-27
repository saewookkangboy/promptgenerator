// 템플릿 관련 API 라우트
import { Router, Response } from 'express'
import { prisma } from '../db/prisma'
import { authenticateToken, requireTier, AuthRequest } from '../middleware/auth'

const router = Router()

// 공개 템플릿 목록 조회 (인증 불필요)
router.get('/public', async (req, res: Response) => {
  try {
    const { category, search, page = '1', limit = '20' } = req.query

    const where: any = {
      isPublic: true,
    }

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
        orderBy: [
          { isPremium: 'desc' }, // 프리미엄 우선
          { usageCount: 'desc' }, // 사용 횟수 순
        ],
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          isPremium: true,
          tierRequired: true,
          usageCount: true,
          rating: true,
          content: true,
          variables: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.template.count({ where }),
    ])

    // Top 5 표시를 위한 플래그 추가
    const templatesWithFlags = templates.map(t => ({
      ...t,
      isTop5: t.name.includes('[Top'),
    }))

    res.json({
      templates: templatesWithFlags,
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
router.get('/:id', async (req, res: Response) => {
  try {
    const template = await prisma.template.findFirst({
      where: {
        id: req.params.id,
        isPublic: true,
      },
    })

    if (!template) {
      res.status(404).json({ error: '템플릿을 찾을 수 없습니다' })
      return
    }

    res.json(template)
  } catch (error: any) {
    console.error('템플릿 조회 오류:', error)
    res.status(500).json({ error: '템플릿을 가져오는데 실패했습니다' })
  }
})

// 템플릿 적용 (변수 치환)
router.post('/:id/apply', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { variables } = req.body
    const template = await prisma.template.findFirst({
      where: {
        id: req.params.id,
        isPublic: true,
      },
    })

    if (!template) {
      res.status(404).json({ error: '템플릿을 찾을 수 없습니다' })
      return
    }

    // 티어 확인
    if (template.isPremium && template.tierRequired !== 'FREE') {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
      })
      
      if (!user || user.tier === 'FREE') {
        res.status(403).json({ error: '프리미엄 템플릿은 구독이 필요합니다' })
        return
      }
    }

    // 변수 치환
    const templateContent = typeof template.content === 'string' 
      ? JSON.parse(template.content) 
      : template.content
    
    let prompt = templateContent.title || ''
    
    if (templateContent.description) {
      prompt += '\n\n' + templateContent.description
    }

    templateContent.sections.forEach((section: any) => {
      let sectionContent = section.content
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
        sectionContent = sectionContent.replace(regex, value as string)
      })
      prompt += `\n\n## ${section.title}\n${sectionContent}`
    })

    // 사용 통계 업데이트
    await prisma.template.update({
      where: { id: template.id },
      data: {
        usageCount: { increment: 1 },
      },
    })

    // Analytics 이벤트 기록
    await prisma.analytics.create({
      data: {
        userId: req.user!.id,
        eventType: 'TEMPLATE_USED',
        eventData: {
          templateId: template.id,
          templateName: template.name,
          variables,
        },
      },
    })

    res.json({ prompt })
  } catch (error: any) {
    console.error('템플릿 적용 오류:', error)
    res.status(500).json({ error: '템플릿 적용에 실패했습니다' })
  }
})

export default router

