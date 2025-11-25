// 프롬프트 가이드 웹 스크래퍼

const axios = require('axios')
const cheerio = require('cheerio')

// 수집 소스 정의
const COLLECTION_SOURCES = {
  'openai-gpt-4': [
    'https://platform.openai.com/docs/guides/prompt-engineering',
    'https://platform.openai.com/docs/api-reference/chat',
  ],
  'openai-gpt-3.5': [
    'https://platform.openai.com/docs/guides/prompt-engineering',
  ],
  'claude-3': [
    'https://docs.anthropic.com/claude/docs',
  ],
  'claude-3.5': [
    'https://docs.anthropic.com/claude/docs',
  ],
  'gemini-pro': [
    'https://ai.google.dev/docs/prompt_intro',
  ],
  'gemini-ultra': [
    'https://ai.google.dev/docs/prompt_intro',
  ],
  'gemini-nano-banana-pro': [
    'https://ai.google.dev/docs',
  ],
  'midjourney': [
    'https://docs.midjourney.com/docs',
  ],
  'dalle-3': [
    'https://platform.openai.com/docs/guides/images',
  ],
  'stable-diffusion': [
    'https://stability.ai/docs',
  ],
  'sora': [
    'https://openai.com/research/video-generation-models-as-world-simulators',
  ],
  'veo-3': [
    'https://deepmind.google/technologies/veo/',
  ],
  'llama-3': [
    'https://llama.meta.com/docs',
  ],
  'llama-3.1': [
    'https://llama.meta.com/docs',
  ],
}

// User-Agent 설정 (봇 차단 방지)
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// HTTP 요청 헤더
const getHeaders = () => ({
  'User-Agent': USER_AGENT,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
})

// 웹 페이지에서 가이드 정보 추출
async function scrapeGuideFromURL(url, modelName) {
  try {
    console.log(`스크래핑 중: ${url}`)
    
    const response = await axios.get(url, {
      headers: getHeaders(),
      timeout: 30000, // 30초 타임아웃
      maxRedirects: 5,
    })
    
    const $ = cheerio.load(response.data)
    
    // 제목 추출
    const title = $('title').text() || $('h1').first().text() || `${modelName} 가이드`
    
    // 메타 설명 추출
    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || 
                       ''
    
    // 본문 내용 추출
    const content = extractContent($, modelName)
    
    return {
      title: title.trim(),
      description: description.trim(),
      content,
      source: url,
      success: true,
    }
  } catch (error) {
    console.error(`스크래핑 실패 (${url}):`, error.message)
    return {
      success: false,
      error: error.message,
      source: url,
    }
  }
}

// HTML에서 가이드 내용 추출
function extractContent($, modelName) {
  const content = {
    bestPractices: [],
    tips: [],
    examples: [],
    parameters: {},
  }
  
  // 일반적인 가이드 섹션 찾기
  const selectors = [
    'section[class*="guide"]',
    'div[class*="guide"]',
    'article',
    'main',
    '.content',
    '#content',
  ]
  
  let mainContent = null
  for (const selector of selectors) {
    const element = $(selector).first()
    if (element.length > 0) {
      mainContent = element
      break
    }
  }
  
  if (!mainContent) {
    mainContent = $('body')
  }
  
  // Best Practices 추출
  const practiceSelectors = [
    'h2:contains("Best Practice")',
    'h2:contains("Best practice")',
    'h3:contains("Best Practice")',
    'h3:contains("Best practice")',
    '.best-practice',
    '.bestpractice',
    '[class*="best-practice"]',
  ]
  
  practiceSelectors.forEach(selector => {
    const section = mainContent.find(selector).parent()
    if (section.length > 0) {
      section.find('li, p').each((i, elem) => {
        const text = $(elem).text().trim()
        if (text.length > 10 && text.length < 500) {
          content.bestPractices.push(text)
        }
      })
    }
  })
  
  // Tips 추출
  const tipSelectors = [
    'h2:contains("Tip")',
    'h3:contains("Tip")',
    '.tip',
    '[class*="tip"]',
    'blockquote',
  ]
  
  tipSelectors.forEach(selector => {
    mainContent.find(selector).each((i, elem) => {
      const text = $(elem).text().trim()
      if (text.length > 10 && text.length < 300) {
        content.tips.push(text)
      }
    })
  })
  
  // Examples 추출
  const exampleSelectors = [
    'h2:contains("Example")',
    'h3:contains("Example")',
    '.example',
    '[class*="example"]',
    'pre code',
  ]
  
  exampleSelectors.forEach(selector => {
    mainContent.find(selector).each((i, elem) => {
      const text = $(elem).text().trim()
      if (text.length > 20 && text.length < 1000) {
        content.examples.push({
          input: text.substring(0, 200),
          output: '',
        })
      }
    })
  })
  
  // 중복 제거 및 제한
  content.bestPractices = [...new Set(content.bestPractices)].slice(0, 10)
  content.tips = [...new Set(content.tips)].slice(0, 10)
  content.examples = content.examples.slice(0, 5)
  
  return content
}

// 특정 모델의 가이드 수집
async function collectGuideForModel(modelName) {
  const sources = COLLECTION_SOURCES[modelName] || []
  if (sources.length === 0) {
    return {
      success: false,
      error: `모델 ${modelName}에 대한 수집 소스가 없습니다`,
    }
  }
  
  const results = []
  for (const sourceUrl of sources) {
    const result = await scrapeGuideFromURL(sourceUrl, modelName)
    results.push(result)
    
    // 요청 간 딜레이 (서버 부하 방지)
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  // 성공한 결과 중 가장 좋은 것 선택
  const successfulResults = results.filter(r => r.success)
  if (successfulResults.length === 0) {
    return {
      success: false,
      error: '모든 소스에서 수집 실패',
      results,
    }
  }
  
  // 가장 많은 내용을 가진 결과 선택
  const bestResult = successfulResults.reduce((best, current) => {
    const bestContent = best.content || {}
    const currentContent = current.content || {}
    const bestCount = (bestContent.bestPractices?.length || 0) + 
                     (bestContent.tips?.length || 0) + 
                     (bestContent.examples?.length || 0)
    const currentCount = (currentContent.bestPractices?.length || 0) + 
                        (currentContent.tips?.length || 0) + 
                        (currentContent.examples?.length || 0)
    return currentCount > bestCount ? current : best
  })
  
  return {
    success: true,
    modelName,
    guide: {
      modelName,
      category: getCategoryFromModel(modelName),
      version: '1.0.0',
      title: bestResult.title,
      description: bestResult.description,
      lastUpdated: Date.now(),
      source: bestResult.source,
      content: bestResult.content,
      metadata: {
        collectedAt: Date.now(),
        collectedBy: 'scraper',
        confidence: calculateConfidence(bestResult.content),
      },
    },
    results,
  }
}

// 모든 모델의 가이드 수집
async function collectAllGuides() {
  const modelNames = Object.keys(COLLECTION_SOURCES)
  const results = []
  
  console.log(`총 ${modelNames.length}개 모델의 가이드 수집 시작...`)
  
  for (const modelName of modelNames) {
    try {
      console.log(`\n[${modelName}] 수집 중...`)
      const result = await collectGuideForModel(modelName)
      results.push({
        modelName,
        success: result.success,
        guide: result.guide,
        error: result.error,
      })
      
      // 모델 간 딜레이
      await new Promise(resolve => setTimeout(resolve, 3000))
    } catch (error) {
      console.error(`[${modelName}] 수집 중 오류:`, error.message)
      results.push({
        modelName,
        success: false,
        error: error.message,
      })
    }
  }
  
  return results
}

// 모델명에서 카테고리 추출
function getCategoryFromModel(modelName) {
  if (['midjourney', 'dalle-3', 'stable-diffusion'].includes(modelName)) {
    return 'image'
  }
  if (['sora', 'veo-3'].includes(modelName)) {
    return 'video'
  }
  return 'llm'
}

// 신뢰도 계산
function calculateConfidence(content) {
  if (!content) return 0.3
  
  let score = 0.3 // 기본 점수
  
  if (content.bestPractices && content.bestPractices.length > 0) {
    score += Math.min(content.bestPractices.length * 0.1, 0.3)
  }
  
  if (content.tips && content.tips.length > 0) {
    score += Math.min(content.tips.length * 0.1, 0.2)
  }
  
  if (content.examples && content.examples.length > 0) {
    score += Math.min(content.examples.length * 0.1, 0.2)
  }
  
  return Math.min(score, 1.0)
}

module.exports = {
  collectGuideForModel,
  collectAllGuides,
  scrapeGuideFromURL,
}

