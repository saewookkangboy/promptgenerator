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
  { value: 'flux-2-pro', label: 'Flux.2 Pro', category: 'image', vendor: 'blackforestlabs' },
  { value: 'flux-2-ultra', label: 'Flux.2 Ultra', category: 'image', vendor: 'blackforestlabs' },
  { value: 'flux', label: 'Flux Pro', category: 'image', vendor: 'blackforestlabs' },
  { value: 'nano-banana-pro', label: 'Nano Banana Pro (Gemini 3)', category: 'image', vendor: 'google' },
  { value: 'midjourney', label: 'Midjourney v6', category: 'image', vendor: 'midjourney' },
  { value: 'dalle-3', label: 'DALL·E 3', category: 'image', vendor: 'openai' },
  { value: 'stable-diffusion', label: 'Stable Diffusion 3.5 Large', category: 'image', vendor: 'stability' },
  { value: 'imagen-3', label: 'Imagen 3 (Gemini 2.5)', category: 'image', vendor: 'google' },
  { value: 'ideogram-2', label: 'Ideogram 2.0', category: 'image', vendor: 'ideogram' },
  { value: 'ideogram', label: 'Ideogram (Legacy)', category: 'image', vendor: 'ideogram' },

  // Video
  { value: 'sora-2', label: 'OpenAI Sora 2', category: 'video', vendor: 'openai' },
  { value: 'veo-3.1', label: 'Google Veo 3.1', category: 'video', vendor: 'google' },
  { value: 'veo-3', label: 'Google Veo 3', category: 'video', vendor: 'google' },
  { value: 'veo-2', label: 'Google Veo 2', category: 'video', vendor: 'google' },
  { value: 'kling-2.6', label: 'Kling AI 2.6', category: 'video', vendor: 'kling' },
  { value: 'kling', label: 'Kling AI v1.6', category: 'video', vendor: 'kling' },
  { value: 'runway-gen3', label: 'Runway Gen-3', category: 'video', vendor: 'runway' },
  { value: 'pika-2', label: 'Pika Labs 2.0', category: 'video', vendor: 'pika' },
  { value: 'pika', label: 'Pika Labs 1.0', category: 'video', vendor: 'pika' },
  { value: 'ltx-2', label: 'LTX-2', category: 'video', vendor: 'lightricks' },
]

export const getCategoryByModel = (modelName: string): ModelCategory => {
  return MODEL_OPTIONS.find((option) => option.value === modelName)?.category || 'llm'
}
