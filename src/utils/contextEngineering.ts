/**
 * 고급 컨텍스트 엔지니어링 기법
 * 2026년 기준 최신 기법 적용
 */

export interface ContextEngineeringConfig {
  model: 'gpt-4.1' | 'claude-3.5' | 'gemini-2.0' | 'llama-3.1' | 'mistral-large'
  technique: 'cot' | 'few-shot' | 'role-play' | 'tot' | 'self-consistency'
  complexity: 'simple' | 'medium' | 'complex'
}

/**
 * Chain-of-Thought (CoT) 프롬프팅 적용
 */
export function applyChainOfThought(basePrompt: string): string {
  return `Let's think step by step.

${basePrompt}

Please provide your reasoning process:
1. First, understand the core requirements
2. Then, break down the task into smaller steps
3. Finally, generate the solution based on your analysis`
}

/**
 * Few-Shot Learning 적용
 */
export function applyFewShotLearning(
  basePrompt: string,
  examples: Array<{ input: string; output: string }>
): string {
  const examplesText = examples
    .map((ex, idx) => `Example ${idx + 1}:\nInput: ${ex.input}\nOutput: ${ex.output}`)
    .join('\n\n')

  return `${examplesText}

Now, based on these examples, generate a response for:

${basePrompt}`
}

/**
 * Role-Playing 프롬프팅 적용
 */
export function applyRolePlaying(basePrompt: string, role: string): string {
  return `You are an expert ${role} with years of experience in your field.

Your task:
${basePrompt}

Please respond from the perspective of this expert role, using your professional knowledge and expertise.`
}

/**
 * Tree of Thoughts (ToT) 적용
 */
export function applyTreeOfThoughts(basePrompt: string): string {
  return `Let's explore multiple approaches to solve this problem.

Task: ${basePrompt}

Please consider the following:
1. Approach A: [Your first approach]
2. Approach B: [Your second approach]
3. Approach C: [Your third approach]

Then, evaluate each approach and select the best one, explaining your reasoning.`
}

/**
 * Self-Consistency 적용
 */
export function applySelfConsistency(basePrompt: string, iterations: number = 3): string {
  return `${basePrompt}

Please generate ${iterations} different responses to this prompt, then:
1. Compare all responses
2. Identify common elements and patterns
3. Synthesize the best aspects from each response
4. Provide a final, refined answer`
}

/**
 * 컨텍스트 엔지니어링 기법 적용
 */
export function applyContextEngineering(
  basePrompt: string,
  config: ContextEngineeringConfig
): string {
  let optimizedPrompt = basePrompt

  switch (config.technique) {
    case 'cot':
      optimizedPrompt = applyChainOfThought(optimizedPrompt)
      break
    case 'few-shot':
      // 기본 예시 제공 (실제로는 사용자 입력 기반으로 동적 생성)
      const defaultExamples = getDefaultExamples(config.complexity)
      optimizedPrompt = applyFewShotLearning(optimizedPrompt, defaultExamples)
      break
    case 'role-play':
      const role = getRoleForModel(config.model)
      optimizedPrompt = applyRolePlaying(optimizedPrompt, role)
      break
    case 'tot':
      optimizedPrompt = applyTreeOfThoughts(optimizedPrompt)
      break
    case 'self-consistency':
      const iterations = config.complexity === 'complex' ? 5 : config.complexity === 'medium' ? 3 : 2
      optimizedPrompt = applySelfConsistency(optimizedPrompt, iterations)
      break
  }

  return optimizedPrompt
}

/**
 * 복잡도별 기본 예시
 */
function getDefaultExamples(complexity: 'simple' | 'medium' | 'complex'): Array<{ input: string; output: string }> {
  const simple = [
    {
      input: 'Write a short blog post about AI',
      output: 'Create a 500-word blog post about artificial intelligence that explains key concepts in simple terms...',
    },
  ]

  const medium = [
    ...simple,
    {
      input: 'Create a marketing email for a product launch',
      output: 'Generate a compelling marketing email that includes: subject line, opening hook, key benefits, call-to-action...',
    },
  ]

  const complex = [
    ...medium,
    {
      input: 'Develop a comprehensive content strategy',
      output: 'Create a detailed content strategy that includes: audience analysis, content pillars, editorial calendar, distribution channels, KPIs...',
    },
  ]

  switch (complexity) {
    case 'simple':
      return simple
    case 'medium':
      return medium
    case 'complex':
      return complex
  }
}

/**
 * 모델별 역할 설정
 */
function getRoleForModel(model: ContextEngineeringConfig['model']): string {
  const roles: Record<ContextEngineeringConfig['model'], string> = {
    'gpt-4.1': 'content strategist and SEO specialist',
    'claude-3.5': 'professional writer and editor',
    'gemini-2.0': 'digital marketing strategist',
    'llama-3.1': 'content marketing specialist',
    'mistral-large': 'brand communication expert',
  }
  return roles[model]
}
