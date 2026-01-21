// 프롬프트 관련 API 라우트
import { Router, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { prisma } from '../db/prisma'
import { authenticateToken, requireTier, AuthRequest } from '../middleware/auth'
import { validatePromptInput } from '../middleware/validation'
import { requireResourcePermission, ResourceType, Permission } from '../middleware/rbac'

const router = Router()

// 공개 프롬프트 생성 엔드포인트 (인증 선택적)
// 인증이 있으면 userId를 포함하고, 없으면 익명 사용자로 저장
router.post('/public', validatePromptInput, async (req: Request, res: Response) => {
  try {
    const {
      title,
      content,
      category,
      model,
      inputText,
      options,
      folderId,
      workspaceId,
      tagIds,
    } = req.body

    // 인증 토큰 확인 (선택적)
    let userId: string | null = null
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
          userId: string
          email: string
        }
        
        // 사용자 정보 확인
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            email: true,
            tier: true,
            subscriptionStatus: true,
          },
        })

        if (user && user.subscriptionStatus === 'ACTIVE') {
          userId = user.id
        }
      } catch (error) {
        // 토큰이 유효하지 않으면 익명 사용자로 처리
        console.log('토큰 검증 실패, 익명 사용자로 저장')
      }
    }

    // 익명 사용자 ID 찾기 또는 생성
    if (!userId) {
      const anonymousUser = await prisma.user.findFirst({
        where: {
          email: 'anonymous@system.local',
        },
      })

      if (anonymousUser) {
        userId = anonymousUser.id
      } else {
        // 익명 사용자 생성
        const newAnonymousUser = await prisma.user.create({
          data: {
            email: 'anonymous@system.local',
            passwordHash: 'anonymous', // 실제로는 사용되지 않음
            name: 'Anonymous User',
            tier: 'FREE',
            subscriptionStatus: 'ACTIVE',
          },
        })
        userId = newAnonymousUser.id
      }
    }

    // 워크스페이스 권한 확인 (userId가 있을 때만)
    if (workspaceId && userId) {
      const workspace = await prisma.workspace.findFirst({
        where: {
          id: workspaceId,
          OR: [
            { ownerId: userId },
            {
              members: {
                some: {
                  userId: userId,
                },
              },
            },
          ],
        },
      })

      if (!workspace) {
        res.status(403).json({ error: '워크스페이스 접근 권한이 없습니다' })
        return
      }
    }

    const prompt = await prisma.prompt.create({
      data: {
        title,
        content,
        category,
        model,
        inputText,
        options: options || {},
        folderId: folderId || null,
        workspaceId: workspaceId || null,
        userId: userId,
        tags: tagIds
          ? {
              create: tagIds.map((tagId: string) => ({
                tag: {
                  connect: { id: tagId },
                },
              })),
            }
          : undefined,
      },
      include: {
        folder: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    })

    res.status(201).json(prompt)
  } catch (error: any) {
    console.error('공개 프롬프트 생성 오류:', error)
    res.status(500).json({ error: '프롬프트 생성에 실패했습니다' })
  }
})

// 모든 프롬프트 라우트는 인증 필요 (공개 엔드포인트 제외)
router.use(authenticateToken)

/**
 * @swagger
 * /api/prompts:
 *   get:
 *     summary: 프롬프트 목록 조회
 *     tags: [Prompts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [text, image, video, engineering]
 *         description: 프롬프트 카테고리
 *       - in: query
 *         name: folderId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 폴더 ID
 *       - in: query
 *         name: tagId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 태그 ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 검색어
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 페이지당 항목 수
 *     responses:
 *       200:
 *         description: 프롬프트 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 prompts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Prompt'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: 인증 필요
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { category, folderId, tagId, search, page = '1', limit = '20' } = req.query

    const where: any = {
      userId: req.user!.id,
      deletedAt: null,
    }

    if (category) {
      where.category = category
    }

    if (folderId) {
      where.folderId = folderId
    }

    if (tagId) {
      where.tags = {
        some: {
          tagId: tagId as string,
        },
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { content: { contains: search as string, mode: 'insensitive' } },
        { inputText: { contains: search as string, mode: 'insensitive' } },
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
          folder: {
            select: {
              id: true,
              name: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.prompt.count({ where }),
    ])

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

// 프롬프트 상세 조회 (읽기 권한 확인)
router.get('/:id', requireResourcePermission(ResourceType.PROMPT, Permission.READ), async (req: AuthRequest, res: Response) => {
  try {
    // RBAC 미들웨어에서 권한 확인 후 실행
    const prompt = await prisma.prompt.findFirst({
      where: {
        id: req.params.id,
        deletedAt: null,
        // RBAC에서 소유자/워크스페이스 권한 확인하므로 여기서는 userId 체크 제거
      },
      include: {
        folder: true,
        tags: {
          include: {
            tag: true,
          },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!prompt) {
      res.status(404).json({ error: '프롬프트를 찾을 수 없습니다' })
      return
    }

    res.json(prompt)
  } catch (error: any) {
    console.error('프롬프트 조회 오류:', error)
    res.status(500).json({ error: '프롬프트를 가져오는데 실패했습니다' })
  }
})

// 프롬프트 생성
router.post('/', validatePromptInput, async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      content,
      category,
      model,
      inputText,
      options,
      folderId,
      workspaceId,
      tagIds,
    } = req.body

    // 워크스페이스 권한 확인 (Tier 2)
    if (workspaceId) {
      const workspace = await prisma.workspace.findFirst({
        where: {
          id: workspaceId,
          OR: [
            { ownerId: req.user!.id },
            {
              members: {
                some: {
                  userId: req.user!.id,
                },
              },
            },
          ],
        },
      })

      if (!workspace) {
        res.status(403).json({ error: '워크스페이스 접근 권한이 없습니다' })
        return
      }
    }

    const prompt = await prisma.prompt.create({
      data: {
        title,
        content,
        category,
        model,
        inputText,
        options: options || {},
        folderId,
        workspaceId,
        userId: req.user!.id,
        tags: tagIds
          ? {
              create: tagIds.map((tagId: string) => ({
                tag: {
                  connect: { id: tagId },
                },
              })),
            }
          : undefined,
      },
      include: {
        folder: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    })

    res.status(201).json(prompt)
  } catch (error: any) {
    console.error('프롬프트 생성 오류:', error)
    res.status(500).json({ error: '프롬프트 생성에 실패했습니다' })
  }
})

// 프롬프트 수정
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, options, folderId, tagIds } = req.body

    // 기존 프롬프트 확인
    const existingPrompt = await prisma.prompt.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
        deletedAt: null,
      },
    })

    if (!existingPrompt) {
      res.status(404).json({ error: '프롬프트를 찾을 수 없습니다' })
      return
    }

    // 버전 생성 (Tier 1)
    if (content && content !== existingPrompt.content) {
      await prisma.promptVersion.create({
        data: {
          promptId: existingPrompt.id,
          versionNumber: existingPrompt.versionNumber + 1,
          content: existingPrompt.content,
          options: existingPrompt.options as Prisma.InputJsonValue,
          createdById: req.user!.id,
        },
      })
    }

    // 태그 업데이트
    if (tagIds) {
      await prisma.promptTagRelation.deleteMany({
        where: { promptId: existingPrompt.id },
      })

      if (tagIds.length > 0) {
        await prisma.promptTagRelation.createMany({
          data: tagIds.map((tagId: string) => ({
            promptId: existingPrompt.id,
            tagId,
          })),
        })
      }
    }

    const updateData: any = {
      title,
      content,
      folderId,
      versionNumber:
        content && content !== existingPrompt.content
          ? existingPrompt.versionNumber + 1
          : existingPrompt.versionNumber,
    }

    if (options !== undefined) {
      updateData.options = options
    }

    const prompt = await prisma.prompt.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        folder: true,
        tags: {
          include: {
            tag: true,
          },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
    })

    res.json(prompt)
  } catch (error: any) {
    console.error('프롬프트 수정 오류:', error)
    res.status(500).json({ error: '프롬프트 수정에 실패했습니다' })
  }
})

// 프롬프트 삭제 (삭제 권한 확인, 소프트 삭제)
router.delete('/:id', requireResourcePermission(ResourceType.PROMPT, Permission.DELETE), async (req: AuthRequest, res: Response) => {
  try {
    // RBAC에서 권한 확인 완료
    const prompt = await prisma.prompt.update({
      where: {
        id: req.params.id,
      },
      data: {
        deletedAt: new Date(),
      },
    })

    res.json({ message: '프롬프트가 삭제되었습니다', prompt })
  } catch (error: any) {
    console.error('프롬프트 삭제 오류:', error)
    res.status(500).json({ error: '프롬프트 삭제에 실패했습니다' })
  }
})

// 프롬프트 버전 목록 조회 (Tier 1)
router.get('/:id/versions', requireTier('BASIC', 'PROFESSIONAL', 'ENTERPRISE'), async (req: AuthRequest, res: Response) => {
  try {
    const versions = await prisma.promptVersion.findMany({
      where: {
        promptId: req.params.id,
        prompt: {
          userId: req.user!.id,
        },
      },
      orderBy: { versionNumber: 'desc' },
    })

    res.json(versions)
  } catch (error: any) {
    console.error('버전 목록 조회 오류:', error)
    res.status(500).json({ error: '버전 목록을 가져오는데 실패했습니다' })
  }
})

export default router

