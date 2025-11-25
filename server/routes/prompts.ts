// 프롬프트 관련 API 라우트
import { Router, Response } from 'express'
import { prisma } from '../db/prisma'
import { authenticateToken, requireTier, AuthRequest } from '../middleware/auth'

const router = Router()

// 모든 프롬프트 라우트는 인증 필요
router.use(authenticateToken)

// 프롬프트 목록 조회
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

// 프롬프트 상세 조회
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prompt = await prisma.prompt.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
        deletedAt: null,
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
router.post('/', async (req: AuthRequest, res: Response) => {
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
          options: existingPrompt.options,
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

    const prompt = await prisma.prompt.update({
      where: { id: req.params.id },
      data: {
        title,
        content,
        options,
        folderId,
        versionNumber: content && content !== existingPrompt.content 
          ? existingPrompt.versionNumber + 1 
          : existingPrompt.versionNumber,
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
      },
    })

    res.json(prompt)
  } catch (error: any) {
    console.error('프롬프트 수정 오류:', error)
    res.status(500).json({ error: '프롬프트 수정에 실패했습니다' })
  }
})

// 프롬프트 삭제 (소프트 삭제)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prompt = await prisma.prompt.update({
      where: {
        id: req.params.id,
        userId: req.user!.id,
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

