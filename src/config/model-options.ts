export type ModelCategory = 'llm' | 'image' | 'video'

export type ModelOption = {
  value: string
  label: string
  category: ModelCategory
  vendor?: string
}

// 최신 LLM/이미지/비디오 모델 스냅샷
export const MODEL_OPTIONS: ModelOption[] = [
  // LLM
  { value: 'gpt-4.1', label: 'OpenAI GPT-4.1', category: 'llm', vendor: 'openai' },
  { value: 'gpt-4o', label: 'OpenAI GPT-4o', category: 'llm', vendor: 'openai' },
  { value: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', category: 'llm', vendor: 'anthropic' },
  { value: 'claude-3.5-haiku', label: 'Claude 3.5 Haiku', category: 'llm', vendor: 'anthropic' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', category: 'llm', vendor: 'google' },
  { value: 'llama-3.1', label: 'Llama 3.1', category: 'llm', vendor: 'meta' },

  // Image
  { value: 'midjourney', label: 'Midjourney v6', category: 'image', vendor: 'midjourney' },
  { value: 'dalle-3', label: 'DALL·E 3', category: 'image', vendor: 'openai' },
  { value: 'stable-diffusion', label: 'Stable Diffusion 3.5 Large', category: 'image', vendor: 'stability' },
  { value: 'flux', label: 'Flux Pro', category: 'image', vendor: 'blackforestlabs' },
  { value: 'imagen-3', label: 'Google Imagen 3 (Gemini 2.5 Flash)', category: 'image', vendor: 'google' },
  { value: 'ideogram', label: 'Ideogram 2.0', category: 'image', vendor: 'ideogram' },

  // Video
  { value: 'sora-2', label: 'OpenAI Sora 2', category: 'video', vendor: 'openai' },
  { value: 'veo-2', label: 'Google Veo 2', category: 'video', vendor: 'google' },
  { value: 'veo-3', label: 'Google Veo 3', category: 'video', vendor: 'google' },
  { value: 'kling', label: 'Kling AI v1.6', category: 'video', vendor: 'kling' },
  { value: 'runway-gen3', label: 'Runway Gen-3', category: 'video', vendor: 'runway' },
  { value: 'pika', label: 'Pika Labs 2.0', category: 'video', vendor: 'pika' },
]

export const getCategoryByModel = (modelName: string): ModelCategory => {
  return MODEL_OPTIONS.find((option) => option.value === modelName)?.category || 'llm'
}
