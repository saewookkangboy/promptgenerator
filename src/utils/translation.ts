import { translationAPI } from './api'

type TextMap = Record<string, string | undefined | null>

/**
 * DeepL을 통해 다수의 텍스트를 EN으로 번역하고 key 기반으로 반환
 */
export async function translateTextMap(
  textMap: TextMap,
  options: { targetLang?: string; sourceLang?: string } = {}
): Promise<Record<string, string>> {
  const entries = Object.entries(textMap).filter(
    ([, text]) => typeof text === 'string' && text.trim().length > 0
  )

  if (entries.length === 0) {
    return {}
  }

  const { translations } = await translationAPI.translateToEnglish(
    entries.map(([, text]) => text as string),
    options
  )

  const result: Record<string, string> = {}
  entries.forEach(([key], index) => {
    if (translations[index]) {
      result[key] = translations[index]
    }
  })

  return result
}

