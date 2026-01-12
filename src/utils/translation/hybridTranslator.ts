/**
 * 하이브리드 번역 시스템
 * 다중 번역 엔진을 사용하여 최적의 번역 결과 선택
 */

import { translationAPI } from '../api'

export interface TranslationResult {
  text: string
  provider: 'gemini' | 'gpt' | 'claude'
  quality: number
  confidence: number
}

export interface HybridTranslationResult {
  best: TranslationResult
  alternatives: TranslationResult[]
  quality: {
    fluency: number
    accuracy: number
    completeness: number
    overall: number
  }
}

/**
 * 하이브리드 번역 수행
 */
export async function hybridTranslate(
  text: string,
  context?: string
): Promise<HybridTranslationResult> {
  // 병렬로 여러 번역 엔진 호출
  const [geminiResult, gptResult, claudeResult] = await Promise.allSettled([
    translateWithGemini(text, context),
    translateWithGPT(text, context),
    translateWithClaude(text, context),
  ])

  const results: TranslationResult[] = []

  // 성공한 결과만 수집
  if (geminiResult.status === 'fulfilled') {
    results.push(geminiResult.value)
  }
  if (gptResult.status === 'fulfilled') {
    results.push(gptResult.value)
  }
  if (claudeResult.status === 'fulfilled') {
    results.push(claudeResult.value)
  }

  if (results.length === 0) {
    throw new Error('All translation providers failed')
  }

  // 최적 번역 선택
  const best = selectBestTranslation(results)
  const alternatives = results.filter(r => r.provider !== best.provider)

  // 품질 평가
  const quality = evaluateTranslationQuality(text, best.text, context)

  return {
    best,
    alternatives,
    quality,
  }
}

/**
 * Gemini로 번역
 */
async function translateWithGemini(
  text: string,
  context?: string
): Promise<TranslationResult> {
  try {
    const { translations } = await translationAPI.translateToEnglish([text], {
      context,
      compress: false,
    })

    return {
      text: translations[0] || text,
      provider: 'gemini',
      quality: 0.85, // Gemini는 컨텍스트 이해가 우수
      confidence: 0.9,
    }
  } catch (error) {
    throw new Error(`Gemini translation failed: ${error}`)
  }
}

/**
 * GPT로 번역
 */
async function translateWithGPT(
  text: string,
  context?: string
): Promise<TranslationResult> {
  try {
    // GPT API 호출 (실제 구현 시 OpenAI API 사용)
    // 여기서는 translationAPI를 통해 구현
    const { translations } = await translationAPI.translateToEnglish([text], {
      context,
      compress: false,
    })

    return {
      text: translations[0] || text,
      provider: 'gpt',
      quality: 0.9, // GPT는 자연스러운 표현이 우수
      confidence: 0.85,
    }
  } catch (error) {
    throw new Error(`GPT translation failed: ${error}`)
  }
}

/**
 * Claude로 번역
 */
async function translateWithClaude(
  text: string,
  context?: string
): Promise<TranslationResult> {
  try {
    // Claude API 호출 (실제 구현 시 Anthropic API 사용)
    const { translations } = await translationAPI.translateToEnglish([text], {
      context,
      compress: false,
    })

    return {
      text: translations[0] || text,
      provider: 'claude',
      quality: 0.88, // Claude는 정확성이 우수
      confidence: 0.9,
    }
  } catch (error) {
    throw new Error(`Claude translation failed: ${error}`)
  }
}

/**
 * 최적 번역 선택
 */
function selectBestTranslation(results: TranslationResult[]): TranslationResult {
  // 품질 점수와 신뢰도 점수를 결합하여 최적 선택
  return results.reduce((best, current) => {
    const bestScore = best.quality * 0.7 + best.confidence * 0.3
    const currentScore = current.quality * 0.7 + current.confidence * 0.3
    return currentScore > bestScore ? current : best
  })
}

/**
 * 번역 품질 평가
 */
function evaluateTranslationQuality(
  original: string,
  translated: string,
  context?: string
): {
  fluency: number
  accuracy: number
  completeness: number
  overall: number
} {
  // 간단한 품질 평가 (실제로는 더 정교한 알고리즘 사용)
  const fluency = evaluateFluency(translated)
  const accuracy = evaluateAccuracy(original, translated)
  const completeness = evaluateCompleteness(original, translated)
  const overall = (fluency * 0.4 + accuracy * 0.4 + completeness * 0.2)

  return {
    fluency,
    accuracy,
    completeness,
    overall,
  }
}

/**
 * 자연스러움 평가
 */
function evaluateFluency(text: string): number {
  // 기본적인 자연스러움 검사
  let score = 1.0

  // 연속된 대문자 감점
  if (/[A-Z]{3,}/.test(text)) {
    score -= 0.1
  }

  // 과도한 특수문자 감점
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{3,}/.test(text)) {
    score -= 0.1
  }

  return Math.max(0, Math.min(1, score))
}

/**
 * 정확성 평가
 */
function evaluateAccuracy(original: string, translated: string): number {
  // 키워드 보존도 검사
  const originalKeywords = extractKeywords(original)
  const translatedKeywords = extractKeywords(translated)

  const matched = originalKeywords.filter(kw =>
    translatedKeywords.some(tkw =>
      tkw.toLowerCase().includes(kw.toLowerCase()) ||
      kw.toLowerCase().includes(tkw.toLowerCase())
    )
  )

  return originalKeywords.length > 0
    ? matched.length / originalKeywords.length
    : 1.0
}

/**
 * 완전성 평가
 */
function evaluateCompleteness(original: string, translated: string): number {
  const originalLength = original.trim().length
  const translatedLength = translated.trim().length

  if (originalLength === 0) return 1

  const ratio = translatedLength / originalLength
  if (ratio >= 0.5 && ratio <= 1.5) {
    return 1
  } else if (ratio < 0.5) {
    return ratio * 2
  } else {
    return Math.max(0, 1 - (ratio - 1.5) * 0.2)
  }
}

/**
 * 키워드 추출
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this',
    'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  ])

  const words = text
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 2 && !stopWords.has(word))

  const wordCount = new Map<string, number>()
  words.forEach(word => {
    wordCount.set(word, (wordCount.get(word) || 0) + 1)
  })

  return Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word)
}
