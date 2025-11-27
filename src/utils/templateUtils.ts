// 템플릿 유틸리티 함수
import { PromptTemplate } from '../types/prompt.types'

/**
 * 템플릿의 변수를 실제 값으로 치환
 */
export function applyTemplate(
  template: PromptTemplate,
  variables: Record<string, string>
): string {
  let result = template.title || ''
  
  if (template.description) {
    result += '\n\n' + template.description
  }

  template.sections.forEach(section => {
    let sectionContent = section.content
    
    // 변수 치환
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      sectionContent = sectionContent.replace(regex, value)
    })
    
    result += `\n\n## ${section.title}\n${sectionContent}`
  })

  return result
}

/**
 * 템플릿에서 변수 추출
 */
export function extractVariables(template: PromptTemplate): string[] {
  const variables = new Set<string>()
  const regex = /\{\{(\w+)\}\}/g
  
  const checkText = (text: string) => {
    let match
    while ((match = regex.exec(text)) !== null) {
      variables.add(match[1])
    }
  }
  
  if (template.title) checkText(template.title)
  if (template.description) checkText(template.description)
  template.sections.forEach(section => {
    if (section.content) checkText(section.content)
    if (section.helperText) checkText(section.helperText)
  })
  
  return Array.from(variables)
}

/**
 * 변수 설명 사전
 */
export const VARIABLE_DESCRIPTIONS: Record<string, string> = {
  '주제': '다루려는 주제(키워드 단위로 구체화 권장)',
  '타겟': '독자/고객/사용자(직군, 연차, 지역 등 포함)',
  '목표': '목적(인지/유입/전환/리텐션/운영 효율 등)',
  '기간': '분석/캘린더/리서치 범위(예: 최근 30일, 다음 4주)',
  '채널': '플랫폼/매체(예: Instagram, TikTok, Google Search 등)',
  'KPI': '성공지표(예: CTR, CVR, CAC, ROAS, NPS, Retention)',
  '제약사항': '예산/인력/툴/브랜드 규정/컴플라이언스',
  '입력데이터': '표/로그/리포트/설문 원문 등',
  '업종': '비즈니스 업종 또는 산업 분야',
  '브랜드': '브랜드명 또는 제품명',
  '분야': '콘텐츠 분야 또는 전문 영역',
  '프로젝트': '프로젝트명 또는 작업명',
  '범위': '프로젝트 범위(In/Out)',
  '프로세스': '대상 프로세스 설명',
  '문제': '현재 문제점 설명',
}

