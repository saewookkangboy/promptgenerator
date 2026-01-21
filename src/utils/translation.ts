import { translationAPI } from './api'
import { convertToNativeEnglish } from './englishTranslator'
import { PromptResult } from '../types'
import { checkTranslationQuality, getQualityGrade } from './translation/qualityChecker'
import { detectLanguageFromMultiple, isEnglish } from './languageDetector'

type TextMap = Record<string, string | undefined | null>

/**
 * Gemini 기반 번역 API를 호출하여 다수의 텍스트를 EN으로 변환
 * 입력 언어를 자동 감지하여 필요시에만 번역합니다.
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

  // 입력 언어 자동 감지
  const texts = entries.map(([, text]) => text as string)
  const detectedLanguage = detectLanguageFromMultiple(texts)
  
  // 영어로 감지되고 confidence가 높을 때만 번역하지 않음
  // confidence가 낮거나 undefined이면 번역 경로로 진행 (보수적 처리)
  if (detectedLanguage.language === 'en' && (detectedLanguage.confidence ?? 0) >= 0.8) {
    // 영어 입력은 그대로 반환
    const result: Record<string, string> = {}
    entries.forEach(([key, text]) => {
      result[key] = text as string
    })
    return result
  }

  // 한국어, 일본어, 또는 unknown인 경우 번역 수행
  // 감지된 언어를 sourceLang으로 전달
  const sourceLang = detectedLanguage.language !== 'unknown' 
    ? (detectedLanguage.language === 'ko' ? 'KO' : 'JA')
    : undefined

  const { translations } = await translationAPI.translateToEnglish(
    texts, 
    { ...options, sourceLang }
  )

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
          issues: qualityCheck.issues,
          detectedLanguage: detectedLanguage.language
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

