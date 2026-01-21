/**
 * 언어 감지 유틸리티
 * 임베딩 기반으로 한국어, 영어, 일본어를 자동 감지합니다.
 */

export type DetectedLanguage = 'ko' | 'en' | 'ja' | 'unknown'

// 언어 감지 임계값 상수
const ENGLISH_COUNT_THRESHOLD = 10 // 영어 패턴 기반 감지를 위한 최소 문자 수

interface LanguageDetectionResult {
  language: DetectedLanguage
  confidence: number
}

interface CharCounts {
  koreanCount: number
  japaneseCount: number
  englishCount: number
  totalChars: number
}

/**
 * 텍스트에서 각 언어의 문자 개수를 계산합니다.
 * 
 * @param text 분석할 텍스트
 * @returns 각 언어별 문자 개수와 전체 문자 개수
 */
function getCharCounts(text: string): CharCounts {
  const koreanPattern = /[\uAC00-\uD7AF]/g
  const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF]/g
  const englishPattern = /[A-Za-z]/g

  const koreanCount = (text.match(koreanPattern) || []).length
  const japaneseCount = (text.match(japanesePattern) || []).length
  const englishCount = (text.match(englishPattern) || []).length
  const totalChars = text.replace(/\s/g, '').length

  return {
    koreanCount,
    japaneseCount,
    englishCount,
    totalChars,
  }
}

/**
 * 간단한 휴리스틱 기반 언어 감지
 * 한국어, 영어, 일본어의 특징을 이용한 빠른 감지
 */
function detectLanguageHeuristic(text: string): DetectedLanguage {
  if (!text || text.trim().length === 0) {
    return 'unknown'
  }

  // 한글 유니코드 범위: AC00-D7AF
  const koreanPattern = /[\uAC00-\uD7AF]/
  // 일본어 히라가나: 3040-309F, 가타카나: 30A0-30FF, 한자: 4E00-9FAF (일본어도 사용)
  const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF]/
  // 영어 알파벳 (A-Z, a-z)
  const englishPattern = /[A-Za-z]/

  const { koreanCount, japaneseCount, englishCount, totalChars } = getCharCounts(text)

  if (totalChars === 0) {
    return 'unknown'
  }

  const koreanRatio = koreanCount / totalChars
  const japaneseRatio = japaneseCount / totalChars
  const englishRatio = englishCount / totalChars

  // 임계값: 30% 이상이면 해당 언어로 판단
  if (koreanRatio > 0.3) {
    return 'ko'
  }
  if (japaneseRatio > 0.3) {
    return 'ja'
  }
  if (englishRatio > 0.5) {
    return 'en'
  }

  // 패턴 기반 추가 감지 (.test()는 전역 플래그 없이 사용)
  if (koreanPattern.test(text) && koreanCount > japaneseCount) {
    return 'ko'
  }
  if (japanesePattern.test(text)) {
    return 'ja'
  }
  if (englishPattern.test(text) && englishCount > ENGLISH_COUNT_THRESHOLD) {
    return 'en'
  }

  return 'unknown'
}

/**
 * 텍스트의 언어를 감지합니다.
 * 
 * @param text 감지할 텍스트
 * @returns 감지된 언어와 신뢰도
 */
export function detectLanguage(text: string): LanguageDetectionResult {
  if (!text || text.trim().length === 0) {
    return { language: 'unknown', confidence: 0 }
  }

  const detected = detectLanguageHeuristic(text)
  
  // 신뢰도 계산 (간단한 휴리스틱 기반)
  let confidence = 0.7 // 기본 신뢰도

  const { koreanCount, japaneseCount, englishCount, totalChars } = getCharCounts(text)

  if (totalChars > 0) {
    const ratios: Record<DetectedLanguage, number> = {
      ko: koreanCount / totalChars,
      ja: japaneseCount / totalChars,
      en: englishCount / totalChars,
      unknown: 0,
    }

    const ratio = ratios[detected] || 0
    
    // 비율이 높을수록 신뢰도 증가
    if (ratio > 0.7) {
      confidence = 0.95
    } else if (ratio > 0.5) {
      confidence = 0.85
    } else if (ratio > 0.3) {
      confidence = 0.75
    }

    // 텍스트가 길수록 신뢰도 증가
    if (text.length > 100) {
      confidence = Math.min(0.98, confidence + 0.1)
    }
  }

  return {
    language: detected,
    confidence,
  }
}

/**
 * 여러 텍스트의 언어를 감지하고 가장 많이 나타나는 언어를 반환합니다.
 */
export function detectLanguageFromMultiple(texts: string[]): LanguageDetectionResult {
  if (!texts || texts.length === 0) {
    return { language: 'unknown', confidence: 0 }
  }

  const validTexts = texts.filter((t) => t && typeof t === 'string' && t.trim().length > 0)
  
  if (validTexts.length === 0) {
    return { language: 'unknown', confidence: 0 }
  }

  const results = validTexts.map((text) => detectLanguage(text))
  const languageCounts: Record<string, number> = {}

  results.forEach((result) => {
    if (result.language !== 'unknown') {
      languageCounts[result.language] = (languageCounts[result.language] || 0) + 1
    }
  })

  if (Object.keys(languageCounts).length === 0) {
    return { language: 'unknown', confidence: 0 }
  }

  // 가장 많이 나타나는 언어 선택
  const mostCommon = Object.entries(languageCounts).reduce((a, b) =>
    languageCounts[a[0]] > languageCounts[b[0]] ? a : b
  )

  const avgConfidence =
    results
      .filter((r) => r.language === mostCommon[0])
      .reduce((sum, r) => sum + r.confidence, 0) / mostCommon[1]

  return {
    language: mostCommon[0] as DetectedLanguage,
    confidence: avgConfidence,
  }
}

/**
 * 텍스트가 영어인지 확인합니다.
 */
export function isEnglish(text: string): boolean {
  const result = detectLanguage(text)
  return result.language === 'en'
}

/**
 * 텍스트가 한국어인지 확인합니다.
 */
export function isKorean(text: string): boolean {
  const result = detectLanguage(text)
  return result.language === 'ko'
}

/**
 * 텍스트가 일본어인지 확인합니다.
 */
export function isJapanese(text: string): boolean {
  const result = detectLanguage(text)
  return result.language === 'ja'
}
