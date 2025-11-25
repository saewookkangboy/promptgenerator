// 텍스트 콘텐츠 프롬프트 생성기

import { BasePromptGenerator } from '../base/BasePromptGenerator'
import { BasePromptOptions, PromptResult, ContentType, DetailedOptions } from '../../types/prompt.types'
import { addEnglishVersion } from '../../utils/englishTranslator'

const CONTENT_TYPE_INFO: Record<
  ContentType,
  {
    name: string
    englishName: string
    requirements: string
    requirementsEn: string
  }
> = {
  blog: {
    name: '블로그 콘텐츠',
    englishName: 'Blog Content',
    requirements: 'SEO, GEO, AEO에 맞춰서 2000~3000자 텍스트 작성, 타겟 질문 포함',
    requirementsEn: 'Write a 2000-3000 character article optimized for SEO, GEO, and AEO. Include direct answers to potential reader questions.',
  },
  linkedin: {
    name: '링크드인 뉴스피드 콘텐츠',
    englishName: 'LinkedIn Newsfeed Content',
    requirements: '전문적이고 비즈니스 중심의 콘텐츠',
    requirementsEn: 'Provide professional, business-focused insights that encourage networking and discussion.',
  },
  facebook: {
    name: '페이스북 뉴스피드 콘텐츠',
    englishName: 'Facebook Newsfeed Content',
    requirements: '친근하고 공유하기 좋은 콘텐츠',
    requirementsEn: 'Craft friendly, shareable content that encourages reactions and comments.',
  },
  instagram: {
    name: '인스타그램 뉴스피드 콘텐츠',
    englishName: 'Instagram Feed Content',
    requirements: '시각적이고 간결한 콘텐츠',
    requirementsEn: 'Deliver concise, visually-driven storytelling that pairs well with imagery and hashtags.',
  },
  youtube: {
    name: '유튜브 영상 제목 및 설명 텍스트',
    englishName: 'YouTube Title and Description',
    requirements: '검색 최적화된 제목과 상세한 설명',
    requirementsEn: 'Provide search-optimized titles and detailed descriptions that drive watch time and engagement.',
  },
  general: {
    name: '일반 텍스트',
    englishName: 'General Text',
    requirements: '자연어 프롬프트 기반의 비정형 텍스트 생성, 특정 플랫폼 제약 없음',
    requirementsEn: 'Generate unstructured text based on natural language prompts without platform-specific constraints.',
  },
}

export class TextPromptGenerator extends BasePromptGenerator {
  /**
   * 텍스트 콘텐츠 프롬프트 생성
   * 기존 인터페이스와의 호환성을 위해 DetailedOptions도 지원
   */
  generate(options: BasePromptOptions | (BasePromptOptions & { contentType?: ContentType; detailedOptions?: DetailedOptions })): PromptResult {
    // 기존 인터페이스 호환성 처리
    const contentType = 'contentType' in options ? options.contentType || 'blog' : 'blog'
    const detailedOptions = 'detailedOptions' in options ? options.detailedOptions : undefined
    
    // BasePromptOptions로 변환
    const baseOptions: BasePromptOptions & { toneStyles?: string[] } = {
      category: 'text',
      userInput: options.userInput,
      targetAudience: options.targetAudience || (detailedOptions ? {
        age: detailedOptions.age,
        gender: detailedOptions.gender,
        occupation: detailedOptions.occupation,
      } : undefined),
      conversational: options.conversational ?? detailedOptions?.conversational ?? false,
      toneStyles: detailedOptions?.toneStyles,
    }

    const typeInfo = CONTENT_TYPE_INFO[contentType]
    
    // 타겟 독자 정보 구성
    const targetAudience = this.buildTargetAudience(baseOptions.targetAudience)
    
    // 톤앤매너 설정
    const toneAndStyle = this.buildToneAndStyle(baseOptions)
    
    // 메타 프롬프트 생성
    const metaPrompt = `당신은 ${typeInfo.name} 전문 작가입니다. 
다음 주제와 요구사항을 바탕으로 고품질의 콘텐츠를 작성해주세요.

주제: ${baseOptions.userInput}
${targetAudience ? `\n타겟 독자: ${targetAudience}` : ''}

요구사항:
- ${typeInfo.requirements}
- 독자의 관심을 끌고 참여를 유도하는 내용
- 명확하고 이해하기 쉬운 구조
- 타겟 독자에게 가치를 제공하는 정보
${toneAndStyle ? `- ${toneAndStyle}` : ''}

콘텐츠를 작성할 때 다음을 고려해주세요:
1. 독자의 니즈와 관심사${baseOptions.targetAudience ? ' (타겟 독자 특성 반영)' : ''}
2. 명확한 메시지 전달
3. 적절한 톤앤매너${baseOptions.conversational ? ' (대화체 사용)' : ''}
4. 행동 유도 요소 포함`

    // 컨텍스트 프롬프트 생성
    const contextPrompt = `콘텐츠 작성 컨텍스트:

콘텐츠 유형: ${typeInfo.name}
원본 주제: ${baseOptions.userInput}
${targetAudience ? `타겟 독자: ${targetAudience}` : ''}
${toneAndStyle ? `톤앤매너: ${toneAndStyle}` : ''}

작성 가이드라인:
${this.getContentGuidelines(contentType)}

구조 요구사항:
${this.getStructureRequirements(contentType)}

스타일 가이드:
- 자연스럽고 읽기 쉬운 문체
${baseOptions.conversational ? '- 대화체 사용 (구어체, 친근한 표현)' : '- 정중하고 명확한 문체'}
- 적절한 문단 구분
- 핵심 메시지 강조
- 독자 참여 유도`

    // 해시태그 생성
    const hashtags = this.generateHashtags(baseOptions.userInput, contentType)

    const targetAudienceEn = this.buildTargetAudienceEnglish(baseOptions.targetAudience)
    const toneAndStyleEn = this.buildToneAndStyleEnglish(baseOptions)
    const englishMetaPrompt = this.buildEnglishMetaPrompt(
      baseOptions,
      typeInfo,
      targetAudienceEn,
      toneAndStyleEn
    )
    const englishContextPrompt = this.buildEnglishContextPrompt(
      baseOptions,
      contentType,
      typeInfo,
      targetAudienceEn,
      toneAndStyleEn
    )

    const result = {
      metaPrompt,
      contextPrompt,
      hashtags,
      // contentType은 PromptResult의 확장 필드로 추가됨
    }

    // 영문 버전 추가
    return addEnglishVersion(result, {
      metaPrompt: englishMetaPrompt,
      contextPrompt: englishContextPrompt,
    })
  }

  /**
   * 콘텐츠 가이드라인 반환
   */
  private getContentGuidelines(contentType: ContentType): string {
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

  /**
   * 구조 요구사항 반환
   */
  private getStructureRequirements(contentType: ContentType): string {
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
      default:
        return ''
    }
  }

  /**
   * 영어 메타 프롬프트 생성
   */
  private buildEnglishMetaPrompt(
    options: BasePromptOptions,
    typeInfo: (typeof CONTENT_TYPE_INFO)[ContentType],
    targetAudienceEn: string,
    toneAndStyleEn: string
  ): string {
    return `You are a ${typeInfo.englishName} specialist.
Use the subject and requirements below to craft high-quality content.

Subject: ${options.userInput}
${targetAudienceEn ? `Target audience: ${targetAudienceEn}` : ''}

Requirements:
- ${typeInfo.requirementsEn}
- Capture the reader's attention and encourage engagement
- Provide a clear structure that is easy to follow
- Deliver actionable value to the audience
${toneAndStyleEn ? `- Tone & Style: ${toneAndStyleEn}` : ''}

When writing, consider:
1. The reader's needs and interests${options.targetAudience ? ' (reflect the audience profile)' : ''}
2. A focused, memorable core message
3. A tone that matches the reader's expectations${options.conversational ? ' (use conversational language)' : ''}
4. A clear call-to-action or next step`
  }

  /**
   * 영어 컨텍스트 프롬프트 생성
   */
  private buildEnglishContextPrompt(
    options: BasePromptOptions,
    contentType: ContentType,
    typeInfo: (typeof CONTENT_TYPE_INFO)[ContentType],
    targetAudienceEn: string,
    toneAndStyleEn: string
  ): string {
    return `Content creation context:

Content type: ${typeInfo.englishName}
Original subject: ${options.userInput}
${targetAudienceEn ? `Target audience: ${targetAudienceEn}` : ''}
${toneAndStyleEn ? `Tone & Style: ${toneAndStyleEn}` : ''}

Guidelines:
${this.getContentGuidelinesEn(contentType)}

Structure requirements:
${this.getStructureRequirementsEn(contentType)}

Style guide:
- Use natural, easy-to-read language
${options.conversational ? '- Conversational tone (friendly, spoken language)' : '- Polished, professional tone'}
- Separate content into clear paragraphs or sections
- Highlight the core message
- Encourage reader engagement`
  }

  /**
   * 콘텐츠 가이드라인 (영문)
   */
  private getContentGuidelinesEn(contentType: ContentType): string {
    switch (contentType) {
      case 'blog':
        return `- SEO optimization: incorporate relevant keywords naturally
- GEO optimization: include local insights and location-based terms
- AEO optimization: answer potential reader questions directly
- Length: 2000-3000 characters
- Include answers to questions the target audience might ask`
      case 'linkedin':
        return `- Maintain a professional, trustworthy tone
- Share industry insights and expertise
- Encourage networking and community discussion
- Highlight tangible business value`
      case 'facebook':
        return `- Friendly, conversational tone
- Provide content worth sharing
- Ask questions that invite reactions and comments
- Pair text with visuals or links`
      case 'instagram':
        return `- Keep messages concise and impactful
- Align copy with visual storytelling
- Optimize the use of hashtags
- Include emotional or sensory details`
      case 'youtube':
        return `- Craft search-optimized titles with core keywords
- Make titles clickable and curiosity-driven
- Provide detailed descriptions with key timestamps
- Include relevant links and CTAs`
      case 'general':
        return `- Generate free-form text based on natural language prompts
- Faithfully reflect user intent without platform or format constraints
- Allow unstructured sentence structures
- Use creative and flexible expression methods
- Prioritize the context and intent of the user's natural language prompt`
      default:
        return ''
    }
  }

  /**
   * 구조 요구사항 (영문)
   */
  private getStructureRequirementsEn(contentType: ContentType): string {
    switch (contentType) {
      case 'blog':
        return `1. Compelling headline
2. Introduction that hooks the reader
3. Body sections with clear subheadings
4. Answers to key audience questions
5. Conclusion with a call-to-action`
      case 'linkedin':
        return `1. Strong opening line
2. Core message or insight
3. Supporting evidence or experience
4. Closing question or discussion prompt`
      case 'facebook':
        return `1. Attention-grabbing first sentence
2. Main value proposition
3. Social proof or emotional hook
4. Engagement-driving statement`
      case 'instagram':
        return `1. Impactful opening sentence
2. Core message in 2-3 lines
3. Storytelling or descriptive detail
4. Call-to-action or question`
      case 'youtube':
        return `Title:
- Include primary keyword
- Keep within 60 characters
- Emphasize curiosity or value

Description:
- Summarize value in first 2-3 lines
- Provide detailed context
- Add relevant links or resources`
      case 'general':
        return `- Generate natural text without structural constraints
- Respond flexibly according to the user's natural language prompt
- No fixed rules for sentence length, format, or structure
- Prioritize user intent and context above all`
      default:
        return ''
    }
  }
}

