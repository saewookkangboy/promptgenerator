import { translationAPI } from './api'
import { convertToNativeEnglish } from './englishTranslator'
import { PromptResult } from '../types'
import { checkTranslationQuality, getQualityGrade } from './translation/qualityChecker'

type TextMap = Record<string, string | undefined | null>

/**
 * Gemini 기반 번역 API를 호출하여 다수의 텍스트를 EN으로 변환
 */
export async function translateTextMap(
  textMap: TextMap,
  options: { targetLang?: string; sourceLang?: string; compress?: boolean; context?: string } = {}
): Promise<Record<string, string>> {
  const entries = Object.entries(textMap).filter(
    ([, text]) => typeof text === 'string' && text.trim().length > 0
  )

  if (entries.length === 0) {
    return {}
  }

  const { translations } = await translationAPI.translateToEnglish(entries.map(([, text]) => text as string), options)

  const result: Record<string, string> = {}
  entries.forEach(([key], index) => {
    if (translations[index]) {
      const translated = translations[index]
      const original = entries[index][1] as string
      
      // 번역 품질 검증
      const qualityCheck = checkTranslationQuality(original, translated, options.context)
      
      // 품질이 낮으면 경고 로그 (프로덕션에서는 사용자에게 알리지 않음)
      if (qualityCheck.quality.overall < 0.7) {
        console.warn(`[Translation Quality] Low quality translation for key "${key}":`, {
          grade: getQualityGrade(qualityCheck.quality.overall),
          overall: qualityCheck.quality.overall,
          issues: qualityCheck.issues
        })
      }
      
      result[key] = translated
    }
  })

  return result
}

export function buildNativeEnglishFallback(result: PromptResult): Partial<PromptResult> {
  const fallback: Partial<PromptResult> = {}

  if (!result.englishMetaPrompt && result.metaPrompt) {
    fallback.englishMetaPrompt = convertToNativeEnglish(result.metaPrompt)
  }

  if (!result.englishContextPrompt && result.contextPrompt) {
    fallback.englishContextPrompt = convertToNativeEnglish(result.contextPrompt)
  }

  if (!result.englishVersion) {
    const base = (result as any).fullPrompt || result.metaPrompt || ''
    fallback.englishVersion = convertToNativeEnglish(base)
  }

  return fallback
}

