import { ContentType, PromptResult, DetailedOptions } from '../types'

const CONTENT_TYPE_INFO = {
  blog: {
    name: '블로그 콘텐츠',
    requirements: 'SEO, GEO, AEO에 맞춰서 2000~3000자 텍스트 작성, 타겟 질문 포함',
  },
  linkedin: {
    name: '링크드인 뉴스피드 콘텐츠',
    requirements: '전문적이고 비즈니스 중심의 콘텐츠',
  },
  facebook: {
    name: '페이스북 뉴스피드 콘텐츠',
    requirements: '친근하고 공유하기 좋은 콘텐츠',
  },
  instagram: {
    name: '인스타그램 뉴스피드 콘텐츠',
    requirements: '시각적이고 간결한 콘텐츠',
  },
  youtube: {
    name: '유튜브 영상 제목 및 설명 텍스트',
    requirements: '검색 최적화된 제목과 상세한 설명',
  },
  general: {
    name: '일반 텍스트',
    requirements: '자연어 프롬프트 기반의 비정형 텍스트 생성, 특정 플랫폼 제약 없음',
  },
}

export function generatePrompts(
  userPrompt: string,
  contentType: ContentType,
  options?: DetailedOptions
): PromptResult {
  const typeInfo = CONTENT_TYPE_INFO[contentType]
  
  // 타겟 독자 정보 구성
  const targetAudience = buildTargetAudience(options)
  
  // 톤앤매너 설정
  const toneAndStyle = buildToneAndStyle(options)
  
  // 메타 프롬프트 생성
  const metaPrompt = `당신은 ${typeInfo.name} 전문 작가입니다. 
다음 주제와 요구사항을 바탕으로 고품질의 콘텐츠를 작성해주세요.

주제: ${userPrompt}
${targetAudience ? `\n타겟 독자: ${targetAudience}` : ''}

요구사항:
- ${typeInfo.requirements}
- 독자의 관심을 끌고 참여를 유도하는 내용
- 명확하고 이해하기 쉬운 구조
- 타겟 독자에게 가치를 제공하는 정보
${toneAndStyle ? `- ${toneAndStyle}` : ''}

콘텐츠를 작성할 때 다음을 고려해주세요:
1. 독자의 니즈와 관심사${options?.age || options?.gender || options?.occupation ? ' (타겟 독자 특성 반영)' : ''}
2. 명확한 메시지 전달
3. 적절한 톤앤매너${options?.conversational ? ' (대화체 사용)' : ''}
4. 행동 유도 요소 포함`

  // 컨텍스트 프롬프트 생성
  const contextPrompt = `콘텐츠 작성 컨텍스트:

콘텐츠 유형: ${typeInfo.name}
원본 주제: ${userPrompt}
${targetAudience ? `타겟 독자: ${targetAudience}` : ''}
${toneAndStyle ? `톤앤매너: ${toneAndStyle}` : ''}

작성 가이드라인:
${getContentGuidelines(contentType)}

구조 요구사항:
${getStructureRequirements(contentType)}

스타일 가이드:
- 자연스럽고 읽기 쉬운 문체
${options?.conversational ? '- 대화체 사용 (구어체, 친근한 표현)' : '- 정중하고 명확한 문체'}
- 적절한 문단 구분
- 핵심 메시지 강조
- 독자 참여 유도`

  // 해시태그 생성
  const hashtags = generateHashtags(userPrompt, contentType)

  return {
    metaPrompt,
    contextPrompt,
    hashtags,
  }
}

function buildTargetAudience(options?: DetailedOptions): string {
  if (!options) return ''
  
  const parts: string[] = []
  
  if (options.age) {
    parts.push(`${options.age}세`)
  }
  
  if (options.gender) {
    parts.push(options.gender)
  }
  
  if (options.occupation) {
    parts.push(options.occupation)
  }
  
  return parts.length > 0 ? parts.join(', ') : ''
}

function buildToneAndStyle(options?: DetailedOptions): string {
  if (!options) return ''
  
  const styles: string[] = []
  
  if (options.conversational) {
    styles.push('대화체 사용')
  }
  
  if (options.age) {
    const ageNum = parseInt(options.age)
    if (ageNum < 30) {
      styles.push('젊은 세대에 맞는 표현')
    } else if (ageNum >= 50) {
      styles.push('성숙한 독자층에 맞는 표현')
    }
  }
  
  if (options.occupation) {
    if (['개발자', '엔지니어', '프로그래머'].some(occ => options.occupation?.includes(occ))) {
      styles.push('기술적 용어 적절히 활용')
    } else if (['마케터', '기획자', '비즈니스'].some(occ => options.occupation?.includes(occ))) {
      styles.push('비즈니스 관점 강조')
    }
  }
  
  return styles.length > 0 ? styles.join(', ') : ''
}

function getContentGuidelines(contentType: ContentType): string {
  switch (contentType) {
    case 'blog':
      return `- SEO 최적화: 관련 키워드 자연스럽게 포함
- GEO 최적화: 지역 정보 및 지역 검색어 활용
- AEO 최적화: 사용자 질문에 직접적으로 답변
- 길이: 2000~3000자
- 타겟 질문: 독자가 가질 수 있는 질문들을 예상하여 답변 포함`
    case 'linkedin':
      return `- 전문적이고 신뢰할 수 있는 톤
- 업계 인사이트와 전문 지식 공유
- 네트워킹과 커뮤니티 참여 유도
- 비즈니스 가치 제공`
    case 'facebook':
      return `- 친근하고 대화하는 듯한 톤
- 공유하기 좋은 가치 있는 정보
- 댓글과 반응을 유도하는 질문 포함
- 시각적 요소와 함께 사용하기 좋은 텍스트`
    case 'instagram':
      return `- 간결하고 임팩트 있는 메시지
- 시각적 콘텐츠와 잘 어울리는 텍스트
- 해시태그 활용 최적화
- 스토리텔링 요소 포함`
    case 'youtube':
      return `- 검색 최적화된 제목 (키워드 포함)
- 클릭을 유도하는 제목
- 상세하고 정보가 풍부한 설명
- 타임스탬프 및 관련 링크 섹션 고려`
    case 'general':
      return `- 자연어 프롬프트를 기반으로 한 자유로운 텍스트 생성
- 특정 플랫폼이나 형식의 제약 없이 사용자의 의도를 충실히 반영
- 비정형 문장 구조 허용
- 창의적이고 유연한 표현 방식 사용
- 사용자가 입력한 자연어 프롬프트의 맥락과 의도를 최대한 존중`
    default:
      return ''
  }
}

function getStructureRequirements(contentType: ContentType): string {
  switch (contentType) {
    case 'blog':
      return `1. 매력적인 제목
2. 도입부 (독자의 관심 유도)
3. 본문 (주요 내용, 섹션별 구분)
4. 타겟 질문에 대한 답변
5. 결론 및 행동 유도`
    case 'linkedin':
      return `1. 강력한 오프닝
2. 핵심 메시지
3. 인사이트나 경험 공유
4. 질문 또는 토론 제안`
    case 'facebook':
      return `1. 주목을 끄는 시작
2. 주요 내용
3. 공유 가치 강조
4. 참여 유도 질문`
    case 'instagram':
      return `1. 강렬한 첫 문장
2. 핵심 메시지
3. 스토리텔링 요소
4. CTA (Call to Action)`
    case 'youtube':
      return `제목:
- 키워드 포함
- 60자 이내
- 클릭 유도

설명:
- 첫 2-3줄에 핵심 정보
- 상세 설명
- 관련 링크 및 정보`
    case 'general':
      return `- 구조적 제약 없이 자연스러운 텍스트 생성
- 사용자의 자연어 프롬프트에 따라 유연하게 대응
- 문장 길이, 형식, 구조에 대한 고정된 규칙 없음
- 사용자의 의도와 맥락을 최우선으로 고려`
    default:
      return ''
  }
}

function generateHashtags(userPrompt: string, contentType: ContentType): string[] {
  // 기본 해시태그
  const baseHashtags: string[] = []
  
  // 콘텐츠 타입별 해시태그
  const typeHashtags: Record<ContentType, string[]> = {
    blog: ['블로그', '콘텐츠', 'SEO', '글쓰기'],
    linkedin: ['링크드인', '비즈니스', '네트워킹', '프로페셔널'],
    facebook: ['페이스북', '소셜미디어', '공유', '커뮤니티'],
    instagram: ['인스타그램', '소셜미디어', '콘텐츠', '스토리텔링'],
    youtube: ['유튜브', '영상', '콘텐츠', '크리에이터'],
    general: ['텍스트', '자연어', '프롬프트', '일반'],
  }
  
  baseHashtags.push(...typeHashtags[contentType])
  
  // 사용자 프롬프트에서 키워드 추출 (간단한 버전)
  const keywords = extractKeywords(userPrompt)
  baseHashtags.push(...keywords)
  
  // 중복 제거 및 최대 10개로 제한
  const uniqueHashtags = Array.from(new Set(baseHashtags))
    .slice(0, 10)
    .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
  
  return uniqueHashtags
}

function extractKeywords(text: string): string[] {
  // 간단한 키워드 추출 (실제로는 더 정교한 NLP가 필요할 수 있음)
  const words = text
    .replace(/[^\w\s가-힣]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1)
    .slice(0, 6)
  
  return words
}

