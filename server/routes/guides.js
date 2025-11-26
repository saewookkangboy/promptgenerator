const express = require('express')
const { prisma } = require('../db/prisma.js')

const router = express.Router()

function serializeGuide(record) {
  if (!record) return null
  const toMs = (value) => (value ? new Date(value).getTime() : null)
  return {
    id: record.id,
    modelName: record.modelName,
    category: record.category?.toLowerCase() || 'llm',
    version: `v${record.version}`,
    title: record.title,
    description: record.description || '',
    lastUpdated: toMs(record.updatedAt) || Date.now(),
    source:
      record.metadata?.source ||
      record.sources?.[0]?.url ||
      record.sources?.[0]?.metadata?.url ||
      'unknown',
    content: {
      bestPractices: Array.isArray(record.bestPractices) ? record.bestPractices : [],
      promptStructure: record.promptStructure || '',
      examples: Array.isArray(record.examples) ? record.examples : [],
      parameters: record.parameters || {},
      tips: Array.isArray(record.tips) ? record.tips : [],
      commonMistakes: record.metadata?.commonMistakes || [],
      styleGuide: record.metadata?.styleGuide || '',
    },
    metadata: {
      collectedAt: toMs(record.collectedAt) || Date.now(),
      collectedBy: record.collectedBy?.toLowerCase() || 'scraper',
      confidence: record.confidence,
      validation: record.metadata?.validation || {},
      appliedToService: record.appliedToService,
      appliedAt: toMs(record.appliedAt),
      sources: (record.sources || []).map((source) => ({
        id: source.id,
        url: source.url,
        query: source.query,
        type: source.type,
        status: source.status,
        fetchedAt: toMs(source.fetchedAt),
        metadata: source.metadata || {},
      })),
    },
  }
}

router.get('/latest', async (req, res) => {
  const { modelName, category, limit = '50' } = req.query

  try {
    const where = {}
    if (modelName) {
      where.modelName = modelName
    }
    if (category) {
      where.category = category.toString().toUpperCase()
    }

    const rawGuides = await prisma.promptGuide.findMany({
      where,
      include: {
        sources: {
          orderBy: { fetchedAt: 'desc' },
          take: 3,
        },
      },
      orderBy: [
        { modelName: 'asc' },
        { version: 'desc' },
      ],
      take: Math.max(parseInt(limit, 10) || 50, 10),
    })

    const latestMap = new Map()
    rawGuides.forEach((guide) => {
      if (!latestMap.has(guide.modelName)) {
        latestMap.set(guide.modelName, guide)
      }
    })

    const latestGuides = Array.from(latestMap.values()).map(serializeGuide)

    res.json({
      success: true,
      guides: latestGuides,
      stats: {
        totalModels: latestGuides.length,
        lastUpdatedAt: latestGuides.reduce(
          (max, guide) => Math.max(max, guide?.lastUpdated || 0),
          0
        ),
      },
    })
  } catch (error) {
    console.error('[Guides API] 최신 가이드 조회 실패:', error)
    res.status(500).json({
      success: false,
      error: '최신 가이드를 불러오지 못했습니다.',
    })
  }
})

router.get('/:modelName/history', async (req, res) => {
  const { modelName } = req.params
  const { limit = '20' } = req.query

  try {
    const guides = await prisma.promptGuide.findMany({
      where: { modelName },
      include: {
        sources: {
          orderBy: { fetchedAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { version: 'desc' },
      take: Math.max(parseInt(limit, 10) || 20, 5),
    })

    res.json({
      success: true,
      guides: guides.map(serializeGuide),
    })
  } catch (error) {
    console.error('[Guides API] 히스토리 조회 실패:', error)
    res.status(500).json({
      success: false,
      error: '가이드 히스토리를 불러오지 못했습니다.',
    })
  }
})

router.post('/:guideId/apply', async (req, res) => {
  const { guideId } = req.params
  const { applied = true } = req.body || {}

  try {
    const guide = await prisma.promptGuide.update({
      where: { id: guideId },
      data: {
        appliedToService: !!applied,
        appliedAt: applied ? new Date() : null,
      },
      include: {
        sources: {
          orderBy: { fetchedAt: 'desc' },
          take: 3,
        },
      },
    })

    res.json({
      success: true,
      guide: serializeGuide(guide),
    })
  } catch (error) {
    console.error('[Guides API] 적용 상태 업데이트 실패:', error)
    res.status(500).json({
      success: false,
      error: '적용 상태를 변경하지 못했습니다.',
    })
  }
})

module.exports = router

