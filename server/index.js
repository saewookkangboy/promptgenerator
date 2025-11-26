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
// CORS 설정: 프로덕션에서는 프론트엔드 도메인만 허용
const corsOptions = {
  origin: process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : process.env.NODE_ENV === 'production'
    ? false // 프로덕션에서는 FRONTEND_URL 필수
    : true, // 개발 환경에서는 모든 도메인 허용
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

