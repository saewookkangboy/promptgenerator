export type ModelCategory = 'llm' | 'image' | 'video'

export type ModelOption = {
  value: string
  label: string
  category: ModelCategory
  vendor?: string
}

// 초깃값: 주요 LLM/이미지/비디오 모델 최신 스냅샷
export const MODEL_OPTIONS: ModelOption[] = [
  // LLM
  { value: 'gpt-4.1', label: 'OpenAI GPT-4.1', category: 'llm', vendor: 'openai' },
  { value: 'gpt-4.1-mini', label: 'OpenAI GPT-4.1 Mini', category: 'llm', vendor: 'openai' },
  { value: 'gpt-4o', label: 'OpenAI GPT-4o', category: 'llm', vendor: 'openai' },
  { value: 'gpt-4o-mini', label: 'OpenAI GPT-4o Mini', category: 'llm', vendor: 'openai' },
  { value: 'gpt-4', label: 'OpenAI GPT-4', category: 'llm', vendor: 'openai' },
  { value: 'gpt-3.5-turbo', label: 'OpenAI GPT-3.5 Turbo', category: 'llm', vendor: 'openai' },
  { value: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', category: 'llm', vendor: 'anthropic' },
  { value: 'claude-3.5-haiku', label: 'Claude 3.5 Haiku', category: 'llm', vendor: 'anthropic' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus', category: 'llm', vendor: 'anthropic' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet', category: 'llm', vendor: 'anthropic' },
  { value: 'claude-3-haiku', label: 'Claude 3 Haiku', category: 'llm', vendor: 'anthropic' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', category: 'llm', vendor: 'google' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', category: 'llm', vendor: 'google' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', category: 'llm', vendor: 'google' },
  { value: 'llama-3.1', label: 'Llama 3.1', category: 'llm', vendor: 'meta' },
  { value: 'llama-3', label: 'Llama 3', category: 'llm', vendor: 'meta' },

  // Image
  { value: 'midjourney', label: 'Midjourney', category: 'image', vendor: 'midjourney' },
  { value: 'dalle-3', label: 'DALL·E 3', category: 'image', vendor: 'openai' },
  { value: 'stable-diffusion', label: 'Stable Diffusion', category: 'image', vendor: 'stability' },

  // Video
  { value: 'sora', label: 'OpenAI Sora', category: 'video', vendor: 'openai' },
  { value: 'veo-3', label: 'Google Veo 3', category: 'video', vendor: 'google' },
]

export const getCategoryByModel = (modelName: string): ModelCategory => {
  return MODEL_OPTIONS.find((option) => option.value === modelName)?.category || 'llm'
}
