// Express 서버 - 프롬프트 가이드 수집 API + 프리미엄 기능 API

require('dotenv').config()
const express = require('express')
const cors = require('cors')
const cron = require('node-cron')
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const { GoogleGenerativeAI } = require('@google/generative-ai')
const { collectAllGuides } = require('./scraper/guideScraper')
const { initializeScheduler } = require('./scheduler/guideScheduler')

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GEMINI_APIKEY || ''
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

// Google Generative AI 클라이언트 초기화
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_SUMMARIZE_MODEL = process.env.OPENAI_SUMMARIZE_MODEL || 'gpt-4o-mini'

// 로그 경로 설정
const LOG_DIR = path.resolve(__dirname, '..', 'logs')
const TRANSLATION_LOG_PATH = path.join(LOG_DIR, 'translation.log')

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

function logTranslationEvent(event) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...event,
  })
  fs.appendFile(TRANSLATION_LOG_PATH, `${entry}\n`, (err) => {
    if (err) {
      console.error('번역 로그 기록 실패:', err.message)
    }
  })
}

async function summarizeWithLLM(text, context = 'general') {
  if (!OPENAI_API_KEY || !text) {
    return text
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: OPENAI_SUMMARIZE_MODEL,
        temperature: 0.2,
        max_tokens: 320,
        messages: [
          {
            role: 'system',
            content:
              'You are a prompt compression assistant. Keep instructions intact, compress to concise native English under 120 tokens. Maintain key requirements, CTA, and structure. Output plain text only.',
          },
          {
            role: 'user',
            content: `Context: ${context}\nCompress the following prompt while keeping essential intent and instructions:\n${text}`,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    )

    const content = response.data?.choices?.[0]?.message?.content?.trim()
    return content || text
  } catch (error) {
    console.error('LLM summarize error:', error.response?.data || error.message)
    return text
  }
}

async function translateWithGemini(text, context = 'general', compress = false) {
  if (!genAI) {
    throw new Error('Gemini API 키가 설정되지 않았습니다.')
  }
  if (!text) return ''

  const instructions = [
    'You are a senior localization specialist.',
    'Translate the following content into natural, professional English suited for prompt engineering.',
    'Preserve structure, bullet points, placeholders, and instructions.',
  ]

  if (compress) {
    instructions.push('Keep the translation concise (≤120 tokens) while retaining CTAs and requirements.')
  }

  const prompt = `${instructions.join(' ')}\nContext: ${context}\n\nText:\n${text}`

  try {
    // Google Generative AI SDK 사용 (gemini-2.5-flash)
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })
    
    const generationConfig = {
      temperature: 0.2,
      maxOutputTokens: compress ? 320 : 512,
    }

    const result = await model.generateContent(prompt, {
      generationConfig,
    })

    const response = await result.response
    const translated = response.text().trim()
    
    if (!translated) {
      throw new Error('Gemini 번역 응답이 비어 있습니다.')
    }
    
    return translated
  } catch (error) {
    console.error('Gemini API 호출 오류:', error)
    throw error
  }
}

// Import new routes
const promptsRouter = require('./routes/prompts')

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
// CORS 설정: 허용된 도메인 목록
const getAllowedOrigins = () => {
  const origins = []
  
  // FRONTEND_URL 환경 변수에서 도메인 추가
  if (process.env.FRONTEND_URL) {
    const urls = process.env.FRONTEND_URL.split(',').map(url => url.trim())
    origins.push(...urls)
  }
  
  // 기본 허용 도메인
  const defaultOrigins = [
    'https://www.allrounder.im',
    'https://allrounder.im',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5174',
  ]
  origins.push(...defaultOrigins)
  
  // Vercel 도메인 패턴 허용 (*.vercel.app)
  // 실제 origin을 확인하여 동적으로 허용
  return origins
}

const corsOptions = {
  origin: function (origin, callback) {
    // Health check나 서버 간 통신은 허용
    if (!origin) {
      return callback(null, true)
    }
    
    const allowedOrigins = getAllowedOrigins()
    
    // 정확히 일치하는 도메인 확인
    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    
    // Vercel 도메인 패턴 확인 (*.vercel.app)
    if (origin.includes('.vercel.app')) {
      console.log(`[CORS] Vercel 도메인 허용: ${origin}`)
      return callback(null, true)
    }
    
    // 개발 환경에서는 모든 도메인 허용
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[CORS] 개발 환경 - 모든 도메인 허용: ${origin}`)
      return callback(null, true)
    }
    
    // 프로덕션에서 허용되지 않은 도메인
    console.warn(`[CORS] 차단된 origin: ${origin}`)
    console.log(`[CORS] 허용된 도메인 목록:`, allowedOrigins)
    callback(new Error('CORS 정책에 의해 차단되었습니다'))
  },
  credentials: true,
  optionsSuccessStatus: 200
}
app.use(cors(corsOptions))
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Gemini 기반 번역 프록시
app.post('/api/translate', async (req, res) => {
  const { texts, targetLang = 'EN-US', sourceLang, compress = false, context = 'general' } = req.body || {}
  if (!Array.isArray(texts) || texts.length === 0) {
    return res.status(400).json({ error: 'texts 배열을 전달해주세요.' })
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API 키가 설정되지 않았습니다.' })
  }

  const startTime = Date.now()
  const charCount = texts.reduce((sum, text) => sum + (typeof text === 'string' ? text.length : 0), 0)
  logTranslationEvent({
    type: 'request',
    ip: req.ip,
    textCount: texts.length,
    charCount,
    targetLang,
    sourceLang: sourceLang || 'auto',
    compress,
    context,
  })

  try {
    let translations = []
    for (const text of texts) {
      if (typeof text === 'string') {
        const translated = await translateWithGemini(text, context, compress)
        translations.push(translated)
      } else {
        translations.push('')
      }
    }

    let llmDurationMs = 0

    if (compress && OPENAI_API_KEY) {
      const llmStart = Date.now()
      translations = await Promise.all(translations.map((text) => summarizeWithLLM(text, context)))
      llmDurationMs = Date.now() - llmStart
    }

    logTranslationEvent({
      type: 'success',
      ip: req.ip,
      textCount: texts.length,
      charCount,
      targetLang,
      durationMs: Date.now() - startTime,
      compressApplied: compress && !!OPENAI_API_KEY,
      llmDurationMs,
    })

    res.json({
      translations,
      metadata: {
        durationMs: Date.now() - startTime,
        llmDurationMs,
        compressApplied: compress && !!OPENAI_API_KEY,
        context,
      },
    })
  } catch (error) {
    const status = error.response?.status || 500
    const detail = error.response?.data || error.message

    logTranslationEvent({
      type: 'error',
      ip: req.ip,
      textCount: texts.length,
      charCount,
      targetLang,
      durationMs: Date.now() - startTime,
      status,
      detail,
      compress,
    })

    console.error('Gemini translation error:', detail)
    res.status(status).json({
      error: '번역 요청에 실패했습니다.',
      detail,
    })
  }
})

// 백그라운드 작업 큐
const { createJob, getJob, updateJob, updateJobProgress, completeJob, cancelJob, JOB_STATUS } = require('./utils/jobQueue')

// 가이드 수집 작업 처리 (백그라운드)
async function processCollectionJob(jobId, modelNames = null) {
  const job = getJob(jobId)
  if (!job) {
    console.error(`작업 ${jobId}를 찾을 수 없습니다`)
    return
  }
  
  try {
    updateJob(jobId, {
      status: JOB_STATUS.RUNNING,
      startedAt: Date.now(),
    })
    
    // 진행 상황 콜백
    const onProgress = (progress) => {
      updateJobProgress(jobId, {
        total: progress.total,
        completed: progress.completed,
        current: progress.current,
      })
    }
    
    // 가이드 수집 실행
    const results = await collectAllGuides(modelNames, onProgress)
    
    // 결과 요약
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length
    
    console.log(`[작업 ${jobId}] 수집 완료: 성공 ${successCount}개, 실패 ${failCount}개`)
    
    // 작업 완료
    completeJob(jobId, {
      results,
      summary: {
        total: results.length,
        success: successCount,
        failed: failCount,
      },
    })
  } catch (error) {
    console.error(`[작업 ${jobId}] 수집 중 오류:`, error)
    completeJob(jobId, null, error.message)
  }
}

// 가이드 수집 API (백그라운드 작업)
app.post('/api/guides/collect', async (req, res) => {
  try {
    const { models } = req.body || {}
    const modelNames = models && Array.isArray(models) ? models : null
    
    // 작업 생성
    const job = createJob('collect', { models: modelNames })
    
    // 백그라운드에서 작업 시작 (비동기)
    processCollectionJob(job.id, modelNames).catch(err => {
      console.error(`작업 ${job.id} 실행 중 오류:`, err)
    })
    
    console.log(`가이드 수집 작업 생성: ${job.id}`)
    
    // 즉시 응답
    res.json({
      success: true,
      jobId: job.id,
      message: '수집 작업이 시작되었습니다',
      statusUrl: `/api/guides/jobs/${job.id}`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('가이드 수집 요청 오류:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    })
  }
})

// 작업 상태 조회 API
app.get('/api/guides/jobs/:jobId', (req, res) => {
  const { jobId } = req.params
  const job = getJob(jobId)
  
  if (!job) {
    return res.status(404).json({
      success: false,
      error: '작업을 찾을 수 없습니다',
    })
  }
  
  res.json({
    success: true,
    job: {
      id: job.id,
      type: job.type,
      status: job.status,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      progress: job.progress,
      results: job.results,
      error: job.error,
    },
  })
})

// 실시간 진행 상황 스트림 (Server-Sent Events)
app.get('/api/guides/jobs/:jobId/progress', (req, res) => {
  const { jobId } = req.params
  const job = getJob(jobId)
  
  if (!job) {
    return res.status(404).json({
      success: false,
      error: '작업을 찾을 수 없습니다',
    })
  }
  
  // SSE 헤더 설정
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // Nginx 버퍼링 비활성화
  
  // 초기 상태 전송
  const sendProgress = () => {
    const currentJob = getJob(jobId)
    if (!currentJob) {
      res.write(`data: ${JSON.stringify({ error: '작업을 찾을 수 없습니다' })}\n\n`)
      res.end()
      return
    }
    
    const progress = {
      id: currentJob.id,
      status: currentJob.status,
      progress: currentJob.progress,
      startedAt: currentJob.startedAt,
      completedAt: currentJob.completedAt,
      error: currentJob.error,
    }
    
    res.write(`data: ${JSON.stringify(progress)}\n\n`)
    
    // 작업이 완료되면 연결 종료
    if (currentJob.status === JOB_STATUS.COMPLETED || 
        currentJob.status === JOB_STATUS.FAILED ||
        currentJob.status === JOB_STATUS.CANCELLED) {
      // 최종 결과 포함하여 전송
      res.write(`data: ${JSON.stringify({
        ...progress,
        results: currentJob.results,
      })}\n\n`)
      res.end()
      return
    }
  }
  
  // 즉시 초기 상태 전송
  sendProgress()
  
  // 주기적으로 상태 확인 (1초마다)
  const interval = setInterval(() => {
    const currentJob = getJob(jobId)
    if (!currentJob) {
      clearInterval(interval)
      res.end()
      return
    }
    
    sendProgress()
    
    // 작업이 완료되면 인터벌 정리
    if (currentJob.status === JOB_STATUS.COMPLETED || 
        currentJob.status === JOB_STATUS.FAILED ||
        currentJob.status === JOB_STATUS.CANCELLED) {
      clearInterval(interval)
    }
  }, 1000)
  
  // 클라이언트 연결 종료 시 정리
  req.on('close', () => {
    clearInterval(interval)
    res.end()
  })
})

// 작업 취소 API
app.post('/api/guides/jobs/:jobId/cancel', (req, res) => {
  const { jobId } = req.params
  const job = cancelJob(jobId)
  
  if (!job) {
    return res.status(404).json({
      success: false,
      error: '작업을 찾을 수 없거나 취소할 수 없습니다',
    })
  }
  
  res.json({
    success: true,
    message: '작업이 취소되었습니다',
    job: {
      id: job.id,
      status: job.status,
    },
  })
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

