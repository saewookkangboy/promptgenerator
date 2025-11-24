// 프롬프트 엔지니어링 생성기

import { BasePromptGenerator } from '../base/BasePromptGenerator'
import { EngineeringPromptOptions, OptimizedPrompt, EngineeringConfig } from '../../types/engineering.types'
import { PromptResult } from '../../types/prompt.types'
import { addEnglishVersion } from '../../utils/englishTranslator'

export class PromptEngineer extends BasePromptGenerator {
  generate(options: EngineeringPromptOptions): PromptResult {
    switch (options.method) {
      case 'cot':
        return this.generateChainOfThought(options)
      case 'few-shot':
        return this.generateFewShot(options)
      case 'role-based':
        return this.generateRoleBased(options)
      case 'zero-shot':
        return this.generateZeroShot(options)
      case 'optimize':
        return this.generateOptimized(options)
      default:
        return this.generateZeroShot(options)
    }
  }

  /**
   * Chain of Thought 프롬프트 생성
   */
  private generateChainOfThought(options: EngineeringPromptOptions): PromptResult {
    const config = options.engineeringConfig?.cot
    const steps = config?.steps || this.generateDefaultSteps(options.basePrompt)
    
    const prompt = `${options.basePrompt}

다음 단계를 따라 생각해보세요:
${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

각 단계를 차근차근 진행하며 최종 답변을 도출하세요.
${config?.reasoning ? '각 단계에서 추론 과정을 명시적으로 설명하세요.' : ''}`

    const result = {
      metaPrompt: prompt,
      contextPrompt: this.buildContextPrompt(options, 'Chain of Thought'),
      hashtags: this.generateHashtags(options.basePrompt, 'engineering'),
      fullPrompt: prompt,
      method: 'cot',
      steps,
    }
    return addEnglishVersion(result)
  }

  /**
   * Few-shot Learning 프롬프트 생성
   */
  private generateFewShot(options: EngineeringPromptOptions): PromptResult {
    const config = options.engineeringConfig?.fewShot
    const examples = config?.examples || []
    
    if (examples.length === 0) {
      return this.generateZeroShot(options)
    }

    const examplesText = examples.map((ex, i) => 
      `예시 ${i + 1}:
입력: ${ex.input}
출력: ${ex.output}${ex.explanation ? `\n설명: ${ex.explanation}` : ''}`
    ).join('\n\n')

    const prompt = `${options.basePrompt}

다음 예시들을 참고하세요:

${examplesText}

위 예시들의 패턴을 따라 새로운 입력에 대한 출력을 생성하세요.
예시와 동일한 형식과 스타일을 유지하세요.`

    const result = {
      metaPrompt: prompt,
      contextPrompt: this.buildContextPrompt(options, 'Few-shot Learning'),
      hashtags: this.generateHashtags(options.basePrompt, 'engineering'),
      fullPrompt: prompt,
      method: 'few-shot',
      examples: examples.length,
    }
    return addEnglishVersion(result)
  }

  /**
   * Role-based 프롬프트 생성
   */
  private generateRoleBased(options: EngineeringPromptOptions): PromptResult {
    const config = options.engineeringConfig?.roleBased
    if (!config) {
      return this.generateZeroShot(options)
    }

    const expertiseList = config.expertise.map(e => `- ${e}`).join('\n')
    
    const prompt = `당신은 ${config.role}입니다.
${expertiseList}

${config.perspective ? `관점: ${config.perspective}\n` : ''}
다음 작업을 수행해주세요:
${options.basePrompt}

${config.role}의 관점과 전문성을 바탕으로 답변해주세요.
전문 용어를 적절히 사용하고, 해당 분야의 베스트 프랙티스를 반영하세요.`

    const result = {
      metaPrompt: prompt,
      contextPrompt: this.buildContextPrompt(options, 'Role-based Prompting'),
      hashtags: this.generateHashtags(options.basePrompt, 'engineering'),
      fullPrompt: prompt,
      method: 'role-based',
      role: config.role,
    }
    return addEnglishVersion(result)
  }

  /**
   * Zero-shot 프롬프트 생성
   */
  private generateZeroShot(options: EngineeringPromptOptions): PromptResult {
    const prompt = options.basePrompt

    const result = {
      metaPrompt: prompt,
      contextPrompt: this.buildContextPrompt(options, 'Zero-shot Learning'),
      hashtags: this.generateHashtags(options.basePrompt, 'engineering'),
      fullPrompt: prompt,
      method: 'zero-shot',
    }
    return addEnglishVersion(result)
  }

  /**
   * 최적화된 프롬프트 생성
   */
  private generateOptimized(options: EngineeringPromptOptions): PromptResult {
    const optimization = this.optimizePrompt(options.basePrompt, options.engineeringConfig?.optimize)
    
    const prompt = optimization.optimized

    const result = {
      metaPrompt: prompt,
      contextPrompt: this.buildContextPrompt(options, 'Optimized Prompt', optimization),
      hashtags: this.generateHashtags(options.basePrompt, 'engineering'),
      fullPrompt: prompt,
      method: 'optimize',
      optimization,
    }
    return addEnglishVersion(result)
  }

  /**
   * 프롬프트 최적화
   */
  optimizePrompt(
    prompt: string,
    config?: EngineeringConfig['optimize']
  ): OptimizedPrompt {
    const suggestions: string[] = []
    const improvements: string[] = []
    let optimized = prompt
    let score = 50 // 기본 점수

    // 명확성 개선
    if (config?.clarity !== false) {
      if (prompt.length < 50) {
        suggestions.push('프롬프트를 더 구체적으로 작성하세요.')
        score -= 10
      } else {
        score += 10
      }

      // 모호한 표현 개선
      const vagueWords = ['좋은', '나쁜', '적절한', '많은', '적은']
      const hasVagueWords = vagueWords.some(word => prompt.includes(word))
      if (hasVagueWords) {
        suggestions.push('모호한 표현을 구체적인 수치나 기준으로 대체하세요.')
        improvements.push('모호한 표현을 구체화')
      }
    }

    // 구조 개선
    if (config?.structure !== false) {
      const hasCommas = prompt.includes(',')
      const hasNumbers = /\d+/.test(prompt)
      const hasQuestions = prompt.includes('?')

      if (!hasCommas && prompt.split(' ').length > 10) {
        suggestions.push('여러 요소를 쉼표로 구분하여 나열하세요.')
        improvements.push('구조화된 형식으로 개선')
        optimized = this.addStructure(optimized)
        score += 5
      }

      if (hasNumbers) score += 5
      if (hasQuestions) score += 5
    }

    // 키워드 강조
    if (config?.keywords !== false) {
      optimized = this.enhanceKeywords(optimized)
      improvements.push('중요 키워드 강조')
      score += 10
    }

    // 길이 최적화
    if (config?.length) {
      const targetLengths: Record<string, number> = {
        'short': 50,
        'medium': 150,
        'long': 300,
      }
      const targetLength = targetLengths[config.length] || 150
      const currentLength = optimized.length

      if (Math.abs(currentLength - targetLength) > 50) {
        if (currentLength > targetLength) {
          suggestions.push(`프롬프트를 더 간결하게 작성하세요 (목표: 약 ${targetLength}자).`)
          optimized = this.shortenPrompt(optimized, targetLength)
        } else {
          suggestions.push(`프롬프트를 더 상세하게 작성하세요 (목표: 약 ${targetLength}자).`)
        }
      } else {
        score += 10
      }
    }

    // 점수 정규화 (0-100)
    score = Math.max(0, Math.min(100, score))

    return {
      original: prompt,
      optimized,
      score,
      suggestions,
      improvements,
    }
  }

  /**
   * 구조 추가
   */
  private addStructure(prompt: string): string {
    // 긴 문장을 쉼표로 구분
    return prompt.replace(/\s+and\s+/gi, ', ')
      .replace(/\s+또는\s+/g, ', ')
      .replace(/\s+그리고\s+/g, ', ')
  }

  /**
   * 키워드 강조
   */
  private enhanceKeywords(prompt: string): string {
    const importantKeywords = [
      'high quality', 'detailed', 'professional', 'premium',
      '고품질', '상세한', '전문적인', '프리미엄',
    ]

    let enhanced = prompt
    importantKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
      if (regex.test(enhanced)) {
        enhanced = enhanced.replace(regex, `(${keyword})`)
      }
    })

    return enhanced
  }

  /**
   * 프롬프트 단축
   */
  private shortenPrompt(prompt: string, targetLength: number): string {
    if (prompt.length <= targetLength) return prompt

    // 문장 단위로 자르기
    const sentences = prompt.split(/[.!?]\s+/)
    let shortened = ''
    
    for (const sentence of sentences) {
      if ((shortened + sentence).length <= targetLength) {
        shortened += sentence + '. '
      } else {
        break
      }
    }

    return shortened.trim() || prompt.substring(0, targetLength) + '...'
  }

  /**
   * 기본 단계 생성
   */
  private generateDefaultSteps(_prompt: string): string[] {
    return [
      '문제를 이해하고 핵심 요구사항을 파악하세요',
      '관련된 정보나 지식을 정리하세요',
      '가능한 접근 방법들을 고려하세요',
      '가장 적절한 방법을 선택하고 실행하세요',
      '결과를 검증하고 필요시 개선하세요',
    ]
  }

  /**
   * 컨텍스트 프롬프트 생성
   */
  private buildContextPrompt(
    options: EngineeringPromptOptions,
    method: string,
    optimization?: OptimizedPrompt
  ): string {
    let context = `프롬프트 엔지니어링 컨텍스트:

방법: ${method}
원본 프롬프트: ${options.basePrompt}
`

    if (optimization) {
      context += `
최적화 결과:
- 원본: ${optimization.original}
- 최적화: ${optimization.optimized}
- 점수: ${optimization.score}/100
- 개선 사항: ${optimization.improvements.join(', ')}
${optimization.suggestions.length > 0 ? `- 제안: ${optimization.suggestions.join(', ')}` : ''}
`
    }

    if (options.engineeringConfig) {
      if (options.engineeringConfig.cot) {
        context += `\nChain of Thought 설정:
- 단계 수: ${options.engineeringConfig.cot.steps?.length || 0}
- 추론 과정 명시: ${options.engineeringConfig.cot.reasoning ? '예' : '아니오'}
`
      }

      if (options.engineeringConfig.fewShot) {
        context += `\nFew-shot 설정:
- 예시 수: ${options.engineeringConfig.fewShot.examples?.length || 0}
`
      }

      if (options.engineeringConfig.roleBased) {
        context += `\nRole-based 설정:
- 역할: ${options.engineeringConfig.roleBased.role}
- 전문성: ${options.engineeringConfig.roleBased.expertise.join(', ')}
`
      }
    }

    return context
  }
}

