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
const getHeaders = (url) => {
  const headers = {
    'User-Agent': USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Referer': 'https://www.google.com/',
  }
  
  // GitHub 사이트인 경우 추가 헤더
  if (url.includes('github.com')) {
    headers['Accept'] = 'text/html,application/xhtml+xml'
  }
  
  return headers
}

// 웹 페이지에서 가이드 정보 추출
async function scrapeGuideFromURL(url, modelName) {
  try {
    console.log(`스크래핑 중: ${url}`)
    
    const response = await axios.get(url, {
      headers: getHeaders(url),
      timeout: 30000, // 30초 타임아웃
      maxRedirects: 10, // 리다이렉트 증가
      validateStatus: function (status) {
        // 403, 404 등도 일단 받아서 처리
        return status >= 200 && status < 500
      },
    })
    
    // 403, 404 등의 경우 특별 처리
    if (response.status === 403) {
      console.warn(`  ⚠️ 403 Forbidden - 봇 차단 가능성`)
      // 대체 소스나 캐시된 데이터 사용 고려
      return {
        success: false,
        error: '403 Forbidden - 봇 차단',
        source: url,
      }
    }
    
    if (response.status === 404) {
      console.warn(`  ⚠️ 404 Not Found - URL이 변경되었을 수 있음`)
      return {
        success: false,
        error: '404 Not Found',
        source: url,
      }
    }
    
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
    'article',
    'main',
    'section[class*="content"]',
    'div[class*="content"]',
    '.content',
    '#content',
    '[role="main"]',
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
  
  // Best Practices 추출 (더 넓은 범위)
  const practiceKeywords = ['best practice', 'best practices', 'guidelines', 'recommendations', 'guide']
  practiceKeywords.forEach(keyword => {
    mainContent.find('h1, h2, h3, h4').each((i, elem) => {
      const heading = $(elem)
      const headingText = heading.text().toLowerCase()
      
      if (headingText.includes(keyword)) {
        // 다음 섹션까지의 내용 추출
        let next = heading.next()
        let count = 0
        while (next.length > 0 && count < 10) {
          if (next.is('h1, h2, h3, h4')) break
          
          next.find('li, p').each((j, item) => {
            const text = $(item).text().trim()
            if (text.length > 15 && text.length < 500 && !text.includes('http')) {
              content.bestPractices.push(text)
            }
          })
          
          next = next.next()
          count++
        }
      }
    })
  })
  
  // Tips 추출
  const tipKeywords = ['tip', 'tips', 'note', 'important', 'remember']
  tipKeywords.forEach(keyword => {
    mainContent.find('h2, h3, h4, strong, em').each((i, elem) => {
      const text = $(elem).text().toLowerCase()
      if (text.includes(keyword)) {
        const parent = $(elem).parent()
        const tipText = parent.text().trim()
        if (tipText.length > 20 && tipText.length < 500) {
          content.tips.push(tipText)
        }
      }
    })
    
    // blockquote도 tips로 간주
    mainContent.find('blockquote').each((i, elem) => {
      const text = $(elem).text().trim()
      if (text.length > 20 && text.length < 500) {
        content.tips.push(text)
      }
    })
  })
  
  // Examples 추출
  mainContent.find('pre, code, .example, [class*="example"]').each((i, elem) => {
    const text = $(elem).text().trim()
    if (text.length > 20 && text.length < 2000) {
      // 코드 블록인 경우
      if ($(elem).is('pre, code')) {
        content.examples.push({
          input: text.substring(0, 500),
          output: '',
        })
      } else {
        // 일반 예시
        const exampleText = text.substring(0, 300)
        if (exampleText.length > 20) {
          content.examples.push({
            input: exampleText,
            output: '',
          })
        }
      }
    }
  })
  
  // 일반적인 리스트 항목도 추출 (가이드성 내용)
  mainContent.find('ul li, ol li').each((i, elem) => {
    const text = $(elem).text().trim()
    if (text.length > 20 && text.length < 300) {
      // 가이드성 키워드가 포함된 경우
      const lowerText = text.toLowerCase()
      if (lowerText.includes('should') || 
          lowerText.includes('avoid') || 
          lowerText.includes('use') ||
          lowerText.includes('consider') ||
          lowerText.includes('recommend')) {
        content.tips.push(text)
      }
    }
  })
  
  // 중복 제거 및 제한
  content.bestPractices = [...new Set(content.bestPractices)].slice(0, 15)
  content.tips = [...new Set(content.tips)].slice(0, 15)
  content.examples = content.examples.slice(0, 10)
  
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
  let successCount = 0
  
  for (const sourceUrl of sources) {
    const result = await scrapeGuideFromURL(sourceUrl, modelName)
    results.push(result)
    
    if (result.success) {
      successCount++
    }
    
    // 요청 간 딜레이 (서버 부하 방지)
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 하나라도 성공하면 계속 진행
    if (result.success && result.content && 
        ((result.content.bestPractices?.length || 0) + 
         (result.content.tips?.length || 0)) > 0) {
      // 충분한 내용을 얻었으면 중단
      break
    }
  }
  
  // 성공한 결과 중 가장 좋은 것 선택
  const successfulResults = results.filter(r => r.success && r.content)
  if (successfulResults.length === 0) {
    // 모든 소스 실패 시, 부분 성공 결과도 고려
    const partialResults = results.filter(r => r.title || r.description)
    if (partialResults.length > 0) {
      const bestPartial = partialResults[0]
      return {
        success: true,
        modelName,
        guide: {
          modelName,
          category: getCategoryFromModel(modelName),
          version: '1.0.0',
          title: bestPartial.title || `${modelName} 가이드`,
          description: bestPartial.description || '',
          lastUpdated: Date.now(),
          source: bestPartial.source,
          content: bestPartial.content || {},
          metadata: {
            collectedAt: Date.now(),
            collectedBy: 'scraper',
            confidence: 0.3, // 낮은 신뢰도
          },
        },
        results,
        warning: '일부 소스에서만 수집 성공',
      }
    }
    
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

