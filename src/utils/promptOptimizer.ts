/**
 * 동적 프롬프트 최적화 시스템
 * A/B 테스트 및 사용자 피드백 기반 자동 개선
 */

export interface PromptVariant {
  id: string
  basePrompt: string
  technique: string
  model: string
  successRate?: number
  userRating?: number
  usageCount: number
  createdAt: Date
}

export interface OptimizationResult {
  bestVariant: PromptVariant
  alternatives: PromptVariant[]
  recommendations: string[]
}

/**
 * 프롬프트 변형 생성
 */
export function generatePromptVariants(
  basePrompt: string,
  model: string
): PromptVariant[] {
  const techniques = ['cot', 'few-shot', 'role-play', 'tot', 'self-consistency']
  
  return techniques.map((technique, index) => ({
    id: `variant-${Date.now()}-${index}`,
    basePrompt,
    technique,
    model,
    usageCount: 0,
    createdAt: new Date(),
  }))
}

/**
 * 최적 프롬프트 선택
 */
export function selectOptimalPrompt(
  variants: PromptVariant[]
): OptimizationResult {
  // 성공률과 사용자 평점을 기반으로 최적 선택
  const scoredVariants = variants.map(variant => ({
    ...variant,
    score: calculateVariantScore(variant),
  }))

  // 점수순 정렬
  scoredVariants.sort((a, b) => b.score - a.score)

  const bestVariant = scoredVariants[0]
  const alternatives = scoredVariants.slice(1, 4) // 상위 3개 대안

  // 개선 권장사항 생성
  const recommendations = generateRecommendations(bestVariant, alternatives)

  return {
    bestVariant: bestVariant,
    alternatives: alternatives.map(({ score, ...rest }) => rest),
    recommendations,
  }
}

/**
 * 변형 점수 계산
 */
function calculateVariantScore(variant: PromptVariant): number {
  let score = 0.5 // 기본 점수

  // 성공률 반영 (40%)
  if (variant.successRate !== undefined) {
    score += variant.successRate * 0.4
  }

  // 사용자 평점 반영 (30%)
  if (variant.userRating !== undefined) {
    score += (variant.userRating / 5) * 0.3
  }

  // 사용 횟수 반영 (30%) - 더 많이 사용된 것이 신뢰도 높음
  const usageWeight = Math.min(variant.usageCount / 100, 1) * 0.3
  score += usageWeight

  return Math.min(1, score)
}

/**
 * 개선 권장사항 생성
 */
function generateRecommendations(
  best: PromptVariant,
  alternatives: Array<PromptVariant & { score: number }>
): string[] {
  const recommendations: string[] = []

  // 성공률이 낮으면 다른 기법 시도 권장
  if (best.successRate !== undefined && best.successRate < 0.7) {
    const bestSuccessRate = best.successRate
    const betterAlternative = alternatives.find(
      alt => alt.successRate !== undefined && alt.successRate > bestSuccessRate
    )
    if (betterAlternative) {
      recommendations.push(
        `${betterAlternative.technique} 기법이 더 나은 성과를 보였습니다. 시도해보세요.`
      )
    }
  }

  // 사용자 평점이 낮으면 개선 권장
  if (best.userRating !== undefined && best.userRating < 3) {
    recommendations.push('사용자 피드백을 바탕으로 프롬프트를 개선하는 것을 권장합니다.')
  }

  // 사용 횟수가 적으면 더 많은 테스트 권장
  if (best.usageCount < 10) {
    recommendations.push('더 많은 테스트를 통해 프롬프트를 최적화하세요.')
  }

  return recommendations
}

/**
 * 사용자 피드백 반영
 */
export function updateVariantWithFeedback(
  variant: PromptVariant,
  rating: number,
  success: boolean
): PromptVariant {
  const newUsageCount = variant.usageCount + 1
  const newUserRating = variant.userRating
    ? (variant.userRating * variant.usageCount + rating) / newUsageCount
    : rating
  const newSuccessRate = variant.successRate
    ? (variant.successRate * variant.usageCount + (success ? 1 : 0)) / newUsageCount
    : success ? 1 : 0

  return {
    ...variant,
    usageCount: newUsageCount,
    userRating: newUserRating,
    successRate: newSuccessRate,
  }
}
