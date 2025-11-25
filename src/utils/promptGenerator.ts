import { ContentType, PromptResult, DetailedOptions } from '../types'
import { PromptTemplate } from '../types/prompt.types'

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

const CONTENT_GOALS: Record<
  string,
  { label: string; description: string; checklist: string[] }
> = {
  awareness: {
    label: '브랜드 인지도 강화',
    description: '브랜드 스토리와 핵심 가치를 강조하여 자연스럽게 각인시킵니다.',
    checklist: ['브랜드 USP를 1회 이상 언급', '감성적 연결 요소 포함'],
  },
  conversion: {
    label: '전환/구매 유도',
    description: '명확한 혜택과 CTA로 행동을 촉진합니다.',
    checklist: ['혜택/문제 해결 메시지', '구체적인 CTA 문장'],
  },
  engagement: {
    label: '참여/소통 활성화',
    description: '질문이나 참여 유도를 통해 상호작용을 증가시킵니다.',
    checklist: ['독자에게 질문 던지기', '댓글/공유 유도 표현'],
  },
  education: {
    label: '교육/인사이트 제공',
    description: '체계적인 정보 전달과 예시로 전문성을 구축합니다.',
    checklist: ['핵심 개념 정의', '사례 또는 데이터 제공'],
  },
}

export function generatePrompts(
  userPrompt: string,
  contentType: ContentType,
  options?: DetailedOptions
): PromptResult {
  const typeInfo = CONTENT_TYPE_INFO[contentType]
  const goalInfo = options?.goal ? CONTENT_GOALS[options.goal] : undefined
  
  // 타겟 독자 정보 구성
  const targetAudience = buildTargetAudience(options)
  
  // 톤앤매너 설정
  const toneAndStyle = buildToneAndStyle(options)
  
  // 메타 프롬프트 생성
  const metaPrompt = `당신은 ${typeInfo.name} 전문 작가입니다. 
다음 주제와 요구사항을 바탕으로 고품질의 콘텐츠를 작성해주세요.

주제: ${userPrompt}
${targetAudience ? `\n타겟 독자: ${targetAudience}` : ''}
${goalInfo ? `\n콘텐츠 목표: ${goalInfo.label}` : ''}

요구사항:
- ${typeInfo.requirements}
- 독자의 관심을 끌고 참여를 유도하는 내용
- 명확하고 이해하기 쉬운 구조
- 타겟 독자에게 가치를 제공하는 정보
${goalInfo ? `- ${goalInfo.description}` : ''}
${goalInfo?.checklist?.length ? goalInfo.checklist.map((item) => `- ${item}`).join('\n') : ''}
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
${goalInfo ? `콘텐츠 목표: ${goalInfo.label}` : ''}
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

  // 템플릿 빌드
  const metaTemplate = buildMetaTemplate({
    userPrompt,
    contentType,
    typeName: typeInfo.name,
    requirements: typeInfo.requirements,
    targetAudience,
    toneAndStyle,
    goal: goalInfo?.label,
    goalDescription: goalInfo?.description,
  })
  const contextTemplate = buildContextTemplate({
    userPrompt,
    typeName: typeInfo.name,
    targetAudience,
    toneAndStyle,
  })

  // 해시태그 생성
  const hashtags = generateHashtags(userPrompt, contentType)

  return {
    metaPrompt,
    contextPrompt,
    hashtags,
    metaTemplate,
    contextTemplate,
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
  
  // 새로운 toneStyles 옵션 처리
  if (options.toneStyles && options.toneStyles.length > 0) {
    const toneLabels: Record<string, string> = {
      conversational: '대화체',
      formal: '격식체',
      friendly: '친근한 말투',
      professional: '전문적인 말투',
      casual: '캐주얼한 말투',
      polite: '정중한 말투',
      concise: '간결한 말투',
      explanatory: '설명적인 말투',
    }
    const selectedTones = options.toneStyles.map(tone => toneLabels[tone] || tone).join(', ')
    styles.push(selectedTones)
  } else if (options.conversational) {
    // 하위 호환성: conversational이 true이면 대화체로 처리
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

function buildMetaTemplate({
  userPrompt,
  contentType,
  typeName,
  requirements,
  targetAudience,
  toneAndStyle,
  goal,
  goalDescription,
}: {
  userPrompt: string
  contentType: ContentType
  typeName: string
  requirements: string
  targetAudience?: string
  toneAndStyle?: string
  goal?: string
  goalDescription?: string
}): PromptTemplate {
  const structureSummary = summarizeStructure(getStructureRequirements(contentType))
  const keyConstraints = summarizeConstraints(requirements, toneAndStyle)

  return {
    title: `${typeName} 메타 프롬프트 템플릿`,
    description: '목표, 대상, 제약, 톤, 출력 요소를 한 번에 정의하는 표준 구조입니다.',
    sections: [
      {
        key: 'objective',
        title: '목표',
        content: `${typeName}에 맞는 고품질 콘텐츠를 생성하고 독자의 행동을 유도합니다.`,
      },
      {
        key: 'topic',
        title: '주제',
        content: userPrompt.trim(),
        helperText: '사용자가 입력한 자연어 요구사항',
      },
      {
        key: 'goal',
        title: '콘텐츠 목표',
        content: goal || '명확한 메시지 전달',
        helperText: goalDescription || '달성하고 싶은 비즈니스/커뮤니케이션 목적',
      },
      {
        key: 'audience',
        title: '타겟 & 페르소나',
        content: targetAudience || '광범위한 일반 대중',
        helperText: '나이, 성별, 직업 등 세부 속성',
      },
      {
        key: 'constraints',
        title: '핵심 제약 조건',
        content: keyConstraints,
        helperText: 'SEO, 플랫폼 규칙, 길이 등 필수 요건',
      },
      {
        key: 'tone',
        title: '톤 & 스타일',
        content: toneAndStyle || '명확하고 신뢰감을 주는 톤',
        helperText: '어투/표현 방식',
      },
      {
        key: 'output',
        title: '출력 구조',
        content: structureSummary,
        helperText: '콘텐츠 구성 순서',
      },
    ],
  }
}

function buildContextTemplate({
  userPrompt,
  typeName,
  targetAudience,
  toneAndStyle,
}: {
  userPrompt: string
  typeName: string
  targetAudience?: string
  toneAndStyle?: string
}): PromptTemplate {
  return {
    title: `${typeName} 컨텍스트 템플릿`,
    description: '상황, 최근 대화 요약, 추가 지시로 구성된 컨텍스트 구조입니다.',
    sections: [
      {
        key: 'situation',
        title: '상황 설명',
        content: `사용자가 "${userPrompt.trim()}" 주제로 ${typeName} 생성을 요청했습니다.`,
        helperText: '현재 생성 요청의 배경과 목표',
      },
      {
        key: 'recentSummary',
        title: '최근 대화 요약',
        content: targetAudience
          ? `타겟 정보: ${targetAudience}. 해당 특성을 반영해 콘텐츠를 준비합니다.`
          : '추가 대화 정보 없음. 기본 가이드라인을 따릅니다.',
        helperText: '바로 직전 맥락이나 전달된 보조 정보',
      },
      {
        key: 'additional',
        title: '추가 지시',
        content: toneAndStyle
          ? `톤/스타일 지침: ${toneAndStyle}. CTA 포함 및 독자 가치 강조.`
          : '명확한 서술, CTA 포함, 독자에게 가치를 제공.',
        helperText: '모델이 반드시 지켜야 할 추가 지시사항',
      },
    ],
  }
}

function summarizeStructure(structureText: string): string {
  return structureText
    .replace(/\s+/g, ' ')
    .replace(/-/g, '')
    .trim()
}

function summarizeConstraints(requirements: string, toneAndStyle?: string): string {
  const normalized = requirements
    .split('\n')
    .map((line) => line.replace(/^-/, '').trim())
    .filter(Boolean)
    .slice(0, 4)
    .join(', ')

  if (toneAndStyle) {
    return `${normalized}${normalized ? ', ' : ''}${toneAndStyle}`
  }

  return normalized
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

