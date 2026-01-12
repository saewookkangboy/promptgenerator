/**
 * 번역 품질 검증 시스템
 * 자연스러움, 정확성, 완전성을 평가합니다.
 */

export interface TranslationQuality {
  fluency: number      // 0-1, 자연스러움
  accuracy: number     // 0-1, 정확성
  completeness: number // 0-1, 완전성
  overall: number      // 종합 점수
}

interface QualityCheckResult {
  quality: TranslationQuality
  issues: string[]
  suggestions: string[]
}

/**
 * 번역 품질을 검증합니다.
 */
export function checkTranslationQuality(
  original: string,
  translated: string,
  context?: string
): QualityCheckResult {
  const issues: string[] = []
  const suggestions: string[] = []

  // 1. 완전성 검사 (원문 길이 대비)
  const completeness = calculateCompleteness(original, translated)
  if (completeness < 0.8) {
    issues.push('번역이 원문보다 너무 짧습니다.')
    suggestions.push('원문의 모든 내용이 번역되었는지 확인하세요.')
  }

  // 2. 자연스러움 검사 (기본적인 영어 패턴)
  const fluency = calculateFluency(translated)
  if (fluency < 0.7) {
    issues.push('번역이 부자연스러울 수 있습니다.')
    suggestions.push('문맥에 맞는 자연스러운 표현을 사용하세요.')
  }

  // 3. 정확성 검사 (의미 보존)
  const accuracy = calculateAccuracy(original, translated, context)
  if (accuracy < 0.7) {
    issues.push('번역의 의미가 원문과 다를 수 있습니다.')
    suggestions.push('핵심 개념과 용어의 정확한 번역을 확인하세요.')
  }

  // 4. 문법 오류 검사
  const grammarIssues = checkGrammar(translated)
  if (grammarIssues.length > 0) {
    issues.push(...grammarIssues)
    suggestions.push('문법 규칙을 확인하세요.')
  }

  // 종합 점수 계산
  const overall = (fluency * 0.4 + accuracy * 0.4 + completeness * 0.2)

  return {
    quality: {
      fluency,
      accuracy,
      completeness,
      overall,
    },
    issues,
    suggestions,
  }
}

/**
 * 완전성 계산 (원문 대비 번역 길이)
 */
function calculateCompleteness(original: string, translated: string): number {
  const originalLength = original.trim().length
  const translatedLength = translated.trim().length

  if (originalLength === 0) return 1

  // 한국어는 영어보다 약 1.5배 길지만, 번역 시 보통 비슷하거나 더 짧아짐
  // 0.5 ~ 1.5 범위를 정상으로 간주
  const ratio = translatedLength / originalLength
  if (ratio >= 0.5 && ratio <= 1.5) {
    return 1
  } else if (ratio < 0.5) {
    return ratio * 2 // 0.5 미만이면 점수 감소
  } else {
    return Math.max(0, 1 - (ratio - 1.5) * 0.2) // 1.5 초과면 점수 감소
  }
}

/**
 * 자연스러움 계산 (기본적인 영어 패턴 검사)
 */
function calculateFluency(text: string): number {
  let score = 1.0
  const issues: string[] = []

  // 1. 연속된 대문자 검사 (일반적으로 부자연스러움)
  if (/[A-Z]{3,}/.test(text)) {
    score -= 0.1
    issues.push('과도한 대문자 사용')
  }

  // 2. 연속된 특수문자 검사
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{3,}/.test(text)) {
    score -= 0.1
    issues.push('과도한 특수문자 사용')
  }

  // 3. 공백 문제 검사
  if (/\s{3,}/.test(text)) {
    score -= 0.05
    issues.push('과도한 공백')
  }

  // 4. 문장 끝 마침표 검사
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  if (sentences.length > 0) {
    const avgLength = sentences.reduce((sum, s) => sum + s.trim().length, 0) / sentences.length
    // 평균 문장 길이가 너무 짧거나 길면 감점
    if (avgLength < 10) {
      score -= 0.1
    } else if (avgLength > 200) {
      score -= 0.05
    }
  }

  return Math.max(0, Math.min(1, score))
}

/**
 * 정확성 계산 (의미 보존도)
 */
function calculateAccuracy(
  original: string,
  translated: string,
  _context?: string
): number {
  let score = 1.0

  // 1. 핵심 키워드 보존 검사
  const originalKeywords = extractKeywords(original)
  const translatedKeywords = extractKeywords(translated)

  // 키워드 일치율 계산
  const matchedKeywords = originalKeywords.filter(kw =>
    translatedKeywords.some(tkw => 
      tkw.toLowerCase().includes(kw.toLowerCase()) ||
      kw.toLowerCase().includes(tkw.toLowerCase())
    )
  )

  const keywordMatchRatio = originalKeywords.length > 0
    ? matchedKeywords.length / originalKeywords.length
    : 1

  score = score * 0.5 + keywordMatchRatio * 0.5

  // 2. 숫자 보존 검사
  const originalNumbers = original.match(/\d+/g) || []
  const translatedNumbers = translated.match(/\d+/g) || []
  if (originalNumbers.length > 0) {
    const numberMatchRatio = translatedNumbers.length / originalNumbers.length
    score = score * 0.7 + numberMatchRatio * 0.3
  }

  return Math.max(0, Math.min(1, score))
}

/**
 * 문법 오류 검사
 */
function checkGrammar(text: string): string[] {
  const issues: string[] = []

  // 1. 연속된 공백
  if (/\s{2,}/.test(text)) {
    issues.push('연속된 공백이 있습니다.')
  }

  // 2. 문장 시작 대문자 검사
  const sentences = text.split(/[.!?]+\s+/).filter(s => s.trim().length > 0)
  const incorrectStarts = sentences.filter(s => {
    const firstChar = s.trim()[0]
    return firstChar && firstChar !== firstChar.toUpperCase()
  })
  if (incorrectStarts.length > sentences.length * 0.3) {
    issues.push('일부 문장이 대문자로 시작하지 않습니다.')
  }

  return issues
}

/**
 * 텍스트에서 키워드 추출
 */
function extractKeywords(text: string): string[] {
  // 간단한 키워드 추출 (2글자 이상 단어, 불용어 제외)
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this',
    'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    '이', '가', '을', '를', '에', '의', '와', '과', '도', '로', '으로',
    '에서', '에게', '께', '한테', '에게서', '로부터', '와', '과', '도',
    '만', '까지', '부터', '조차', '마저', '은', '는'
  ])

  const words = text
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 2 && !stopWords.has(word))

  // 중복 제거 및 빈도순 정렬
  const wordCount = new Map<string, number>()
  words.forEach(word => {
    wordCount.set(word, (wordCount.get(word) || 0) + 1)
  })

  return Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word)
}

/**
 * 품질 점수를 등급으로 변환
 */
export function getQualityGrade(overall: number): string {
  if (overall >= 0.9) return 'A+'
  if (overall >= 0.8) return 'A'
  if (overall >= 0.7) return 'B'
  if (overall >= 0.6) return 'C'
  if (overall >= 0.5) return 'D'
  return 'F'
}
