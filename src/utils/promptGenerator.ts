import { ContentType, PromptResult, DetailedOptions } from '../types'
import { GuideContextSummary } from '../types/prompt-guide.types'
import { PromptTemplate } from '../types/prompt.types'
import { 
  generateOptimizedBlogPrompt, 
  BlogOptimizationOptions
} from './blogPromptOptimizer'

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
  'lead-generation': {
    label: '리드 생성/수집',
    description: '잠재 고객의 관심을 유도하고 연락처 수집을 목표로 합니다.',
    checklist: ['가치 있는 리소스 제공', '명확한 양식/다운로드 유도'],
  },
  retention: {
    label: '고객 유지/리텐션',
    description: '기존 고객과의 관계를 강화하고 재구매를 유도합니다.',
    checklist: ['고객 성공 사례 강조', '충성도 프로그램/혜택 안내'],
  },
  'product-promotion': {
    label: '제품/서비스 홍보',
    description: '특정 제품이나 서비스의 특징과 장점을 효과적으로 전달합니다.',
    checklist: ['핵심 기능/혜택 명확히 설명', '사용 사례/데모 제공'],
  },
  traffic: {
    label: '웹사이트 트래픽 유도',
    description: '웹사이트나 특정 페이지로의 방문을 증가시킵니다.',
    checklist: ['관련 링크 자연스럽게 포함', '호기심 유발 제목/내용'],
  },
  authority: {
    label: '권위/전문성 구축',
    description: '업계 전문가로서의 신뢰도와 영향력을 높입니다.',
    checklist: ['데이터/통계 인용', '깊이 있는 분석/의견 제시'],
  },
  'customer-support': {
    label: '고객 지원/FAQ',
    description: '고객의 질문에 답하고 문제 해결을 돕습니다.',
    checklist: ['명확한 단계별 설명', '예상 질문 선제적 답변'],
  },
  'event-promotion': {
    label: '이벤트/프로모션 안내',
    description: '이벤트 참여나 프로모션 이용을 유도합니다.',
    checklist: ['이벤트 핵심 정보 명시', '참여 동기 부여'],
  },
  'news-announcement': {
    label: '뉴스/공지사항',
    description: '중요한 소식이나 업데이트를 효과적으로 전달합니다.',
    checklist: ['핵심 정보 명확히 전달', '관련 배경/맥락 제공'],
  },
  'community-building': {
    label: '커뮤니티 구축',
    description: '공통 관심사를 가진 사람들을 연결하고 커뮤니티를 성장시킵니다.',
    checklist: ['공통 관심사 강조', '참여/소속감 유도'],
  },
  'thought-leadership': {
    label: '사고 리더십 발휘',
    description: '업계 트렌드를 선도하는 혁신적인 관점을 제시합니다.',
    checklist: ['미래 전망/트렌드 분석', '독창적인 시각/의견 제시'],
  },
}

/**
 * 사용자 입력을 기반으로 프롬프트를 생성합니다.
 * 
 * @param userPrompt - 사용자가 입력한 프롬프트 텍스트
 * @param contentType - 생성할 콘텐츠 타입 (blog, linkedin, facebook, instagram, youtube, general)
 * @param options - 상세 옵션 (타겟 독자, 톤앤매너, 목표 등)
 * @param guideContext - 프롬프트 가이드 컨텍스트 (선택사항)
 * @returns 생성된 프롬프트 결과 (한국어 및 영어 버전 포함)
 * 
 * @example
 * ```typescript
 * const result = generatePrompts(
 *   'AI의 미래',
 *   'blog',
 *   { goal: 'education', tone: 'professional' }
 * )
 * ```
 */
export function generatePrompts(
  userPrompt: string,
  contentType: ContentType,
  options?: DetailedOptions,
  guideContext?: GuideContextSummary | null,
): PromptResult {
  // 블로그 콘텐츠인 경우 고급 SEO/GEO/AIO/AEO 최적화 사용
  if (contentType === 'blog') {
    return generateOptimizedBlogPrompts(userPrompt, options, guideContext)
  }
  
  // 기존 로직 (다른 콘텐츠 타입)
  const typeInfo = CONTENT_TYPE_INFO[contentType]
  const goalInfo = options?.goal ? CONTENT_GOALS[options.goal] : undefined
  const guideNotes = buildGuideNotes(guideContext)
  
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
${guideNotes ? `- 최신 가이드라인 반영 (아래 참고)` : ''}

콘텐츠를 작성할 때 다음을 고려해주세요:
1. 독자의 니즈와 관심사${options?.age || options?.gender || options?.occupation ? ' (타겟 독자 특성 반영)' : ''}
2. 명확한 메시지 전달
3. 적절한 톤앤매너${options?.conversational ? ' (대화체 사용)' : ''}
4. 행동 유도 요소 포함
${guideNotes ? `\n[모델별 최신 가이드]\n${guideNotes}` : ''}`

  // 컨텍스트 프롬프트 생성
  const contextPrompt = `콘텐츠 작성 컨텍스트:

콘텐츠 유형: ${typeInfo.name}
원본 주제: ${userPrompt}
${targetAudience ? `타겟 독자: ${targetAudience}` : ''}
${goalInfo ? `콘텐츠 목표: ${goalInfo.label}` : ''}
${toneAndStyle ? `톤앤매너: ${toneAndStyle}` : ''}

작성 가이드라인:
${getContentGuidelines(contentType)}
${guideNotes ? `\n최근 가이드 참고:\n${guideNotes}` : ''}

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
    appliedGuide: guideContext ? { ...guideContext } : undefined,
  }
}

/**
 * 블로그 콘텐츠를 위한 최적화된 프롬프트 생성
 */
function generateOptimizedBlogPrompts(
  userPrompt: string,
  options?: DetailedOptions,
  guideContext?: GuideContextSummary | null,
): PromptResult {
  const typeInfo = CONTENT_TYPE_INFO['blog']
  const goalInfo = options?.goal ? CONTENT_GOALS[options.goal] : undefined
  const guideNotes = buildGuideNotes(guideContext)
  
  // 타겟 독자 정보 구성
  const targetAudience = buildTargetAudience(options)
  
  // 톤앤매너 설정
  const toneAndStyle = buildToneAndStyle(options)
  
  // SEO/GEO/AIO/AEO 최적화 옵션 준비
  const optimizationOptions: BlogOptimizationOptions = {
    seoEnabled: true,
    geoEnabled: true,
    aioEnabled: true,
    aeoEnabled: true,
    targetPlatforms: ['all'],
    includeSemanticKeywords: true,
    includeLSIKeywords: true,
    includeLongTailKeywords: true,
    includeQuestionKeywords: true,
    includeFAQ: true,
    includeSchema: true,
    includeFeaturedSnippet: true,
    voiceSearchOptimized: true,
    includeAuthorCredentials: true,
    includeStatistics: true,
    includeCitations: true,
    contentFreshness: 'regular',
    wordCount: 2500,
  }
  
  // 최적화된 블로그 프롬프트 생성
  const optimized = generateOptimizedBlogPrompt(userPrompt, optimizationOptions)
  
  // 기존 구조와 통합하기 위해 메타 프롬프트와 컨텍스트 프롬프트에 최적화 내용 추가
  const enhancedMetaPrompt = `${optimized.metaPrompt}

${targetAudience ? `타겟 독자: ${targetAudience}` : ''}
${goalInfo ? `콘텐츠 목표: ${goalInfo.label}` : ''}
${toneAndStyle ? `톤앤매너: ${toneAndStyle}` : ''}
${guideNotes ? `\n[모델별 최신 가이드]\n${guideNotes}` : ''}`

  const enhancedContextPrompt = `${optimized.contextPrompt}

${targetAudience ? `\n타겟 독자 정보:\n${targetAudience}` : ''}
${goalInfo ? `\n콘텐츠 목표:\n${goalInfo.label}\n${goalInfo.description}\n${goalInfo.checklist.map(item => `- ${item}`).join('\n')}` : ''}
${toneAndStyle ? `\n톤앤매너 가이드:\n${toneAndStyle}` : ''}
${guideNotes ? `\n\n[최신 가이드 참고]\n${guideNotes}` : ''}

## 키워드 전략
- Primary Keywords: ${optimized.keywordAnalysis.primary.join(', ')}
${optimized.keywordAnalysis.semantic.length > 0 ? `- Semantic Keywords: ${optimized.keywordAnalysis.semantic.slice(0, 5).join(', ')}` : ''}
${optimized.keywordAnalysis.lsi.length > 0 ? `- LSI Keywords: ${optimized.keywordAnalysis.lsi.slice(0, 5).join(', ')}` : ''}
${optimized.keywordAnalysis.questions.length > 0 ? `- Question Keywords: ${optimized.keywordAnalysis.questions.slice(0, 5).join(', ')}` : ''}

## 콘텐츠 구조
${optimized.contentStructure.headings.map((h, i) => `${i + 1}. ${h}`).join('\n')}

${optimized.contentStructure.faqQuestions.length > 0 ? `\n## FAQ 질문\n${optimized.contentStructure.faqQuestions.slice(0, 5).map((q, i) => `${i + 1}. ${q}`).join('\n')}` : ''}`

  // 템플릿 빌드 (최적화 정보 포함)
  const metaTemplate = buildMetaTemplate({
    userPrompt,
    contentType: 'blog',
    typeName: typeInfo.name,
    requirements: 'SEO, GEO, AIO, AEO 최적화된 블로그 콘텐츠',
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

  // 해시태그 생성 (키워드 분석 결과 활용)
  const hashtags = [
    ...optimized.keywordAnalysis.primary.map(k => `#${k}`),
    ...optimized.keywordAnalysis.semantic.slice(0, 3).map(k => `#${k.replace(/\s+/g, '')}`),
  ].slice(0, 10)

  return {
    metaPrompt: enhancedMetaPrompt,
    contextPrompt: enhancedContextPrompt,
    hashtags,
    metaTemplate,
    contextTemplate,
    appliedGuide: guideContext ? { ...guideContext } : undefined,
    // 최적화 결과를 추가 필드로 포함
    blogOptimization: optimized,
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
      return `- SEO 최적화: Primary/Semantic/LSI/Long-tail 키워드 자연스럽게 포함
- GEO 최적화: 지역 정보 및 지역 검색어 활용 (LocalBusiness Schema)
- AIO 최적화: AI 플랫폼별 최적화 (ChatGPT, Perplexity, Claude, Gemini)
  * 통계 및 데이터 포함 (+41% 인용 증가)
  * Primary Source 인용 (PubMed, arXiv 등)
  * 작성자 자격증명 포함 (+40% 인용 확률)
- AEO 최적화: FAQ 섹션, 질문 기반 구조, Featured Snippet (30-40단어)
- 길이: 2000~3000자 (포괄적 커버리지)
- 구조: H2→H3→불릿 포인트 (40% 더 많은 인용)
- Voice Search: Speakable Schema, 자연어 질문 키워드
- Schema 마크업: FAQPage, Article, HowTo, BreadcrumbList 등`
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

function buildGuideNotes(guide?: GuideContextSummary | null): string {
  if (!guide) return ''
  const notes: string[] = []
  if (guide.summary) {
    notes.push(`- ${guide.summary}`)
  }
  if (guide.bestPractices?.length) {
    guide.bestPractices.slice(0, 3).forEach((tip) => notes.push(`- ${tip}`))
  }
  if (guide.tips?.length) {
    guide.tips.slice(0, 2).forEach((tip) => notes.push(`- ${tip}`))
  }
  return notes.join('\n')
}

function getStructureRequirements(contentType: ContentType): string {
  switch (contentType) {
    case 'blog':
      return `1. 매력적인 제목 (Primary Keyword 포함, 50-60자)
2. Featured Snippet 답변 (30-40단어, 질문에 직접 답변)
3. 도입부 (독자의 관심 유도, 문제 제시)
4. 본문 (H2→H3→불릿 구조)
   - H2: Primary Keyword 기반 섹션 제목
   - H3: Semantic/LSI Keywords 활용
   - 불릿: 핵심 정보 요약
5. FAQ 섹션 (Question Keywords 활용, FAQPage Schema)
6. 통계 및 데이터 (Primary Source 인용)
7. 결론 및 행동 유도 (CTA 포함)`
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

