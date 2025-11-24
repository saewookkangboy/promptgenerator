// 기본 프롬프트 생성기 추상 클래스

import { BasePromptOptions, PromptResult } from '../../types/prompt.types'

export abstract class BasePromptGenerator {
  /**
   * 프롬프트를 생성하는 추상 메서드
   * 각 하위 클래스에서 구현해야 함
   */
  abstract generate(options: BasePromptOptions): PromptResult

  /**
   * 타겟 독자 정보를 문자열로 변환
   */
  protected buildTargetAudience(audience?: BasePromptOptions['targetAudience']): string {
    if (!audience) return ''
    
    const parts: string[] = []
    
    if (audience.age) {
      parts.push(`${audience.age}세`)
    }
    
    if (audience.gender) {
      parts.push(audience.gender)
    }
    
    if (audience.occupation) {
      parts.push(audience.occupation)
    }
    
    if (audience.interests && audience.interests.length > 0) {
      parts.push(`관심사: ${audience.interests.join(', ')}`)
    }
    
    return parts.length > 0 ? parts.join(', ') : ''
  }

  /**
   * 톤앤매너를 문자열로 변환
   */
  protected buildToneAndStyle(options: BasePromptOptions): string {
    const styles: string[] = []
    
    if (options.conversational) {
      styles.push('대화체 사용')
    }
    
    if (options.tone) {
      styles.push(options.tone)
    }
    
    if (options.targetAudience?.age) {
      const ageNum = parseInt(options.targetAudience.age)
      if (ageNum < 30) {
        styles.push('젊은 세대에 맞는 표현')
      } else if (ageNum >= 50) {
        styles.push('성숙한 독자층에 맞는 표현')
      }
    }
    
    if (options.targetAudience?.occupation) {
      const occ = options.targetAudience.occupation
      if (['개발자', '엔지니어', '프로그래머'].some(o => occ.includes(o))) {
        styles.push('기술적 용어 적절히 활용')
      } else if (['마케터', '기획자', '비즈니스'].some(o => occ.includes(o))) {
        styles.push('비즈니스 관점 강조')
      }
    }
    
    return styles.length > 0 ? styles.join(', ') : ''
  }

  /**
   * 타겟 독자 정보를 영어 문장으로 변환
   */
  protected buildTargetAudienceEnglish(audience?: BasePromptOptions['targetAudience']): string {
    if (!audience) return ''

    const parts: string[] = []
    const ageMap: Record<string, string> = {
      '10대': 'teens',
      '20대': 'people in their twenties',
      '30대': 'people in their thirties',
      '40대': 'people in their forties',
      '50대': 'people in their fifties',
      '60대 이상': 'people aged 60+',
    }

    const genderMap: Record<string, string> = {
      남성: 'male readers',
      여성: 'female readers',
      무관: 'any gender',
    }

    const occupationMap: Record<string, string> = {
      학생: 'students',
      직장인: 'office workers',
      '개발자/프로그래머': 'software developers',
      디자이너: 'design professionals',
      마케터: 'marketers',
      기획자: 'product planners',
      '경영진/CEO': 'executives or CEOs',
      자영업자: 'small business owners',
      프리랜서: 'freelancers',
      전문직: 'specialized professionals',
      기타: 'various occupations',
    }

    if (audience.age) {
      parts.push(ageMap[audience.age] || audience.age)
    }

    if (audience.gender) {
      parts.push(genderMap[audience.gender] || audience.gender)
    }

    if (audience.occupation) {
      parts.push(occupationMap[audience.occupation] || audience.occupation)
    }

    if (audience.interests && audience.interests.length > 0) {
      parts.push(`interests: ${audience.interests.join(', ')}`)
    }

    return parts.length > 0 ? parts.join(', ') : ''
  }

  /**
   * 톤앤매너를 영어 문장으로 변환
   */
  protected buildToneAndStyleEnglish(options: BasePromptOptions): string {
    const styles: string[] = []

    if (options.conversational) {
      styles.push('Use a conversational tone')
    }

    if (options.tone) {
      styles.push(options.tone)
    }

    if (options.targetAudience?.age) {
      const ageNum = parseInt(options.targetAudience.age)
      if (ageNum < 30) {
        styles.push('Use expressions that resonate with younger readers')
      } else if (ageNum >= 50) {
        styles.push('Use a mature, respectful tone for older readers')
      }
    }

    if (options.targetAudience?.occupation) {
      const occ = options.targetAudience.occupation
      if (['개발자', '엔지니어', '프로그래머'].some(o => occ.includes(o))) {
        styles.push('Incorporate precise technical language')
      } else if (['마케터', '기획자', '비즈니스'].some(o => occ.includes(o))) {
        styles.push('Highlight business insights and strategic value')
      }
    }

    return styles.length > 0 ? styles.join('. ') : ''
  }

  /**
   * 해시태그 생성 (기본 구현)
   */
  protected generateHashtags(input: string, category: string): string[] {
    const baseHashtags: string[] = [category]
    
    // 간단한 키워드 추출
    const keywords = this.extractKeywords(input)
    baseHashtags.push(...keywords)
    
    // 중복 제거 및 최대 10개로 제한
    const uniqueHashtags = Array.from(new Set(baseHashtags))
      .slice(0, 10)
      .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
    
    return uniqueHashtags
  }

  /**
   * 키워드 추출 (기본 구현)
   */
  protected extractKeywords(text: string): string[] {
    const words = text
      .replace(/[^\w\s가-힣]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1)
      .slice(0, 6)
    
    return words
  }
}


