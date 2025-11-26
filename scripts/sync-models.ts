import fs from 'fs'
import path from 'path'
import axios from 'axios'

type ModelCategory = 'llm' | 'image' | 'video'

type ModelOption = {
  value: string
  label: string
  category: ModelCategory
  vendor?: string
}

const TARGET_URL = 'https://artificialanalysis.ai/leaderboards/models'
const SRC_CONFIG = path.resolve(__dirname, '..', 'src', 'config', 'model-options.ts')
const SERVER_CONFIG = path.resolve(__dirname, '..', 'server', 'config', 'models.json')

// 간단한 파서: 모델명/벤더/카테고리를 추정
function categorize(model: string): ModelCategory {
  const name = model.toLowerCase()
  if (/(midjourney|dalle|stable|sdxl|flux)/.test(name)) return 'image'
  if (/(sora|veo|runway|kling)/.test(name)) return 'video'
  return 'llm'
}

function normalizeLabel(model: string): string {
  return model
    .replace(/_/g, '-')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

async function fetchModels(): Promise<ModelOption[]> {
  const res = await axios.get<string>(TARGET_URL, { timeout: 10000 })
  const html = res.data
  // 매우 단순한 추출: data-model-name 같은 패턴 또는 표 텍스트에서 대략 추출
  const matches = new Set<string>()
  const regex = /data-model-name="([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(html)) !== null) {
    matches.add(m[1])
  }

  // 백업: table 행에서 모델명 추정
  if (matches.size === 0) {
    const textRegex = />\s*([A-Za-z0-9\.\-\+ ]{3,40})\s*<\/a>/g
    while ((m = textRegex.exec(html)) !== null) {
      const name = m[1].trim()
      if (name.length >= 3 && name.length <= 40 && /\d|\w/.test(name)) {
        matches.add(name.toLowerCase())
      }
    }
  }

  const list = Array.from(matches).slice(0, 120) // 안전 상한
  const options: ModelOption[] = list.map((value) => ({
    value,
    label: normalizeLabel(value),
    category: categorize(value),
  }))

  // 기본 시드가 하나도 없으면 이전 값을 그대로 쓰도록 빈 배열 반환
  return options
}

function writeClientConfig(options: ModelOption[]) {
  const header =
    `export type ModelCategory = 'llm' | 'image' | 'video'\n` +
    `export type ModelOption = { value: string; label: string; category: ModelCategory; vendor?: string }\n\n`
  const body = `export const MODEL_OPTIONS: ModelOption[] = ${JSON.stringify(options, null, 2)}\n\n` +
    `export const getCategoryByModel = (modelName: string): ModelCategory => {\n` +
    `  return MODEL_OPTIONS.find((option) => option.value === modelName)?.category || 'llm'\n` +
    `}\n`
  fs.writeFileSync(SRC_CONFIG, header + body, 'utf8')
}

function writeServerConfig(options: ModelOption[]) {
  const payload = {
    models: options,
    source: 'artificialanalysis.ai/leaderboards/models',
    lastUpdated: new Date().toISOString(),
  }
  fs.writeFileSync(SERVER_CONFIG, JSON.stringify(payload, null, 2), 'utf8')
}

async function main() {
  console.log('[sync-models] Fetching models from leaderboard...')
  try {
    const options = await fetchModels()
    if (!options.length) {
      console.warn('[sync-models] No models fetched. Keeping existing configs.')
      return
    }
    writeClientConfig(options)
    writeServerConfig(options)
    console.log(`[sync-models] Updated ${options.length} models.`)
  } catch (error: any) {
    console.error('[sync-models] Failed to sync models:', error?.message || error)
    process.exitCode = 1
  }
}

void main()
