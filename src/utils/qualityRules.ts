import { DetailedOptions, PromptResult } from '../types'

export type QualitySeverity = 'info' | 'warning' | 'error'

export interface QualityIssue {
  rule: string
  severity: QualitySeverity
  message: string
}

export interface QualityReport {
  score: number
  issues: QualityIssue[]
  recommendations: string[]
  guidelineHints: string[]
}

interface QualityRule {
  id: string
  severity: QualitySeverity
  description: string
  evaluate: (result: PromptResult, options?: DetailedOptions) => QualityIssue | null
  recommendation?: string
}

const MIN_META_LENGTH = 350
const MIN_CONTEXT_LENGTH = 280
const CTA_KEYWORDS = ['행동', '참여', '신청', '구매', '다운로드', '확인', '등록', '문의']
const PROHIBITED_WORDS = ['금지', '비속어', '욕설', '혐오']

const QUALITY_RULES: QualityRule[] = [
  {
    id: 'meta_length',
    severity: 'warning',
    description: '메타 프롬프트 최소 길이',
    evaluate: (result) =>
      result.metaPrompt.length >= MIN_META_LENGTH
        ? null
        : {
            rule: '메타 프롬프트 길이',
            severity: 'warning',
            message: `메타 프롬프트가 ${MIN_META_LENGTH}자 미만입니다.`,
          },
    recommendation: '설명이나 배경 정보를 1~2문단 추가해 주세요.',
  },
  {
    id: 'context_length',
    severity: 'warning',
    description: '컨텍스트 최소 길이',
    evaluate: (result) =>
      result.contextPrompt.length >= MIN_CONTEXT_LENGTH
        ? null
        : {
            rule: '컨텍스트 길이',
            severity: 'warning',
            message: `컨텍스트 프롬프트가 ${MIN_CONTEXT_LENGTH}자 미만입니다.`,
          },
    recommendation: '작성 가이드라인이나 구조 항목을 더 구체화하세요.',
  },
  {
    id: 'cta_exists',
    severity: 'info',
    description: 'CTA 포함 여부',
    evaluate: (result) =>
      CTA_KEYWORDS.some((keyword) => result.metaPrompt.includes(keyword))
        ? null
        : {
            rule: 'CTA 포함',
            severity: 'info',
            message: '구체적인 행동 유도 문장이 없습니다.',
          },
    recommendation: '“~하세요”, “참여해보세요”와 같은 명령형 문장을 1회 이상 추가하세요.',
  },
  {
    id: 'tone_alignment',
    severity: 'info',
    description: '톤앤매너 일관성',
    evaluate: (_result, options) => {
      if (!options?.toneStyles || options.toneStyles.length === 0) return null
      return null
    },
  },
  {
    id: 'prohibited_words',
    severity: 'error',
    description: '금지어 포함',
    evaluate: (result) => {
      const text = `${result.metaPrompt} ${result.contextPrompt}`
      const found = PROHIBITED_WORDS.find((word) => text.includes(word))
      return found
        ? {
            rule: '금지어 사용',
            severity: 'error',
            message: `"${found}" 단어가 포함되어 있습니다.`,
          }
        : null
    },
    recommendation: '금지어나 부정 표현을 다른 단어로 교체하세요.',
  },
  {
    id: 'hashtags',
    severity: 'info',
    description: '해시태그 다양성',
    evaluate: (result) =>
      result.hashtags.length >= 3
        ? null
        : {
            rule: '해시태그',
            severity: 'info',
            message: '해시태그가 3개 미만입니다.',
          },
    recommendation: '핵심 키워드를 더 세분화한 해시태그를 추가하세요.',
  },
]

const SEVERITY_WEIGHT: Record<QualitySeverity, number> = {
  info: 5,
  warning: 15,
  error: 30,
}

export function evaluateQuality(
  result: PromptResult,
  options?: DetailedOptions
): QualityReport {
  let score = 100
  const issues: QualityIssue[] = []
  const recommendations: string[] = []

  QUALITY_RULES.forEach((rule) => {
    const issue = rule.evaluate(result, options)
    if (issue) {
      issues.push(issue)
      score -= SEVERITY_WEIGHT[issue.severity]
      if (rule.recommendation) {
        recommendations.push(rule.recommendation)
      }
    }
  })

  const guidelineHints = buildGuidelineHints(result, options)

  return {
    score: Math.max(0, Math.min(100, score)),
    issues,
    recommendations,
    guidelineHints,
  }
}

function buildGuidelineHints(result: PromptResult, options?: DetailedOptions): string[] {
  const hints: string[] = []

  if (options?.goal === 'conversion' && !CTA_KEYWORDS.some((keyword) => result.metaPrompt.includes(keyword))) {
    hints.push('전환 목표에는 명확한 혜택과 CTA 문장이 필수입니다.')
  }

  if (options?.toneStyles?.includes('formal') && options.toneStyles.includes('friendly')) {
    hints.push('격식체와 친근한 톤을 함께 사용하면 일관성이 떨어질 수 있습니다.')
  }

  if (result.metaPrompt.split('\n').length < 6) {
    hints.push('메타 프롬프트를 구역별로 분리해 가독성을 높여보세요.')
  }

  return hints
}

