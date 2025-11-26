// 프롬프트 가이드 웹 스크래퍼

const axios = require('axios')
const cheerio = require('cheerio')
let fetchFn = null
async function getFetch() {
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch.bind(globalThis)
  }
  if (!fetchFn) {
    try {
      const mod = await import('node-fetch')
      fetchFn = mod.default
    } catch (error) {
      throw new Error('node-fetch 모듈을 불러올 수 없습니다. Node 18+ 환경에서 실행하거나 node-fetch를 설치하세요.')
    }
  }
  return fetchFn
}

// 수집 소스 정의 (2024-2025 최신 URL - 재탐색 결과)
const COLLECTION_SOURCES = {
  'openai-gpt-4': [
    // OpenAI는 403 봇 차단이 심함 - 공개 블로그나 가이드 사용
    'https://help.openai.com/en/articles/6654000-best-practices-for-prompt-engineering-with-openai-api',
    'https://platform.openai.com/docs/guides/prompt-engineering',
  ],
  'openai-gpt-3.5': [
    'https://help.openai.com/en/articles/6654000-best-practices-for-prompt-engineering-with-openai-api',
    'https://platform.openai.com/docs/guides/prompt-engineering',
  ],
  'claude-3': [
    'https://docs.anthropic.com/claude/docs',
    'https://docs.anthropic.com/claude/prompt-engineering',
    'https://www.anthropic.com/news',
  ],
  'claude-3.5': [
    'https://docs.anthropic.com/claude/docs',
    'https://docs.anthropic.com/claude/prompt-engineering',
    'https://www.anthropic.com/news/claude-3-5-sonnet',
  ],
  'gemini-pro': [
    'https://ai.google.dev/gemini-api/docs',
    'https://ai.google.dev/gemini-api/docs/prompt-intro',
    'https://ai.google.dev/gemini-api/docs/get-started/python',
  ],
  'gemini-ultra': [
    'https://ai.google.dev/gemini-api/docs',
    'https://ai.google.dev/gemini-api/docs/prompt-intro',
  ],
  'gemini-nano-banana-pro': [
    'https://ai.google.dev/gemini-api/docs',
    'https://ai.google.dev/gemini-api/docs/get-started',
  ],
  'midjourney': [
    'https://docs.midjourney.com',
    'https://docs.midjourney.com/parameter-list',
    'https://docs.midjourney.com/docs/prompts',
  ],
  'dalle-3': [
    'https://help.openai.com/en/articles/6654000-best-practices-for-prompt-engineering-with-openai-api',
    'https://platform.openai.com/docs/guides/images/introduction',
  ],
  'stable-diffusion': [
    'https://github.com/Stability-AI/StableDiffusion',
    'https://github.com/Stability-AI/stablediffusion',
    'https://stability.ai/news',
  ],
  'sora': [
    'https://openai.com/sora',
    'https://openai.com/index/video-generation-models-as-world-simulators',
  ],
  'veo-3': [
    'https://deepmind.google/technologies/veo',
    'https://deepmind.google/discover/blog/veo-2-our-most-capable-video-generation-model',
  ],
  'llama-3': [
    'https://llama.meta.com/llama3',
    'https://ai.meta.com/llama',
    'https://github.com/meta-llama/llama3',
  ],
  'llama-3.1': [
    'https://llama.meta.com/llama3-1',
    'https://ai.meta.com/llama',
    'https://github.com/meta-llama/llama3',
  ],
}

const SEARCH_QUERIES = [
  'prompt guide',
  'gemini prompt guide',
  'openai prompt guide',
  'prompt engineering best practices',
]
const GOOGLE_CSE_ENDPOINT = 'https://www.googleapis.com/customsearch/v1'

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
        // 200-299만 성공으로 처리
        return status >= 200 && status < 300
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

// 스마트 재시도 로직
async function scrapeGuideWithRetry(url, modelName, maxRetries = 3) {
  let lastError = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await scrapeGuideFromURL(url, modelName)
      
      // 성공한 경우 즉시 반환
      if (result.success) {
        return result
      }
      
      // 403 봇 차단인 경우 지수 백오프로 재시도
      if (result.error?.includes('403') || result.error?.includes('Forbidden')) {
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000 // 2초, 4초, 8초
          console.log(`  ⚠️ 403 오류 - ${delay}ms 후 재시도 (${attempt}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, delay))
          lastError = result.error
          continue
        }
      }
      
      // 다른 오류는 즉시 반환
      return result
    } catch (error) {
      lastError = error.message
      
      // 네트워크 오류나 타임아웃인 경우 재시도
      if (attempt < maxRetries && (
        error.message.includes('timeout') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('ENOTFOUND')
      )) {
        const delay = 1000 * attempt // 1초, 2초, 3초
        console.log(`  ⚠️ 네트워크 오류 - ${delay}ms 후 재시도 (${attempt}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      // 마지막 시도이거나 재시도 불가능한 오류
      return {
        success: false,
        error: error.message,
        source: url,
      }
    }
  }
  
  // 모든 재시도 실패
  return {
    success: false,
    error: lastError || '재시도 실패',
    source: url,
  }
}

// 특정 모델의 가이드 수집 (재시도 로직 포함)
let hasSearchConfigWarning = false

async function fetchSearchResults(query, limit = 5) {
  const apiKey = process.env.GOOGLE_CSE_KEY || process.env.GOOGLE_SEARCH_API_KEY
  const cx = process.env.GOOGLE_CSE_ID || process.env.GOOGLE_SEARCH_ENGINE_ID

  if (!apiKey || !cx) {
    if (!hasSearchConfigWarning) {
      console.warn(
        '[GuideScraper] Google Custom Search API 자격 증명이 설정되어 있지 않습니다. 환경변수 GOOGLE_CSE_KEY / GOOGLE_CSE_ID 를 설정하면 검색 기반 가이드 수집이 활성화됩니다.'
      )
      hasSearchConfigWarning = true
    }
    return []
  }

  try {
    const fetch = await getFetch()
    const params = new URLSearchParams({
      key: apiKey,
      cx,
      q: query,
      num: String(Math.min(Math.max(limit, 1), 10)),
      lr: 'lang_en',
      safe: 'off',
    })

    const response = await fetch(`${GOOGLE_CSE_ENDPOINT}?${params.toString()}`)
    if (!response.ok) {
      throw new Error(`Google CSE 응답 오류 (${response.status})`)
    }

    const data = await response.json()
    const links = (data.items || [])
      .map((item) => item.link)
      .filter((link) => typeof link === 'string' && link.startsWith('http'))
    return links.slice(0, limit)
  } catch (error) {
    console.warn(`[GuideScraper] Google 검색 실패 (${query}):`, error.message)
    return []
  }
}

async function buildSourcesForModel(modelName) {
  const staticSources = COLLECTION_SOURCES[modelName] || []
  const queries = [
    ...SEARCH_QUERIES.map((q) => `${modelName} ${q}`),
    ...SEARCH_QUERIES, // 일반 가이드 키워드
  ]
  const searchResults = new Set()

  for (const query of queries) {
    const links = await fetchSearchResults(query, 5)
    links.forEach((link) => searchResults.add(link))
  }

  const merged = [...staticSources, ...searchResults]
  const seen = new Set()

  return merged.filter((url) => {
    if (!url || typeof url !== 'string') return false
    const normalized = url.trim()
    if (!normalized) return false
    if (seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
}

async function collectGuideForModel(modelName) {
  const sources = await buildSourcesForModel(modelName)
  if (sources.length === 0) {
    return {
      success: false,
      error: `모델 ${modelName}에 대한 수집 소스를 찾을 수 없습니다`,
    }
  }
  
  const results = []
  let successCount = 0
  
  for (const sourceUrl of sources) {
    // 재시도 로직이 포함된 스크래핑
    const result = await scrapeGuideWithRetry(sourceUrl, modelName)
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
  
  // 가이드 생성
  const guide = {
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
  }
  
  // 데이터 검증
  const validation = validateGuide(guide)
  
  // 검증 결과를 메타데이터에 추가
  guide.metadata.validation = {
    valid: validation.valid,
    issues: validation.issues,
    warnings: validation.warnings,
  }
  
  // 신뢰도 업데이트 (검증 결과 반영)
  if (!validation.valid) {
    guide.metadata.confidence = Math.max(0, guide.metadata.confidence - 0.2)
  }
  
  return {
    success: true,
    modelName,
    guide,
    results,
    validation,
  }
}

// 배열을 배치로 나누는 헬퍼 함수
function chunkArray(array, chunkSize) {
  const chunks = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}

// 모든 모델의 가이드 수집 (병렬 처리)
async function collectAllGuides(modelNames = null, onProgress = null) {
  const targetModels = modelNames || Object.keys(COLLECTION_SOURCES)
  const results = []
  const BATCH_SIZE = 3 // 동시에 처리할 모델 수
  
  console.log(`총 ${targetModels.length}개 모델의 가이드 수집 시작... (병렬 처리: ${BATCH_SIZE}개씩)`)
  
  // 배치로 나누어 처리
  const batches = chunkArray(targetModels, BATCH_SIZE)
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]
    console.log(`\n배치 ${batchIndex + 1}/${batches.length} 처리 중... (${batch.join(', ')})`)
    
    // 배치 내 모델들을 병렬로 처리
    const batchPromises = batch.map(async (modelName) => {
      try {
        console.log(`[${modelName}] 수집 중...`)
        const result = await collectGuideForModel(modelName)
        return {
          modelName,
          success: result.success,
          guide: result.guide,
          error: result.error,
        }
      } catch (error) {
        console.error(`[${modelName}] 수집 중 오류:`, error.message)
        return {
          modelName,
          success: false,
          error: error.message,
        }
      }
    })
    
    // 배치 완료 대기
    const batchResults = await Promise.allSettled(batchPromises)
    
    // 결과 처리
    batchResults.forEach((settled, index) => {
      if (settled.status === 'fulfilled') {
        results.push(settled.value)
      } else {
        results.push({
          modelName: batch[index],
          success: false,
          error: settled.reason?.message || '알 수 없는 오류',
        })
      }
    })
    
    // 진행 상황 콜백 호출
    if (onProgress) {
      onProgress({
        total: targetModels.length,
        completed: results.length,
        current: batch[batchIndex] || null,
        results: results,
      })
    }
    
    // 배치 간 딜레이 (서버 부하 방지)
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  console.log(`\n수집 완료: 성공 ${results.filter(r => r.success).length}개, 실패 ${results.filter(r => !r.success).length}개`)
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

// 가이드 데이터 검증
function validateGuide(guide) {
  const issues = []
  const warnings = []
  
  if (!guide) {
    return {
      valid: false,
      issues: ['가이드 데이터가 없습니다'],
      warnings: [],
      confidence: 0,
    }
  }
  
  // 최소 내용 확인
  const hasBestPractices = guide.content?.bestPractices?.length > 0
  const hasTips = guide.content?.tips?.length > 0
  const hasExamples = guide.content?.examples?.length > 0
  
  if (!hasBestPractices && !hasTips && !hasExamples) {
    issues.push('내용이 부족합니다 (bestPractices, tips, examples 모두 없음)')
  }
  
  // 제목 확인
  if (!guide.title || guide.title.trim().length === 0) {
    warnings.push('제목이 없습니다')
  }
  
  // 중복 확인
  if (guide.content?.bestPractices) {
    const duplicates = findDuplicates(guide.content.bestPractices)
    if (duplicates.length > 0) {
      warnings.push(`중복된 bestPractices가 ${duplicates.length}개 있습니다`)
    }
  }
  
  if (guide.content?.tips) {
    const duplicates = findDuplicates(guide.content.tips)
    if (duplicates.length > 0) {
      warnings.push(`중복된 tips가 ${duplicates.length}개 있습니다`)
    }
  }
  
  // 내용 길이 확인
  if (guide.content?.bestPractices) {
    const shortItems = guide.content.bestPractices.filter(item => item.length < 10)
    if (shortItems.length > 0) {
      warnings.push(`너무 짧은 bestPractices가 ${shortItems.length}개 있습니다`)
    }
  }
  
  // 신뢰도 계산
  const confidence = calculateConfidence(guide.content)
  if (confidence < 0.5) {
    warnings.push('신뢰도가 낮습니다 (0.5 미만)')
  }
  
  return {
    valid: issues.length === 0,
    issues,
    warnings,
    confidence,
  }
}

// 중복 찾기
function findDuplicates(array) {
  const seen = new Set()
  const duplicates = []
  
  array.forEach((item, index) => {
    const normalized = item.toLowerCase().trim()
    if (seen.has(normalized)) {
      duplicates.push(index)
    } else {
      seen.add(normalized)
    }
  })
  
  return duplicates
}

module.exports = {
  collectGuideForModel,
  collectAllGuides,
  scrapeGuideFromURL,
  validateGuide,
}

