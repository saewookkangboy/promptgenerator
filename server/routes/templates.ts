// 템플릿 관련 API 라우트
import { Router, Response } from 'express'
import { prisma } from '../db/prisma'
import { authenticateToken, requireTier, AuthRequest } from '../middleware/auth'

const router = Router()

// 공개 템플릿 목록 조회 (인증 불필요)
router.get('/public', async (req, res: Response) => {
  try {
    const { category, search, page = '1', limit = '100' } = req.query

    console.log('[Templates API] 공개 템플릿 조회 요청:', { category, search, page, limit })

    const where: any = {
      isPublic: true,
    }

    if (category && category !== 'all') {
      where.category = category
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

    // 전체 템플릿 수 확인 (디버깅용)
    const allTemplatesCount = await prisma.template.count({})
    const publicTemplatesCount = await prisma.template.count({ where: { isPublic: true } })
    console.log('[Templates API] 전체 템플릿 수:', allTemplatesCount)
    console.log('[Templates API] 공개 템플릿 수:', publicTemplatesCount)
    console.log('[Templates API] 쿼리 조건:', JSON.stringify(where, null, 2))

    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: [
          { isPremium: 'desc' }, // 프리미엄 우선
          { usageCount: 'desc' }, // 사용 횟수 순
          { createdAt: 'desc' }, // 최신순
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

    console.log('[Templates API] 조회된 템플릿 수:', templates.length, '/ 총:', total)
    if (templates.length > 0) {
      console.log('[Templates API] 첫 번째 템플릿 샘플:', {
        id: templates[0].id,
        name: templates[0].name,
        category: templates[0].category,
        isPublic: '확인됨 (where 조건)'
      })
    }

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
    console.error('[Templates API] 템플릿 목록 조회 오류:', error)
    console.error('[Templates API] 에러 스택:', error.stack)
    res.status(500).json({ 
      error: '템플릿 목록을 가져오는데 실패했습니다',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
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

// 템플릿 적용 (변수 치환) - 공개 템플릿은 인증 불필요
router.post('/:id/apply', async (req, res: Response) => {
  try {
    const { variables } = req.body
    
    console.log('[Templates API] 템플릿 적용 요청:', { id: req.params.id, variables: Object.keys(variables || {}) })
    
    const template = await prisma.template.findFirst({
      where: {
        id: req.params.id,
        isPublic: true,
      },
    })

    if (!template) {
      console.error('[Templates API] 템플릿을 찾을 수 없음:', req.params.id)
      res.status(404).json({ error: '템플릿을 찾을 수 없습니다' })
      return
    }

    // 프리미엄 템플릿인 경우 인증 확인
    if (template.isPremium && template.tierRequired !== 'FREE') {
      // 인증 토큰 확인
      const token = req.headers.authorization?.replace('Bearer ', '')
      if (!token) {
        res.status(401).json({ error: '프리미엄 템플릿은 로그인이 필요합니다' })
        return
      }
      
      try {
        const jwt = require('jsonwebtoken')
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
        })
      
        if (!user || user.tier === 'FREE') {
          res.status(403).json({ error: '프리미엄 템플릿은 구독이 필요합니다' })
          return
        }
      } catch (jwtError) {
        res.status(401).json({ error: '인증 토큰이 유효하지 않습니다' })
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
      Object.entries(variables || {}).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
        sectionContent = sectionContent.replace(regex, value as string)
      })
      prompt += `\n\n## ${section.title}\n${sectionContent}`
    })

    console.log('[Templates API] 템플릿 적용 성공:', { templateId: template.id, promptLength: prompt.length })

    // 사용 통계는 복사 시에만 업데이트 (recordUsage API에서 처리)
    // 템플릿 적용 시에는 업데이트하지 않음

    // Analytics 이벤트 기록 (인증된 사용자인 경우만)
    try {
      const token = req.headers.authorization?.replace('Bearer ', '')
      if (token) {
        const jwt = require('jsonwebtoken')
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
          await prisma.analytics.create({
            data: {
              userId: decoded.id,
              eventType: 'TEMPLATE_USED',
              eventData: {
                templateId: template.id,
                templateName: template.name,
                variables,
              },
            },
          })
        } catch (jwtError) {
          // 인증 실패해도 템플릿 적용은 계속 진행
          console.warn('[Templates API] Analytics 기록 실패 (인증 오류):', jwtError)
        }
      }
    } catch (analyticsError) {
      // Analytics 기록 실패해도 템플릿 적용은 계속 진행
      console.warn('[Templates API] Analytics 기록 실패:', analyticsError)
    }

    res.json({ prompt })
  } catch (error: any) {
    console.error('템플릿 적용 오류:', error)
    res.status(500).json({ error: '템플릿 적용에 실패했습니다' })
  }
})

export default router

