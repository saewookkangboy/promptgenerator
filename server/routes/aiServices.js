/**
 * AI 서비스 정보 API 라우트
 */

const express = require('express')
const router = express.Router()
const { prisma } = require('../db/prisma')

/**
 * GET /api/ai-services
 * 활성화된 AI 서비스 목록 조회
 */
router.get('/', async (req, res) => {
  try {
    const { category, status } = req.query

    const where = {
      isActive: true,
    }

    if (category) {
      where.category = category.toUpperCase()
    }

    if (status) {
      where.apiStatus = status.toUpperCase()
    }

    const services = await prisma.aIService.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { serviceName: 'asc' },
      ],
    })

    res.json({
      success: true,
      data: services,
      count: services.length,
    })
  } catch (error) {
    console.error('AI 서비스 조회 오류:', error)
    res.status(500).json({
      success: false,
      error: '서비스 목록을 불러오는데 실패했습니다.',
    })
  }
})

/**
 * GET /api/ai-services/:id
 * 특정 서비스 상세 정보 조회
 */
router.get('/:id', async (req, res) => {
  try {
    const service = await prisma.aIService.findUnique({
      where: { id: req.params.id },
    })

    if (!service) {
      return res.status(404).json({
        success: false,
        error: '서비스를 찾을 수 없습니다.',
      })
    }

    res.json({
      success: true,
      data: service,
    })
  } catch (error) {
    console.error('AI 서비스 상세 조회 오류:', error)
    res.status(500).json({
      success: false,
      error: '서비스 정보를 불러오는데 실패했습니다.',
    })
  }
})

/**
 * GET /api/ai-services/category/:category
 * 카테고리별 서비스 목록 조회
 */
router.get('/category/:category', async (req, res) => {
  try {
    const category = req.params.category.toUpperCase()

    if (!['IMAGE', 'VIDEO'].includes(category)) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 카테고리입니다. (IMAGE 또는 VIDEO)',
      })
    }

    const services = await prisma.aIService.findMany({
      where: {
        category,
        isActive: true,
      },
      orderBy: {
        serviceName: 'asc',
      },
    })

    res.json({
      success: true,
      data: services,
      count: services.length,
    })
  } catch (error) {
    console.error('카테고리별 서비스 조회 오류:', error)
    res.status(500).json({
      success: false,
      error: '서비스 목록을 불러오는데 실패했습니다.',
    })
  }
})

module.exports = router

