import { GoogleGenAI } from '@google/genai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GEMINI_APIKEY || ''
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-pro-preview'

export interface ExtractedKeyword {
  keyword: string
  importance: 'high' | 'medium' | 'low' // 중요도: high(적색), medium(파란색), low(검정색)
  pos: string // 품사: 명사, 동사, 형용사 등
}

/**
 * 메타 프롬프트와 컨텍스트 프롬프트에서 주요 키워드를 AI로 추출
 */
export async function extractKeywordsFromPrompts(
  metaPrompt: string,
  contextPrompt: string
): Promise<ExtractedKeyword[]> {
  if (!GEMINI_API_KEY) {
    console.warn('[KeywordExtractor] GEMINI_API_KEY가 설정되지 않았습니다. 기본 키워드 추출을 사용합니다.')
    return extractKeywordsFallback(metaPrompt + ' ' + contextPrompt)
  }

  try {
    const ai = new GoogleGenAI({})

    const prompt = `다음 프롬프트 텍스트에서 주요 키워드를 추출해주세요.

메타 프롬프트:
${metaPrompt}

컨텍스트 프롬프트:
${contextPrompt}

요구사항:
1. 한국어 형태소 분석을 통해 명사, 동사, 형용사 등 핵심 키워드를 추출하세요.
2. 각 키워드의 중요도를 평가하세요:
   - high: 핵심 주제, 주요 개념, 반복되는 중요한 단어
   - medium: 관련 개념, 보조 키워드
   - low: 일반적인 단어, 덜 중요한 키워드
3. 최대 15개의 키워드를 추출하세요.
4. JSON 형식으로 응답하세요.

응답 형식:
{
  "keywords": [
    {
      "keyword": "키워드",
      "importance": "high|medium|low",
      "pos": "명사|동사|형용사|기타"
    }
  ]
}

JSON만 응답하고 다른 설명은 포함하지 마세요.`

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingLevel: 'low',
        },
      },
    })

    const text = response.text

    // JSON 추출
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('JSON 응답을 찾을 수 없습니다')
    }

    const parsed = JSON.parse(jsonMatch[0])
    
    if (!parsed.keywords || !Array.isArray(parsed.keywords)) {
      throw new Error('키워드 배열을 찾을 수 없습니다')
    }

    // 검증 및 정규화
    const keywords: ExtractedKeyword[] = parsed.keywords
      .filter((k: any) => k.keyword && k.importance && k.pos)
      .map((k: any) => ({
        keyword: String(k.keyword).trim(),
        importance: ['high', 'medium', 'low'].includes(k.importance) 
          ? k.importance as 'high' | 'medium' | 'low'
          : 'low',
        pos: String(k.pos).trim(),
      }))
      .slice(0, 15) // 최대 15개로 제한

    console.log(`[KeywordExtractor] ${keywords.length}개의 키워드 추출 완료`)
    return keywords
  } catch (error: any) {
    console.error('[KeywordExtractor] AI 키워드 추출 실패:', error.message)
    // 폴백: 기본 키워드 추출
    return extractKeywordsFallback(metaPrompt + ' ' + contextPrompt)
  }
}

/**
 * 폴백: 간단한 키워드 추출 (AI 실패 시)
 */
function extractKeywordsFallback(text: string): ExtractedKeyword[] {
  // 간단한 키워드 추출 로직
  const words = text
    .replace(/[^\w\s가-힣]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 2 && word.length <= 10)
    .filter(word => !['그리고', '또한', '그러나', '하지만', '이것', '그것', '이런', '그런'].includes(word))

  // 빈도수 계산
  const wordCount: Record<string, number> = {}
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1
  })

  // 빈도수에 따라 정렬 및 중요도 할당
  const sorted = Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word, count], index) => {
      let importance: 'high' | 'medium' | 'low' = 'low'
      if (index < 5) importance = 'high'
      else if (index < 10) importance = 'medium'

      return {
        keyword: word,
        importance,
        pos: '명사', // 기본값
      }
    })

  return sorted
}

