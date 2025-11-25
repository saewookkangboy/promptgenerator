interface ExperimentMetric {
  ctr?: number
  conversion?: number
  dwellTime?: number
  feedbackScore?: number
}

export interface PromptExperiment {
  id: string
  createdAt: number
  variantLabel: string
  promptPreview: string
  qualityScore: number
  goal?: string
  trafficSplit: number
  targetMetric: keyof ExperimentMetric
  metadata?: Record<string, any>
}

const STORAGE_KEY = 'prompt_experiments'

export function saveExperiment(experiment: Omit<PromptExperiment, 'id' | 'createdAt'>): PromptExperiment {
  const experiments = getExperiments()
  const newExperiment: PromptExperiment = {
    ...experiment,
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: Date.now(),
  }
  experiments.unshift(newExperiment)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(experiments.slice(0, 100)))
  return newExperiment
}

export function getExperiments(): PromptExperiment[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Experiments load failed', error)
    return []
  }
}

