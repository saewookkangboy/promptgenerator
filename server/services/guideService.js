const crypto = require('crypto')
const { prisma } = require('../db/prisma.js')
const { getGuideCategoryFromModel } = require('../utils/guideCategories')

function normalizeCategory(category, modelName) {
  if (!category) {
    return getGuideCategoryFromModel(modelName)
  }
  const value = String(category).toUpperCase()
  if (['LLM', 'IMAGE', 'VIDEO'].includes(value)) {
    return value
  }
  return 'OTHER'
}

async function upsertGuideRecord({ modelName, guide, category, sources = [] }) {
  if (!guide) return null

  const payload = {
    title: guide.title || `${modelName} guide`,
    description: guide.description || '',
    content: guide.content || {},
  }

  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex')

  const existing = await prisma.promptGuide.findFirst({
    where: {
      modelName,
      contentHash: hash,
    },
    orderBy: { version: 'desc' },
  })

  if (existing) {
    return existing
  }

  const aggregate = await prisma.promptGuide.aggregate({
    where: { modelName },
    _max: { version: true },
  })
  const nextVersion = (aggregate._max.version || 0) + 1

  const bestPractices = guide.content?.bestPractices || []
  const tips = guide.content?.tips || []
  const examples = guide.content?.examples || []
  const parameters = guide.content?.parameters || {}
  const styleGuide = guide.content?.styleGuide || null

  const created = await prisma.promptGuide.create({
    data: {
      modelName,
      category: normalizeCategory(category || guide.category, modelName),
      version: nextVersion,
      title: payload.title,
      description: payload.description,
      summary: guide.summary || null,
      bestPractices,
      tips,
      examples,
      parameters,
      styleGuide,
      metadata: guide.metadata || {},
      confidence: Number(guide.metadata?.confidence ?? guide.confidence ?? 0.5),
      sourcePrimary: guide.source || guide.sourcePrimary || null,
      contentHash: hash,
      sources: sources.length
        ? {
            create: sources
              .filter((src) => src?.url)
              .map((src) => ({
                url: src.url,
                sourceType: (src.sourceType || 'STATIC').toUpperCase(),
                searchQuery: src.searchQuery || null,
                metadata: src.metadata || {},
              })),
          }
        : undefined,
    },
  })

  return created
}

async function persistGuideCollectionResults(jobId, payload = {}) {
  if (!jobId) return null

  const {
    summary = {},
    results = [],
    triggeredBy = 'system',
    triggerType = 'manual',
    models = [],
  } = payload

  const totalSuccess = summary.success ?? results.filter((r) => r.success).length
  const totalFailed = summary.failed ?? results.filter((r) => !r.success).length
  const totalModels = summary.total ?? results.length

  const jobRecord = await prisma.guideCollectionJob.upsert({
    where: { id: jobId },
    update: {
      status: summary.status || 'COMPLETED',
      totalModels,
      successCount: totalSuccess,
      failCount: totalFailed,
      models,
      errorMessage: summary.error || null,
      completedAt: new Date(),
    },
    create: {
      id: jobId,
      status: summary.status || 'COMPLETED',
      triggerType,
      triggeredBy,
      totalModels,
      successCount: totalSuccess,
      failCount: totalFailed,
      models,
      errorMessage: summary.error || null,
    },
  })

  const savedResults = []
  for (const result of results) {
    let guideRecord = null
    if (result.success && result.guide) {
      const sourceEntries = []
      if (Array.isArray(result.results)) {
        result.results.forEach((entry) => {
          if (entry?.source) {
            sourceEntries.push({
              url: entry.source,
              sourceType: entry.searchQuery ? 'SEARCH' : 'STATIC',
              searchQuery: entry.searchQuery || null,
              metadata: {
                status: entry.success,
                error: entry.error || null,
              },
            })
          }
        })
      }
      guideRecord = await upsertGuideRecord({
        modelName: result.modelName,
        guide: result.guide,
        category: result.guide.category,
        sources: sourceEntries,
      })
    }

    const history = await prisma.guideCollectionResult.create({
      data: {
        jobId: jobRecord.id,
        modelName: result.modelName,
        success: !!result.success,
        guideId: guideRecord?.id,
        errorMessage: result.error || null,
        metrics: {
          validation: result.validation || null,
          stats: result.stats || null,
        },
      },
      include: {
        guide: true,
      },
    })

    savedResults.push(history)
  }

  return {
    job: jobRecord,
    results: savedResults,
  }
}

async function getLatestGuidesFromDB(options = {}) {
  const { category, limit = 50, includeInactive = false } = options

  const where = {}
  if (category) {
    where.category = normalizeCategory(category, '')
  }
  if (!includeInactive) {
    where.status = { in: ['ACTIVE', 'STALE'] }
  }

  const guides = await prisma.promptGuide.findMany({
    where,
    orderBy: [
      { modelName: 'asc' },
      { version: 'desc' },
    ],
    distinct: ['modelName'],
    take: limit,
  })

  return guides
}

async function getGuideHistoryFromDB(limit = 30) {
  return prisma.guideCollectionResult.findMany({
    take: limit,
    orderBy: {
      completedAt: 'desc',
    },
    include: {
      guide: true,
      job: true,
    },
  })
}

async function getGuideByModel(modelName) {
  if (!modelName) return null
  return prisma.promptGuide.findFirst({
    where: { modelName },
    orderBy: { version: 'desc' },
  })
}

function sanitizeGuide(guide) {
  if (!guide) return null
  return {
    id: guide.id,
    modelName: guide.modelName,
    category: guide.category,
    version: guide.version,
    title: guide.title,
    description: guide.description,
    summary: guide.summary,
    bestPractices: guide.bestPractices || [],
    tips: guide.tips || [],
    examples: guide.examples || [],
    parameters: guide.parameters || {},
    styleGuide: guide.styleGuide || null,
    metadata: guide.metadata || {},
    confidence: guide.confidence,
    sourcePrimary: guide.sourcePrimary,
    updatedAt: guide.updatedAt,
  }
}

module.exports = {
  upsertGuideRecord,
  persistGuideCollectionResults,
  getLatestGuidesFromDB,
  getGuideHistoryFromDB,
  getGuideByModel,
  sanitizeGuide,
}

