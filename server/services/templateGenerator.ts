// AI 기반 템플릿 자동 생성 서비스
import { GoogleGenerativeAI } from '@google/generative-ai'

// PromptTemplate 타입 정의 (서버에서 사용)
export interface PromptTemplate {
  title: string
  description?: string
  sections: Array<{
    key: string
    title: string
    content: string
    helperText?: string
  }>
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GEMINI_APIKEY || ''
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp'

interface TemplateGenerationRequest {
  category: 'text' | 'image' | 'video' | 'engineering'
  baseTemplate?: string
  context?: string
}

/**
 * AI를 사용하여 템플릿 생성
 */
export async function generateTemplateWithAI(
  request: TemplateGenerationRequest
): Promise<PromptTemplate> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API 키가 설정되지 않았습니다.')
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })

  const categoryPrompts: Record<string, string> = {
    text: `다음 프롬프트 라이브러리 문서를 기반으로 실무에서 바로 사용할 수 있는 고품질 텍스트 프롬프트 템플릿을 생성하세요.

참고 템플릿 예시 (prompt_library_top5.md 기반):
- 콘텐츠 제작: {{분야}}의 시니어 콘텐츠 에디터, 주제/타겟/목적 기반
- 마케팅 전략: 소셜 콘텐츠 캘린더, 브랜드/채널/KPI 기반
- 비즈니스 커뮤니케이션: 이메일 작성, 수신자/주제/목적 기반
- 전략 기획: SWOT 분석, 회사/제품 기반

템플릿 요구사항:
- 제목: 명확하고 구체적인 제목 (예: "SEO 최적화 블로그 포스트 작성")
- 설명: 템플릿의 목적과 사용 사례 설명
- 섹션: 최소 3개 이상의 구조화된 섹션
  - 각 섹션은 key, title, content를 포함
  - content에는 {{변수명}} 형식의 변수 사용 (주제, 타겟, 목표, 채널, KPI 등)
- 변수: 실무에서 자주 사용되는 변수 포함

출력 형식: JSON만 출력 (마크다운 없이)
{
  "title": "템플릿 제목",
  "description": "템플릿 설명",
  "sections": [
    {
      "key": "objective",
      "title": "목표",
      "content": "{{목표}}를 달성하기 위한 콘텐츠"
    },
    {
      "key": "audience",
      "title": "타겟",
      "content": "{{타겟}} 독자를 위한"
    }
  ]
}`,
    image: `다음 프롬프트 라이브러리 문서를 기반으로 실무에서 바로 사용할 수 있는 고품질 이미지 생성 프롬프트 템플릿을 생성하세요.

참고: Midjourney, DALL-E, Stable Diffusion 등 이미지 생성 모델용

템플릿 요구사항:
- 제목: 이미지 생성 목적을 명확히 하는 제목 (예: "제품 마케팅 이미지 생성")
- 설명: 어떤 종류의 이미지를 생성하는지 설명
- 섹션: 이미지 스타일, 구도, 조명, 품질, 비율 등에 대한 가이드
  - 주제, 스타일, 조명, 구도, 품질, 비율 등 변수 사용
- 변수: {{주제}}, {{스타일}}, {{조명}}, {{구도}}, {{품질}}, {{비율}} 등

출력 형식: JSON만 출력
{
  "title": "템플릿 제목",
  "description": "템플릿 설명",
  "sections": [
    {
      "key": "subject",
      "title": "주제",
      "content": "{{주제}}"
    },
    {
      "key": "style",
      "title": "스타일",
      "content": "{{스타일}} 스타일"
    }
  ]
}`,
    video: `다음 프롬프트 라이브러리 문서를 기반으로 실무에서 바로 사용할 수 있는 고품질 동영상 생성 프롬프트 템플릿을 생성하세요.

참고: Sora, Veo 등 동영상 생성 모델용

템플릿 요구사항:
- 제목: 동영상 생성 목적을 명확히 하는 제목 (예: "제품 소개 동영상 생성")
- 설명: 어떤 종류의 동영상을 생성하는지 설명
- 섹션: 장면, 움직임, 스타일, 길이, 카메라 움직임 등에 대한 가이드
- 변수: {{주제}}, {{장면}}, {{스타일}}, {{길이}}, {{카메라}} 등

출력 형식: JSON만 출력
{
  "title": "템플릿 제목",
  "description": "템플릿 설명",
  "sections": [
    {
      "key": "scene",
      "title": "장면",
      "content": "{{장면}} 장면"
    },
    {
      "key": "movement",
      "title": "움직임",
      "content": "{{움직임}}"
    }
  ]
}`,
    engineering: `다음 프롬프트 라이브러리 문서를 기반으로 실무에서 바로 사용할 수 있는 고품질 프롬프트 엔지니어링 템플릿을 생성하세요.

참고 템플릿 예시 (prompt_library_top5.md 기반):
- 소프트웨어 개발: Python 클래스 구현, 메서드/타입 힌트/예외 처리
- 프로젝트 관리: 리스크 관리 계획, 리스크 식별/평가/대응
- 운영 최적화: 프로세스 개선, As-Is/To-Be 분석
- 제품 개발: PRD 템플릿, 유저 스토리/기술 스펙/성공 지표

템플릿 요구사항:
- 제목: 엔지니어링 목적을 명확히 하는 제목 (예: "프롬프트 성능 최적화")
- 설명: 어떤 종류의 프롬프트를 엔지니어링하는지 설명
- 섹션: 구조, 최적화, 테스트, 평가 등에 대한 가이드
- 변수: {{목표}}, {{제약사항}}, {{성공기준}}, {{프로젝트}} 등

출력 형식: JSON만 출력
{
  "title": "템플릿 제목",
  "description": "템플릿 설명",
  "sections": [
    {
      "key": "objective",
      "title": "목표",
      "content": "{{목표}}를 달성하기 위한 프롬프트"
    },
    {
      "key": "constraints",
      "title": "제약사항",
      "content": "{{제약사항}}을 고려하여"
    }
  ]
}`,
  }

  const systemPrompt = categoryPrompts[request.category] || categoryPrompts.text
  const userPrompt = request.baseTemplate
    ? `기존 템플릿:\n${request.baseTemplate}\n\n위 템플릿을 개선하거나 확장하여 새로운 템플릿을 생성하세요.`
    : `실무에서 바로 사용할 수 있는 ${request.category} 카테고리의 프롬프트 템플릿을 생성하세요.`

  try {
    const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`)
    const response = await result.response
    const text = response.text()

    // JSON 추출 (마크다운 코드 블록 제거)
    let jsonText = text.trim()
    if (jsonText.includes('```json')) {
      jsonText = jsonText.split('```json')[1].split('```')[0].trim()
    } else if (jsonText.includes('```')) {
      jsonText = jsonText.split('```')[1].split('```')[0].trim()
    }

    const template = JSON.parse(jsonText) as PromptTemplate

    // 기본 구조 검증
    if (!template.title || !template.sections || !Array.isArray(template.sections)) {
      throw new Error('생성된 템플릿이 올바른 형식이 아닙니다.')
    }

    return template
  } catch (error: any) {
    console.error('AI 템플릿 생성 오류:', error)
    throw new Error(`템플릿 생성 실패: ${error.message}`)
  }
}

/**
 * 카테고리별 템플릿 자동 생성
 */
export async function generateTemplatesByCategory(
  category: 'text' | 'image' | 'video' | 'engineering',
  count: number = 3
): Promise<PromptTemplate[]> {
  const templates: PromptTemplate[] = []

  for (let i = 0; i < count; i++) {
    try {
      const template = await generateTemplateWithAI({ category })
      templates.push(template)
      
      // API 호출 제한을 위한 딜레이
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error(`템플릿 생성 실패 (${i + 1}/${count}):`, error)
    }
  }

  return templates
}

