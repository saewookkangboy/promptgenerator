/**
 * AI 플랫폼별 특화 프롬프트 템플릿
 * 2026년 기준 최신 컨텍스트 엔지니어링 기법 적용
 */

export type ModelName = 'gpt-4.1' | 'gpt-4o' | 'claude-3.5' | 'gemini-2.0' | 'llama-3.1' | 'mistral-large'

export interface ModelSpecificConfig {
  systemPrompt: string
  useFunctionCalling?: boolean
  structuredOutput?: boolean
  useXMLTags?: boolean
  maxTokens?: number
  safetySettings?: Record<string, string>
  multimodal?: boolean
  temperature?: number
  topP?: number
}

export const MODEL_SPECIFIC_TEMPLATES: Record<ModelName, ModelSpecificConfig> = {
  'gpt-4.1': {
    systemPrompt: 'You are an expert content creator and prompt engineer. Generate high-quality, optimized prompts that follow best practices for AI content generation.',
    useFunctionCalling: true,
    structuredOutput: true,
    temperature: 0.7,
    topP: 0.9,
  },
  'gpt-4o': {
    systemPrompt: 'You are a professional content strategist. Create well-structured prompts that maximize AI model performance and output quality.',
    useFunctionCalling: true,
    structuredOutput: true,
    temperature: 0.7,
    topP: 0.9,
  },
  'claude-3.5': {
    systemPrompt: '<system>You are an expert content creator and prompt engineer. Generate high-quality, optimized prompts that follow best practices for AI content generation.</system>',
    useXMLTags: true,
    maxTokens: 4096,
    temperature: 0.7,
    topP: 0.9,
  },
  'gemini-2.0': {
    systemPrompt: 'You are a professional content strategist. Create well-structured prompts that maximize AI model performance and output quality.',
    safetySettings: {
      harassment: 'BLOCK_NONE',
      hate_speech: 'BLOCK_NONE',
      sexually_explicit: 'BLOCK_NONE',
      dangerous_content: 'BLOCK_NONE',
    },
    multimodal: true,
    temperature: 0.7,
    topP: 0.9,
  },
  'llama-3.1': {
    systemPrompt: 'You are an expert content creator. Follow instruction tuning best practices to generate high-quality prompts.',
    temperature: 0.7,
    topP: 0.9,
  },
  'mistral-large': {
    systemPrompt: 'You are a professional content strategist. Optimize system messages for maximum AI performance.',
    temperature: 0.7,
    topP: 0.9,
  },
}

/**
 * 모델별 프롬프트 최적화 적용
 */
export function applyModelSpecificOptimization(
  basePrompt: string,
  model: ModelName,
  options?: {
    useChainOfThought?: boolean
    useFewShot?: boolean
    useRolePlay?: boolean
  }
): string {
  const config = MODEL_SPECIFIC_TEMPLATES[model]
  let optimizedPrompt = basePrompt

  // Chain-of-Thought 적용
  if (options?.useChainOfThought) {
    optimizedPrompt = `Let's think step by step.\n\n${optimizedPrompt}\n\nProvide your reasoning step by step.`
  }

  // Few-Shot Learning 적용
  if (options?.useFewShot) {
    const examples = getFewShotExamples(model)
    optimizedPrompt = `${examples}\n\nNow, generate a prompt for the following:\n${optimizedPrompt}`
  }

  // Role-Playing 적용
  if (options?.useRolePlay) {
    optimizedPrompt = `You are an expert ${getRoleForModel(model)}. ${optimizedPrompt}`
  }

  // 모델별 특화 포맷팅
  if (config.useXMLTags) {
    optimizedPrompt = `<prompt>${optimizedPrompt}</prompt>`
  }

  return optimizedPrompt
}

/**
 * 모델별 Few-Shot 예시
 */
function getFewShotExamples(model: ModelName): string {
  const examples: Record<ModelName, string> = {
    'gpt-4.1': `Example 1:
Input: "Write a blog post about AI"
Output: "Create a comprehensive, SEO-optimized blog post about artificial intelligence that includes..."

Example 2:
Input: "Create a social media post"
Output: "Generate an engaging social media post that..."`,
    'claude-3.5': `<example>
<input>Write a blog post about AI</input>
<output>Create a comprehensive, SEO-optimized blog post about artificial intelligence that includes...</output>
</example>`,
    'gemini-2.0': `Example 1:
Input: "Write a blog post about AI"
Output: "Create a comprehensive, SEO-optimized blog post about artificial intelligence that includes..."`,
    'gpt-4o': `Example 1:
Input: "Write a blog post about AI"
Output: "Create a comprehensive, SEO-optimized blog post about artificial intelligence that includes..."`,
    'llama-3.1': `Example 1:
Input: "Write a blog post about AI"
Output: "Create a comprehensive, SEO-optimized blog post about artificial intelligence that includes..."`,
    'mistral-large': `Example 1:
Input: "Write a blog post about AI"
Output: "Create a comprehensive, SEO-optimized blog post about artificial intelligence that includes..."`,
  }
  return examples[model] || examples['gpt-4.1']
}

/**
 * 모델별 역할 설정
 */
function getRoleForModel(model: ModelName): string {
  const roles: Record<ModelName, string> = {
    'gpt-4.1': 'content strategist and SEO specialist',
    'gpt-4o': 'marketing expert and content creator',
    'claude-3.5': 'professional writer and editor',
    'gemini-2.0': 'digital marketing strategist',
    'llama-3.1': 'content marketing specialist',
    'mistral-large': 'brand communication expert',
  }
  return roles[model] || 'content creator'
}

/**
 * 모델별 시스템 프롬프트 가져오기
 */
export function getSystemPrompt(model: ModelName): string {
  return MODEL_SPECIFIC_TEMPLATES[model].systemPrompt
}
