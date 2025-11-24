// 한국어 프롬프트를 Native English로 변환하는 유틸리티

/**
 * 한국어 프롬프트를 Native English로 변환
 * AI 모델에 최적화된 자연스러운 영어 표현으로 변환
 */
export function translateToNativeEnglish(koreanText: string): string {
  // 기본 변환 규칙
  let english = koreanText

  // 일반적인 한국어 표현을 자연스러운 영어로 변환
  const translations: Record<string, string> = {
    // 기본 표현
    '작성해주세요': 'please write',
    '생성해주세요': 'please generate',
    '만들어주세요': 'please create',
    '설명해주세요': 'please explain',
    '알려주세요': 'please tell me',
    
    // 품질 관련
    '고품질': 'high quality',
    '고해상도': 'high resolution',
    '상세한': 'detailed',
    '전문적인': 'professional',
    '프리미엄': 'premium',
    
    // 스타일 관련
    '자연스러운': 'natural',
    '부드러운': 'soft',
    '강렬한': 'intense',
    '따뜻한': 'warm',
    '차가운': 'cool',
    '우아한': 'elegant',
    
    // 카메라 관련
    '클로즈업': 'close-up',
    '와이드 샷': 'wide shot',
    '미디엄 샷': 'medium shot',
    '정적': 'static',
    '부드러운 움직임': 'smooth movement',
    
    // 조명 관련
    '자연광': 'natural lighting',
    '스튜디오 조명': 'studio lighting',
    '드라마틱한 조명': 'dramatic lighting',
    
    // 색상 관련
    '생생한 색상': 'vibrant colors',
    '차분한 색상': 'muted colors',
    '파스텔 색상': 'pastel colors',
    
    // 톤앤매너
    '서정적': 'lyrical',
    '서사적': 'narrative',
    '서술적': 'descriptive',
    '대화적': 'conversational',
  }

  // 단순 치환
  Object.entries(translations).forEach(([ko, en]) => {
    const regex = new RegExp(ko, 'gi')
    english = english.replace(regex, en)
  })

  // 문장 구조 개선
  english = improveSentenceStructure(english)

  return english
}

/**
 * 문장 구조를 자연스러운 영어로 개선
 */
function improveSentenceStructure(text: string): string {
  let improved = text

  // 한국어식 어순을 영어식으로 개선
  // "~에 대해 작성해주세요" -> "write about ~"
  improved = improved.replace(/(.+?)(에 대해|에 관해)(.+?)/gi, '$3 about $1')

  // "~를 생성해주세요" -> "generate ~"
  improved = improved.replace(/(.+?)(를|을) 생성해주세요/gi, 'generate $1')

  // "~를 만들어주세요" -> "create ~"
  improved = improved.replace(/(.+?)(를|을) 만들어주세요/gi, 'create $1')

  // 불필요한 "please" 중복 제거
  improved = improved.replace(/please please/gi, 'please')

  // 문장 끝 정리
  improved = improved.replace(/[.,;:]\s*$/g, '')

  return improved.trim()
}

/**
 * 프롬프트를 Native English로 최적화
 * AI 모델에 최적화된 자연스러운 영어 표현
 */
export function optimizeForNativeEnglish(prompt: string): string {
  let optimized = prompt

  // AI 모델에 최적화된 표현으로 변환
  const optimizations: Array<[RegExp, string]> = [
    // 품질 강조
    [/\b(high quality|detailed|professional)\b/gi, '($1)'],
    
    // 자연스러운 영어 표현으로 개선
    [/make it/gi, 'create'],
    [/do it/gi, 'generate'],
    
    // 불필요한 단어 제거
    [/very very/gi, 'very'],
    [/really really/gi, 'really'],
    
    // 자연스러운 연결
    [/and and/gi, 'and'],
    [/with with/gi, 'with'],
  ]

  optimizations.forEach(([regex, replacement]) => {
    optimized = optimized.replace(regex, replacement)
  })

  // 문장 시작을 자연스럽게
  if (!/^[A-Z]/.test(optimized)) {
    optimized = optimized.charAt(0).toUpperCase() + optimized.slice(1)
  }

  return optimized.trim()
}

/**
 * 한국어 프롬프트를 완전한 Native English로 변환
 */
export function convertToNativeEnglish(koreanPrompt: string): string {
  // 1단계: 기본 번역
  let english = translateToNativeEnglish(koreanPrompt)

  // 2단계: 문장 구조 개선
  english = improveSentenceStructure(english)

  // 3단계: Native English 최적화
  english = optimizeForNativeEnglish(english)

  // 4단계: 자연스러운 영어 표현으로 마무리
  english = finalizeEnglishExpression(english)

  return english
}

/**
 * 최종 영어 표현 정리
 */
function finalizeEnglishExpression(text: string): string {
  let finalized = text

  // 자연스러운 영어 관용구 적용
  const idioms: Array<[RegExp, string]> = [
    // "고품질의" -> "high-quality"
    [/\bhigh quality\b/gi, 'high-quality'],
    [/\bhigh resolution\b/gi, 'high-resolution'],
    
    // 자연스러운 연결어
    [/,\s*,/g, ', '],
    [/\s+/g, ' '],
  ]

  idioms.forEach(([regex, replacement]) => {
    finalized = finalized.replace(regex, replacement)
  })

  return finalized.trim()
}

/**
 * 프롬프트 결과에 영문 버전 추가
 */
interface EnglishOverrides {
  metaPrompt?: string
  contextPrompt?: string
  fullPrompt?: string
}

export function addEnglishVersion<T extends Record<string, any>>(result: T, overrides: EnglishOverrides = {}): T {
  if (!result.metaPrompt && !result.fullPrompt) {
    return result
  }

  const englishMetaPrompt =
    overrides.metaPrompt ??
    (result.metaPrompt ? convertToNativeEnglish(result.metaPrompt) : undefined)

  const englishContextPrompt =
    overrides.contextPrompt ??
    (result.contextPrompt ? convertToNativeEnglish(result.contextPrompt) : undefined)

  const englishVersion =
    overrides.fullPrompt ??
    convertToNativeEnglish(result.fullPrompt || result.metaPrompt || '')

  return {
    ...result,
    englishVersion,
    englishMetaPrompt,
    englishContextPrompt,
  }
}

