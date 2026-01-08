/**
 * SEO/GEO/AIO/AEO 최적화 블로그 프롬프트 생성 유틸리티
 * 
 * 참조: https://github.com/199-biotechnologies/claude-skill-seo-geo-optimizer
 * 
 * 주요 기능:
 * - SEO (Search Engine Optimization): 전통적인 검색 엔진 최적화
 * - GEO (Geographic Optimization): 지역 검색 최적화
 * - AIO (AI Optimization): AI 플랫폼별 최적화 (ChatGPT, Perplexity, Claude, Gemini)
 * - AEO (Answer Engine Optimization): 답변 엔진 최적화
 */

export interface BlogOptimizationOptions {
  // 기본 옵션
  targetKeyword?: string
  location?: string
  wordCount?: number // 기본값: 2000-3000
  contentType?: 'blog' | 'article' | 'guide' | 'tutorial'
  
  // 최적화 타겟
  seoEnabled?: boolean
  geoEnabled?: boolean
  aioEnabled?: boolean
  aeoEnabled?: boolean
  
  // AI 플랫폼 타겟
  targetPlatforms?: Array<'chatgpt' | 'perplexity' | 'claude' | 'gemini' | 'grokipedia' | 'all'>
  
  // 키워드 전략
  includeSemanticKeywords?: boolean
  includeLSIKeywords?: boolean
  includeLongTailKeywords?: boolean
  includeQuestionKeywords?: boolean
  
  // 콘텐츠 구조
  includeFAQ?: boolean
  includeSchema?: boolean
  includeFeaturedSnippet?: boolean
  voiceSearchOptimized?: boolean
  
  // E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)
  includeAuthorCredentials?: boolean
  includeStatistics?: boolean
  includeCitations?: boolean
  includeDates?: boolean
  
  // Freshness (Perplexity 최적화)
  contentFreshness?: 'aggressive' | 'regular' | 'minimum' // 2-3일, 30일, 90일
}

export interface KeywordAnalysis {
  primary: string[]
  semantic: string[]
  lsi: string[]
  longTail: string[]
  questions: string[]
}

export interface PlatformOptimization {
  chatgpt?: string
  perplexity?: string
  claude?: string
  gemini?: string
  grokipedia?: string
}

export interface SchemaRequirements {
  faqPage?: boolean
  article?: boolean
  howTo?: boolean
  breadcrumbList?: boolean
  organization?: boolean
  localBusiness?: boolean
  person?: boolean
  speakable?: boolean
}

/**
 * 블로그 프롬프트 최적화 결과
 */
export interface OptimizedBlogPrompt {
  // 최적화된 프롬프트
  metaPrompt: string
  contextPrompt: string
  
  // 키워드 분석
  keywordAnalysis: KeywordAnalysis
  
  // 플랫폼별 최적화 가이드
  platformOptimizations: PlatformOptimization
  
  // Schema 요구사항
  schemaRequirements: SchemaRequirements
  
  // 콘텐츠 구조 가이드
  contentStructure: {
    headings: string[]
    faqQuestions: string[]
    featuredSnippetAnswer?: string
  }
  
  // 메타데이터 제안
  metadata: {
    title?: string
    description?: string
    openGraph?: {
      title?: string
      description?: string
      image?: string
    }
    twitterCard?: {
      title?: string
      description?: string
      image?: string
    }
  }
  
  // SEO/GEO/AIO/AEO 최적화 체크리스트
  optimizationChecklist: {
    seo: string[]
    geo: string[]
    aio: string[]
    aeo: string[]
  }
}

/**
 * 키워드 분석 생성
 */
function analyzeKeywords(
  userPrompt: string,
  targetKeyword?: string,
  location?: string,
  options?: BlogOptimizationOptions
): KeywordAnalysis {
  const baseKeywords = targetKeyword 
    ? [targetKeyword, ...extractKeywordsFromText(targetKeyword)]
    : extractKeywordsFromText(userPrompt)
  
  // Primary Keywords (1-2 words)
  const primary = baseKeywords.slice(0, 2).filter(k => k.split(' ').length <= 2)
  
  // Semantic Keywords (related terms)
  const semantic = options?.includeSemanticKeywords !== false
    ? generateSemanticKeywords(primary, location)
    : []
  
  // LSI Keywords (co-occurring terms)
  const lsi = options?.includeLSIKeywords !== false
    ? generateLSIKeywords(primary)
    : []
  
  // Long-tail Keywords (3-8 words)
  const longTail = options?.includeLongTailKeywords !== false
    ? generateLongTailKeywords(primary, userPrompt)
    : []
  
  // Question Keywords (who/what/where/when/why/how)
  const questions = options?.includeQuestionKeywords !== false
    ? generateQuestionKeywords(primary, userPrompt)
    : []
  
  return {
    primary,
    semantic,
    lsi,
    longTail,
    questions
  }
}

/**
 * 텍스트에서 키워드 추출
 */
function extractKeywordsFromText(text: string): string[] {
  const words = text
    .replace(/[^\w\s가-힣]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1)
    .slice(0, 10)
  
  return Array.from(new Set(words))
}

/**
 * Semantic Keywords 생성 (의미적으로 관련된 키워드)
 */
function generateSemanticKeywords(primary: string[], location?: string): string[] {
  const semantic: string[] = []
  
  primary.forEach(keyword => {
    // 지역 키워드와 결합
    if (location) {
      semantic.push(`${location} ${keyword}`)
      semantic.push(`${keyword} ${location}`)
    }
    
    // 관련 용어 패턴
    semantic.push(`${keyword} 가이드`)
    semantic.push(`${keyword} 방법`)
    semantic.push(`${keyword} 추천`)
    semantic.push(`${keyword} 정보`)
  })
  
  return semantic.slice(0, 10)
}

/**
 * LSI Keywords 생성 (동시 출현 키워드)
 */
function generateLSIKeywords(primary: string[]): string[] {
  const lsi: string[] = []
  
  primary.forEach(keyword => {
    lsi.push(`${keyword} 비교`)
    lsi.push(`${keyword} 장단점`)
    lsi.push(`${keyword} 후기`)
    lsi.push(`${keyword} 비용`)
    lsi.push(`${keyword} 효과`)
  })
  
  return lsi.slice(0, 8)
}

/**
 * Long-tail Keywords 생성
 */
function generateLongTailKeywords(primary: string[], context: string): string[] {
  const longTail: string[] = []
  
  primary.forEach(keyword => {
    longTail.push(`${keyword}를 위한 완벽한 가이드`)
    longTail.push(`${keyword}에 대한 모든 것 알아보기`)
    longTail.push(`초보자를 위한 ${keyword} 기초`)
    longTail.push(`전문가가 알려주는 ${keyword} 비밀`)
  })
  
  // 컨텍스트에서 긴 문구 추출
  const phrases = context.match(/[\w가-힣\s]{10,}/g) || []
  longTail.push(...phrases.slice(0, 3))
  
  return longTail.slice(0, 6)
}

/**
 * Question Keywords 생성
 */
function generateQuestionKeywords(primary: string[], context: string): string[] {
  const questions: string[] = []
  const questionWords = ['무엇', '어떻게', '왜', '언제', '어디서', '누가', '어떤']
  
  primary.forEach(keyword => {
    questionWords.forEach(qw => {
      questions.push(`${keyword}은(는) ${qw}?`)
    })
    questions.push(`${keyword}의 장점은 무엇인가요?`)
    questions.push(`${keyword}을(를) 어떻게 사용하나요?`)
    questions.push(`${keyword}에 대한 FAQ`)
  })
  
  return questions.slice(0, 10)
}

/**
 * 플랫폼별 최적화 가이드 생성
 */
function generatePlatformOptimizations(
  userPrompt: string,
  keywordAnalysis: KeywordAnalysis,
  options?: BlogOptimizationOptions
): PlatformOptimization {
  const platforms = options?.targetPlatforms || ['all']
  const optimizations: PlatformOptimization = {}
  
  if (platforms.includes('all') || platforms.includes('chatgpt')) {
    optimizations.chatgpt = `ChatGPT 최적화:
- 권위와 신뢰성 강조: 작성자 자격증명, 전문 기관 인용 포함
- 콘텐츠 길이: 1500-2500자 (포괄적 커버리지)
- Primary Source 인용: PubMed, arXiv 등 1차 자료 인용
- Answer-first 구조: 질문에 대한 답변을 먼저 제시
- 통계 및 데이터 포함 (+41% 인용 증대 효과)
- 인용구 추가 (+28% 인용 증대 효과)`
  }
  
  if (platforms.includes('all') || platforms.includes('perplexity')) {
    const freshnessGuide = options?.contentFreshness === 'aggressive'
      ? '콘텐츠는 2-3일 이내 최신 정보로 업데이트되어야 합니다.'
      : options?.contentFreshness === 'regular'
      ? '콘텐츠는 30일 이내 업데이트되어야 합니다 (3.2배 인용 증가).'
      : '콘텐츠는 최소 90일마다 업데이트되어야 합니다.'
    
    optimizations.perplexity = `Perplexity 최적화:
- 신선도(Freshness) 강조: ${freshnessGuide}
- 인라인 인용 형식: [1], [2] 형식의 인용 포함
- 구조: H2→H3→불릿 포인트 (40% 더 많은 인용)
- 업데이트 빈도: ${options?.contentFreshness || 'regular'}`
  }
  
  if (platforms.includes('all') || platforms.includes('claude')) {
    optimizations.claude = `Claude 최적화:
- Primary Source만 인용: 1차 자료만 사용 (91.2% 정확도)
- 인용 개수: 5-8개 (출판사와 연도 포함)
- 투명한 방법론: 연구/분석 방법 명시
- 제한사항 인정: 콘텐츠의 한계점 명확히 기술`
  }
  
  if (platforms.includes('all') || platforms.includes('gemini')) {
    optimizations.gemini = `Gemini 최적화:
- Google Business Profile 통합: 비즈니스 정보 포함
- 사용자 리뷰 및 증언: 고객 후기 추가
- 지역 인용: NAP (이름, 주소, 전화번호) 일관성
- 전통적인 권위 신호: 도메인 권위, 백링크 강조`
  }
  
  if (platforms.includes('all') || platforms.includes('grokipedia')) {
    optimizations.grokipedia = `Grokipedia (xAI) 최적화:
- RAG 기반 인용: 20-30% 더 나은 사실 일관성
- 투명한 버전 히스토리: 콘텐츠 변경 이력 명시
- 라이선싱 정보: CC-BY-SA 등 라이선스 명시
- Primary Source 인용: 출판사와 연도 포함`
  }
  
  return optimizations
}

/**
 * Schema 요구사항 생성
 */
function generateSchemaRequirements(
  userPrompt: string,
  options?: BlogOptimizationOptions
): SchemaRequirements {
  const schemas: SchemaRequirements = {}
  
  if (options?.includeFAQ !== false) {
    schemas.faqPage = true
  }
  
  if (options?.contentType === 'article' || options?.contentType === 'blog') {
    schemas.article = true
  }
  
  if (options?.contentType === 'guide' || options?.contentType === 'tutorial') {
    schemas.howTo = true
  }
  
  if (options?.includeSchema) {
    schemas.breadcrumbList = true
    schemas.organization = true
    if (options?.includeAuthorCredentials) {
      schemas.person = true
    }
    if (options?.geoEnabled && options.location) {
      schemas.localBusiness = true
    }
    if (options?.voiceSearchOptimized) {
      schemas.speakable = true
    }
  }
  
  return schemas
}

/**
 * 콘텐츠 구조 생성
 */
function generateContentStructure(
  userPrompt: string,
  keywordAnalysis: KeywordAnalysis,
  options?: BlogOptimizationOptions
): {
  headings: string[]
  faqQuestions: string[]
  featuredSnippetAnswer?: string
} {
  const headings: string[] = []
  
  // H1: Primary Keyword 기반
  if (keywordAnalysis.primary.length > 0) {
    headings.push(`${keywordAnalysis.primary[0]} 완벽 가이드`)
  } else {
    headings.push(userPrompt.split(' ').slice(0, 5).join(' '))
  }
  
  // H2: 주요 섹션
  headings.push(`${keywordAnalysis.primary[0] || '주제'}란?`)
  headings.push(`${keywordAnalysis.primary[0] || '주제'}의 장점`)
  headings.push(`${keywordAnalysis.primary[0] || '주제'} 활용 방법`)
  headings.push(`${keywordAnalysis.primary[0] || '주제'} FAQ`)
  
  // FAQ 질문 (Question Keywords 활용)
  const faqQuestions = keywordAnalysis.questions.slice(0, 5)
  
  // Featured Snippet 답변 (30-40단어)
  const featuredSnippetAnswer = options?.includeFeaturedSnippet
    ? `${keywordAnalysis.primary[0] || userPrompt}은(는) ${keywordAnalysis.primary.slice(1).join(', ')}를 포함하는 중요한 주제입니다. 이 가이드에서는 ${keywordAnalysis.primary[0]}에 대한 모든 것을 다룹니다.`
    : undefined
  
  return {
    headings,
    faqQuestions,
    featuredSnippetAnswer
  }
}

/**
 * 최적화 체크리스트 생성
 */
function generateOptimizationChecklist(
  options?: BlogOptimizationOptions
): {
  seo: string[]
  geo: string[]
  aio: string[]
  aeo: string[]
} {
  const checklist = {
    seo: [] as string[],
    geo: [] as string[],
    aio: [] as string[],
    aeo: [] as string[]
  }
  
  if (options?.seoEnabled !== false) {
    checklist.seo.push('메타 타이틀에 Primary Keyword 포함 (50-60자)')
    checklist.seo.push('메타 디스크립션에 키워드 자연스럽게 포함 (150-160자)')
    checklist.seo.push('H1 태그에 Primary Keyword 포함')
    checklist.seo.push('H2-H6 태그에 Semantic/LSI Keywords 포함')
    checklist.seo.push('내부 링크 구조 최적화')
    checklist.seo.push('이미지 alt 텍스트에 키워드 포함')
    checklist.seo.push('URL 구조 SEO 친화적')
  }
  
  if (options?.geoEnabled && options.location) {
    checklist.geo.push(`지역 키워드 "${options.location}" 자연스럽게 포함`)
    checklist.geo.push('지역 비즈니스 정보 포함 (주소, 전화번호)')
    checklist.geo.push('Google Maps 연동 정보')
    checklist.geo.push('지역 리뷰 및 증언 포함')
    checklist.geo.push('LocalBusiness Schema 마크업')
  }
  
  if (options?.aioEnabled !== false) {
    checklist.aio.push('Primary Source 인용 (PubMed, arXiv 등)')
    checklist.aio.push('통계 및 데이터 포함 (+41% 인용 증가)')
    checklist.aio.push('인용구 추가 (+28% 인용 증가)')
    checklist.aio.push('작성자 자격증명 포함 (+40% 인용 확률)')
    checklist.aio.push('콘텐츠 신선도 유지 (최신 정보)')
    checklist.aio.push('H2→H3→불릿 구조 (40% 더 많은 인용)')
  }
  
  if (options?.aeoEnabled !== false) {
    checklist.aeo.push('FAQ 섹션 포함 (FAQPage Schema)')
    checklist.aeo.push('질문에 직접 답변하는 구조')
    checklist.aeo.push('Featured Snippet 최적화 (30-40단어 답변)')
    checklist.aeo.push('Voice Search 최적화 (자연어 질문)')
    checklist.aeo.push('Speakable Schema 마크업')
    checklist.aeo.push('Question Keywords 활용')
  }
  
  return checklist
}

/**
 * 메타데이터 제안 생성
 */
function generateMetadata(
  userPrompt: string,
  keywordAnalysis: KeywordAnalysis,
  options?: BlogOptimizationOptions
): OptimizedBlogPrompt['metadata'] {
  const primaryKeyword = keywordAnalysis.primary[0] || userPrompt
  const location = options?.location
  
  const title = location
    ? `${primaryKeyword} ${location} 완벽 가이드 | 최신 정보 2025`
    : `${primaryKeyword} 완벽 가이드 | 최신 정보 2025`
  
  const description = `${primaryKeyword}에 대한 모든 것을 알아보세요. ${location || ''} ${keywordAnalysis.primary.slice(1).join(', ')} 포함한 종합 가이드입니다.`
  
  return {
    title: title.substring(0, 60),
    description: description.substring(0, 160),
    openGraph: {
      title: title.substring(0, 60),
      description: description.substring(0, 160),
      image: 'og-prompt-maker-with-ai.png'
    },
    twitterCard: {
      title: title.substring(0, 70),
      description: description.substring(0, 200),
      image: 'og-prompt-maker-with-ai.png'
    }
  }
}

/**
 * 최적화된 블로그 프롬프트 생성
 */
export function generateOptimizedBlogPrompt(
  userPrompt: string,
  options?: BlogOptimizationOptions
): OptimizedBlogPrompt {
  // 키워드 분석
  const keywordAnalysis = analyzeKeywords(
    userPrompt,
    options?.targetKeyword,
    options?.location,
    options
  )
  
  // 플랫폼별 최적화
  const platformOptimizations = generatePlatformOptimizations(
    userPrompt,
    keywordAnalysis,
    options
  )
  
  // Schema 요구사항
  const schemaRequirements = generateSchemaRequirements(userPrompt, options)
  
  // 콘텐츠 구조
  const contentStructure = generateContentStructure(
    userPrompt,
    keywordAnalysis,
    options
  )
  
  // 최적화 체크리스트
  const optimizationChecklist = generateOptimizationChecklist(options)
  
  // 메타데이터
  const metadata = generateMetadata(userPrompt, keywordAnalysis, options)
  
  // 최적화된 메타 프롬프트 생성
  const metaPrompt = buildMetaPrompt(
    userPrompt,
    keywordAnalysis,
    contentStructure,
    options
  )
  
  // 최적화된 컨텍스트 프롬프트 생성
  const contextPrompt = buildContextPrompt(
    userPrompt,
    keywordAnalysis,
    platformOptimizations,
    schemaRequirements,
    optimizationChecklist,
    options
  )
  
  return {
    metaPrompt,
    contextPrompt,
    keywordAnalysis,
    platformOptimizations,
    schemaRequirements,
    contentStructure,
    metadata,
    optimizationChecklist
  }
}

/**
 * 메타 프롬프트 빌드
 */
function buildMetaPrompt(
  userPrompt: string,
  keywordAnalysis: KeywordAnalysis,
  contentStructure: ReturnType<typeof generateContentStructure>,
  options?: BlogOptimizationOptions
): string {
  const wordCount = options?.wordCount || 2500
  const location = options?.location
  const primaryKeyword = keywordAnalysis.primary[0] || userPrompt
  
  return `당신은 SEO, GEO, AIO, AEO 최적화 전문 블로그 콘텐츠 작가입니다.

주제: ${userPrompt}
${location ? `지역: ${location}` : ''}
목표 키워드: ${primaryKeyword}
${keywordAnalysis.primary.length > 1 ? `보조 키워드: ${keywordAnalysis.primary.slice(1).join(', ')}` : ''}

콘텐츠 요구사항:
- 길이: ${wordCount - 500}~${wordCount + 500}자
- 구조: ${contentStructure.headings.slice(0, 4).join(' → ')}
- FAQ 섹션 포함: ${contentStructure.faqQuestions.slice(0, 3).join(', ')} 등
${contentStructure.featuredSnippetAnswer ? `- Featured Snippet 답변: ${contentStructure.featuredSnippetAnswer.substring(0, 100)}...` : ''}

키워드 전략:
- Primary: ${keywordAnalysis.primary.join(', ')}
${keywordAnalysis.semantic.length > 0 ? `- Semantic: ${keywordAnalysis.semantic.slice(0, 5).join(', ')}` : ''}
${keywordAnalysis.lsi.length > 0 ? `- LSI: ${keywordAnalysis.lsi.slice(0, 5).join(', ')}` : ''}
${keywordAnalysis.longTail.length > 0 ? `- Long-tail: ${keywordAnalysis.longTail.slice(0, 3).join(', ')}` : ''}

고품질의 전문적이고 가치 있는 콘텐츠를 작성해주세요.`
}

/**
 * 컨텍스트 프롬프트 빌드
 */
function buildContextPrompt(
  userPrompt: string,
  keywordAnalysis: KeywordAnalysis,
  platformOptimizations: PlatformOptimization,
  schemaRequirements: SchemaRequirements,
  optimizationChecklist: ReturnType<typeof generateOptimizationChecklist>,
  options?: BlogOptimizationOptions
): string {
  const sections: string[] = []
  
  // SEO 최적화
  if (options?.seoEnabled !== false) {
    sections.push(`\n## SEO 최적화 요구사항\n${optimizationChecklist.seo.map(item => `- ${item}`).join('\n')}`)
  }
  
  // GEO 최적화
  if (options?.geoEnabled && options.location) {
    sections.push(`\n## GEO 최적화 요구사항\n${optimizationChecklist.geo.map(item => `- ${item}`).join('\n')}`)
  }
  
  // AIO 최적화
  if (options?.aioEnabled !== false) {
    sections.push(`\n## AIO (AI Optimization) 최적화 요구사항\n${optimizationChecklist.aio.map(item => `- ${item}`).join('\n')}`)
    
    // 플랫폼별 가이드
    Object.entries(platformOptimizations).forEach(([platform, guide]) => {
      sections.push(`\n### ${platform.toUpperCase()} 최적화\n${guide}`)
    })
  }
  
  // AEO 최적화
  if (options?.aeoEnabled !== false) {
    sections.push(`\n## AEO (Answer Engine Optimization) 최적화 요구사항\n${optimizationChecklist.aeo.map(item => `- ${item}`).join('\n')}`)
  }
  
  // Schema 마크업
  if (options?.includeSchema) {
    const schemaList = Object.entries(schemaRequirements)
      .filter(([_, enabled]) => enabled)
      .map(([schema]) => schema)
    sections.push(`\n## Schema 마크업 요구사항\n필요한 Schema: ${schemaList.join(', ')}`)
  }
  
  // 콘텐츠 구조
  sections.push(`\n## 콘텐츠 구조\n${keywordAnalysis.questions.slice(0, 5).map((q, i) => `${i + 1}. ${q}`).join('\n')}`)
  
  return sections.join('\n')
}

