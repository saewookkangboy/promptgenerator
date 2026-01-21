// 개인화 및 추천 시스템

import { getPromptRecords, getUserPreferences, updateUserPreferences, PromptRecord } from './storage'

export interface UserPattern {
  preferredContentTypes: string[]
  preferredToneStyles: string[]
  preferredGoals: string[]
  averagePromptLength: number
  mostUsedTags: string[]
  favoriteCategories: string[]
}

/**
 * 사용자 패턴 분석
 */
export function analyzeUserPatterns(): UserPattern {
  const records = getPromptRecords()

  if (records.length === 0) {
    return {
      preferredContentTypes: [],
      preferredToneStyles: [],
      preferredGoals: [],
      averagePromptLength: 0,
      mostUsedTags: [],
      favoriteCategories: [],
    }
  }

  // 콘텐츠 타입 통계
  const contentTypeCount: Record<string, number> = {}
  const toneStyleCount: Record<string, number> = {}
  const goalCount: Record<string, number> = {}
  const categoryCount: Record<string, number> = {}
  const tagCount: Record<string, number> = {}
  let totalLength = 0

  records.forEach((record: PromptRecord) => {
    // 콘텐츠 타입
    if (record.options?.contentType) {
      contentTypeCount[record.options.contentType] = (contentTypeCount[record.options.contentType] || 0) + 1
    }

    // 톤 스타일
    if (record.options?.toneStyles && Array.isArray(record.options.toneStyles)) {
      record.options.toneStyles.forEach((tone: string) => {
        toneStyleCount[tone] = (toneStyleCount[tone] || 0) + 1
      })
    }

    // 목표
    if (record.options?.goal) {
      goalCount[record.options.goal] = (goalCount[record.options.goal] || 0) + 1
    }

    // 카테고리
    categoryCount[record.category] = (categoryCount[record.category] || 0) + 1

    // 태그
    if (record.tags && Array.isArray(record.tags)) {
      record.tags.forEach((tag: string) => {
        tagCount[tag] = (tagCount[tag] || 0) + 1
      })
    }

    // 프롬프트 길이
    totalLength += (record.userInput?.length || 0)
  })

  // 가장 많이 사용된 항목 추출
  const getTopItems = (count: Record<string, number>, limit: number = 3): string[] => {
    return Object.entries(count)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([key]) => key)
  }

  const pattern: UserPattern = {
    preferredContentTypes: getTopItems(contentTypeCount),
    preferredToneStyles: getTopItems(toneStyleCount),
    preferredGoals: getTopItems(goalCount),
    averagePromptLength: Math.round(totalLength / records.length),
    mostUsedTags: getTopItems(tagCount, 5),
    favoriteCategories: getTopItems(categoryCount),
  }

  // 사용자 선호도 업데이트
  updateUserPreferences({
    preferredContentTypes: pattern.preferredContentTypes,
    preferredToneStyles: pattern.preferredToneStyles,
  })

  return pattern
}

/**
 * 스마트 추천 생성
 */
export interface Recommendation {
  type: 'contentType' | 'toneStyle' | 'goal' | 'tag' | 'template'
  value: string
  reason: string
  confidence: number
}

export function generateRecommendations(userInput: string, currentOptions?: Partial<PromptRecord['options']>): Recommendation[] {
  const patterns = analyzeUserPatterns()
  const recommendations: Recommendation[] = []

  // 콘텐츠 타입 추천
  if (patterns.preferredContentTypes.length > 0 && !currentOptions?.contentType) {
    recommendations.push({
      type: 'contentType',
      value: patterns.preferredContentTypes[0],
      reason: `이전에 ${patterns.preferredContentTypes[0]} 타입을 자주 사용하셨습니다`,
      confidence: 0.8,
    })
  }

  // 톤 스타일 추천
  if (patterns.preferredToneStyles.length > 0) {
    const missingTones = patterns.preferredToneStyles.filter(
      tone => !currentOptions?.toneStyles?.includes(tone)
    )
    if (missingTones.length > 0) {
      recommendations.push({
        type: 'toneStyle',
        value: missingTones[0],
        reason: `이전에 "${missingTones[0]}" 톤을 자주 사용하셨습니다`,
        confidence: 0.7,
      })
    }
  }

  // 목표 추천
  if (patterns.preferredGoals.length > 0 && !currentOptions?.goal) {
    recommendations.push({
      type: 'goal',
      value: patterns.preferredGoals[0],
      reason: `이전에 "${patterns.preferredGoals[0]}" 목표를 자주 사용하셨습니다`,
      confidence: 0.75,
    })
  }

  // 태그 추천 (입력 텍스트 기반)
  if (patterns.mostUsedTags.length > 0 && userInput.trim()) {
    const inputLower = userInput.toLowerCase()
    const relevantTags = patterns.mostUsedTags.filter(tag => 
      inputLower.includes(tag.toLowerCase())
    )
    if (relevantTags.length > 0) {
      recommendations.push({
        type: 'tag',
        value: relevantTags[0],
        reason: `이 프롬프트에 "${relevantTags[0]}" 태그를 추가하시겠어요?`,
        confidence: 0.6,
      })
    }
  }

  return recommendations.sort((a, b) => b.confidence - a.confidence)
}

/**
 * 유사한 프롬프트 찾기
 */
export function findSimilarPrompts(
  userInput: string,
  options?: Partial<PromptRecord['options']>,
  limit: number = 5
): PromptRecord[] {
  const records = getPromptRecords()
  const inputLower = userInput.toLowerCase()
  const inputWords = inputLower.split(/\s+/).filter(w => w.length > 2)

  // 유사도 계산
  const scored = records.map(record => {
    let score = 0

    // 입력 텍스트 유사도
    const recordText = (record.userInput || '').toLowerCase()
    const recordWords = recordText.split(/\s+/).filter(w => w.length > 2)
    
    const commonWords = inputWords.filter(w => recordWords.includes(w))
    score += (commonWords.length / Math.max(inputWords.length, recordWords.length)) * 0.5

    // 콘텐츠 타입 일치
    if (options?.contentType && record.options?.contentType === options.contentType) {
      score += 0.2
    }

    // 목표 일치
    if (options?.goal && record.options?.goal === options.goal) {
      score += 0.15
    }

    // 톤 스타일 일치
    if (options?.toneStyles && record.options?.toneStyles) {
      const recordToneStyles = record.options.toneStyles
      const commonTones = options.toneStyles.filter((t: string) => 
        recordToneStyles.includes(t)
      )
      const maxToneLength = Math.max(options.toneStyles.length, recordToneStyles.length)
      score += (commonTones.length / maxToneLength) * 0.15
    }

    return { record, score }
  })

  return scored
    .filter((item: { record: PromptRecord; score: number }) => item.score > 0.1)
    .sort((a: { record: PromptRecord; score: number }, b: { record: PromptRecord; score: number }) => b.score - a.score)
    .slice(0, limit)
    .map((item: { record: PromptRecord; score: number }) => item.record)
}

/**
 * 사용 패턴 기반 기본값 제안
 */
export function suggestDefaults(): Partial<PromptRecord['options']> | null {
  const patterns = analyzeUserPatterns()
  const preferences = getUserPreferences()

  // 패턴이 없으면 null 반환
  if (patterns.preferredContentTypes.length === 0 && 
      patterns.preferredToneStyles.length === 0 && 
      patterns.preferredGoals.length === 0) {
    return null
  }

  return {
    contentType: patterns.preferredContentTypes[0] || preferences.preferredContentTypes?.[0],
    toneStyles: patterns.preferredToneStyles.slice(0, 2) as any[],
    goal: patterns.preferredGoals[0] || 'awareness',
    ...preferences.defaultOptions,
  }
}
