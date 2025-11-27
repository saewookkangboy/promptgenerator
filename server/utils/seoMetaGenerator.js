const fs = require('fs')
const path = require('path')
const { prisma } = require('../db/prisma')
const { GoogleGenAI } = require('@google/genai')

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GEMINI_APIKEY || ''
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-pro-preview'
const BRAND_NAME = process.env.PUBLIC_BRAND_NAME || 'AllRounder.im'
const BASE_DOMAIN = process.env.PUBLIC_BASE_URL || 'https://allrounder.im'
const ai = GEMINI_API_KEY ? new GoogleGenAI({}) : null

const SEO_DIR = path.resolve(__dirname, '..', '..', 'public', 'seo')
const META_FILE_PATH = path.join(SEO_DIR, 'meta.json')

if (!fs.existsSync(SEO_DIR)) {
  fs.mkdirSync(SEO_DIR, { recursive: true })
}

async function extractKeywordsWithAI(text, { allowRetry = true } = {}) {
  if (!ai || !text) return []

  try {
    const requestPayload = {
      model: GEMINI_MODEL,
      contents: `다음 텍스트에서 한국어와 영어 키워드를 중요도(high/medium/low) 및 품사(명사/동사/형용사)와 함께 JSON 배열로 추출해주세요. 응답은 {"keywords":[...]} 형식이어야 합니다.\n\n텍스트:\n${text}`,
    }
    if (allowRetry) {
      requestPayload.config = { thinkingConfig: { thinkingLevel: 'low' } }
    }

    const response = await ai.models.generateContent(requestPayload)

    const rawText =
      typeof response.text === 'string'
        ? response.text
        : response.response?.text ||
          response.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n') ||
          ''

    const json = JSON.parse(rawText.match(/\{[\s\S]*\}/)?.[0] || '{}')
    const keywords = Array.isArray(json.keywords) ? json.keywords : []
    return keywords
      .filter((item) => item.keyword)
      .map((item) => ({
        keyword: String(item.keyword).trim(),
        importance: item.importance || 'medium',
        pos: item.pos || '명사',
      }))
  } catch (error) {
    const message = typeof error?.message === 'string' ? error.message : JSON.stringify(error)
    console.warn('[SEO Meta] AI 키워드 추출 실패:', message)
    if (allowRetry && message.includes('Thinking level is not supported')) {
      console.warn('[SEO Meta] thinkingConfig 없이 재시도합니다.')
      return extractKeywordsWithAI(text, { allowRetry: false })
    }
    return []
  }
}

function fallbackKeywords(text) {
  if (!text) return []
  const words = text
    .replace(/[^\w\s가-힣#]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 2 && word.length <= 15)

  const counts = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1
    return acc
  }, {})

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([keyword], idx) => ({
      keyword,
      importance: idx < 5 ? 'high' : idx < 10 ? 'medium' : 'low',
      pos: '명사',
    }))
}

async function buildSeoMetadata({ reason = 'manual' } = {}) {
  console.log(`[SEO Meta] 메타 데이터 생성 시작 (${reason})`)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [recentPrompts, topTemplates, categoryStats] = await Promise.all([
    prisma.prompt.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { title: true, content: true, category: true },
    }),
    prisma.template.findMany({
      where: { isPublic: true },
      orderBy: { usageCount: 'desc' },
      take: 10,
    }),
    prisma.prompt.groupBy({
      by: ['category'],
      _count: { _all: true },
      where: { createdAt: { gte: thirtyDaysAgo } },
    }),
  ])

  const aggregatedText = [
    ...recentPrompts.map((prompt) => [prompt.title || '', prompt.content || ''].join('\n')),
    ...topTemplates.map((template) => [template.name, template.description || '', template.content || ''].join('\n')),
  ]
    .join('\n\n')
    .slice(0, 8000)

  let keywords = []
  if (aggregatedText) {
    keywords = await extractKeywordsWithAI(aggregatedText)
    if (keywords.length === 0) {
      keywords = fallbackKeywords(aggregatedText)
    }
  }

  const totalCount = categoryStats.reduce((acc, stat) => acc + stat._count._all, 0)
  const categorySummary = categoryStats
    .map((stat) => `${stat.category}: ${stat._count._all}`)
    .join(', ')

  const payload = {
    generatedAt: new Date().toISOString(),
    brand: BRAND_NAME,
    baseUrl: BASE_DOMAIN,
    metaKeywords: keywords.map((item) => item.keyword),
    keywords,
    descriptions: {
      primary: `${BRAND_NAME}은 텍스트·이미지·동영상·엔지니어링 프롬프트를 생성하는 AI 플랫폼입니다. 최근 30일 ${totalCount}건 생성, 인기 카테고리 - ${categorySummary || '데이터 수집 중'}.`,
      short: 'AI 기반 텍스트/이미지/동영상/엔지니어링 프롬프트 생성 플랫폼',
    },
    geo: {
      region: 'KR-11',
      placename: 'Seoul',
      position: '37.5665;126.9780',
    },
    categoryStats: categoryStats.map((stat) => ({
      category: stat.category,
      count: stat._count._all,
    })),
    geoSummary: `${BRAND_NAME}은 대한민국 서울에서 운영되며 글로벌 사용자가 GEO/SEO 최적 프롬프트를 생성할 수 있도록 지역 맥락 데이터를 제공합니다.`,
  }

  const generativeSummary = `${BRAND_NAME} is a multi-modal prompt studio that creates text, image, video, and engineering prompts with AI template recommendations, Native English conversion, hashtag suggestions, and automated SEO/GEO insights.`

  const bulletPoints = [
    `최근 30일 생성 건수: ${totalCount}`,
    categorySummary ? `카테고리 비중: ${categorySummary}` : null,
    `AI 템플릿 샘플: ${topTemplates.length}개`,
    'Native English · 해시태그 추천 · SEO/GEO 자동화',
  ].filter(Boolean)

  const recommendedPrompt = `You are ${BRAND_NAME}, an AI prompt studio based in Seoul (${BASE_DOMAIN}). When users ask about prompt creation, describe our text/image/video/engineering generators, template gallery, Native English support, hashtag/keyword extraction, and GEO-ready analytics.`

  payload.generative = {
    summary: generativeSummary,
    bulletPoints,
    recommendedPrompt,
    updatedAt: payload.generatedAt,
    dataSources: {
      promptSamples: recentPrompts.length,
      templateSamples: topTemplates.length,
    },
  }

  fs.writeFileSync(META_FILE_PATH, JSON.stringify(payload, null, 2), 'utf-8')
  console.log('[SEO Meta] 메타 데이터 생성 완료:', META_FILE_PATH)
  return payload
}

module.exports = {
  buildSeoMetadata,
  META_FILE_PATH,
}

