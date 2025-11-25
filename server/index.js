// Express 서버 - 프롬프트 가이드 수집 API + 프리미엄 기능 API

const express = require('express')
const cors = require('cors')
const cron = require('node-cron')
const { collectAllGuides } = require('./scraper/guideScraper')
const { initializeScheduler } = require('./scheduler/guideScheduler')

// Import new routes
const promptsRouter = require('./routes/prompts')

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 가이드 수집 API
app.post('/api/guides/collect', async (req, res) => {
  try {
    console.log('가이드 수집 요청 받음...')
    const results = await collectAllGuides()
    
    // 결과 요약
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length
    
    console.log(`수집 완료: 성공 ${successCount}개, 실패 ${failCount}개`)
    
    res.json({
      success: true,
      results,
      summary: {
        total: results.length,
        success: successCount,
        failed: failCount,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('가이드 수집 오류:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    })
  }
})

// 특정 모델 가이드 수집
app.post('/api/guides/collect/:modelName', async (req, res) => {
  try {
    const { modelName } = req.params
    const { collectGuideForModel } = require('./scraper/guideScraper')
    const result = await collectGuideForModel(modelName)
    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('가이드 수집 오류:', error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// 수집 상태 조회
app.get('/api/guides/status', (req, res) => {
  const { getCollectionStatus } = require('./scheduler/guideScheduler')
  const status = getCollectionStatus()
  res.json(status)
})

// 프리미엄 기능 API 라우트
try {
  // TypeScript로 컴파일된 JavaScript 파일 사용
  const promptsRouter = require('./routes/routes/prompts')
  const authRouter = require('./routes/routes/auth')
  const usersRouter = require('./routes/routes/users')
  const adminRouter = require('./routes/routes/admin')
  
  app.use('/api/auth', authRouter.default || authRouter)
  app.use('/api/users', usersRouter.default || usersRouter)
  app.use('/api/prompts', promptsRouter.default || promptsRouter)
  app.use('/api/admin', adminRouter.default || adminRouter)
  
  console.log('✅ 프리미엄 기능 API 라우트 로드됨')
} catch (error) {
  console.warn('⚠️  프리미엄 기능 API 라우트 로드 실패 (데이터베이스 미설정 가능):', error.message)
  if (process.env.NODE_ENV === 'development') {
    console.error('상세 오류:', error)
  }
}

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 프롬프트 가이드 수집 서버가 포트 ${PORT}에서 실행 중입니다`)
  
  // 스케줄러 초기화 (매일 새벽 3시에 수집)
  initializeScheduler()
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM 신호 받음. 서버 종료 중...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT 신호 받음. 서버 종료 중...')
  process.exit(0)
})

module.exports = app

