// 마케팅 및 커머스 관련 프롬프트 템플릿 생성 스크립트
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface TemplateInput {
  name: string
  description: string
  category: 'marketing' | 'commerce'
  content: {
    title: string
    description?: string
    sections: Array<{
      key: string
      title: string
      content: string
      helperText?: string
    }>
  }
  variables: string[]
  isPublic: boolean
  isPremium: boolean
  isTop5?: boolean
}

const marketingTemplates: TemplateInput[] = [
  {
    name: '[AI 추천] 소셜 미디어 마케팅 캠페인 프롬프트',
    description: '소셜 미디어 플랫폼별 최적화된 마케팅 캠페인 콘텐츠를 생성합니다. 타겟 오디언스, 캠페인 목표, 플랫폼 특성을 고려한 맞춤형 프롬프트를 제공합니다.',
    category: 'marketing',
    content: {
      title: '{{campaignName}} 소셜 미디어 마케팅 캠페인',
      description: '{{targetAudience}}를 대상으로 {{campaignGoal}}을 달성하기 위한 {{platform}} 마케팅 콘텐츠를 생성합니다.',
      sections: [
        {
          key: 'campaign_objective',
          title: '캠페인 목표',
          content: '이 캠페인의 핵심 목표는 {{campaignGoal}}입니다. {{targetMetric}}을(를) {{targetValue}}% 향상시키는 것을 목표로 합니다.',
          helperText: '브랜드 인지도, 참여도, 전환율, 리드 생성 등 구체적인 목표를 명시하세요.'
        },
        {
          key: 'target_audience',
          title: '타겟 오디언스',
          content: '주요 타겟은 {{targetAudience}}입니다. {{demographics}} 특성을 가진 사용자들에게 {{painPoints}} 문제를 해결하는 메시지를 전달합니다.',
          helperText: '연령, 성별, 관심사, 구매 행동 등 타겟 그룹의 특성을 상세히 설명하세요.'
        },
        {
          key: 'platform_strategy',
          title: '플랫폼 전략',
          content: '{{platform}} 플랫폼의 특성에 맞춰 {{contentType}} 형식으로 콘텐츠를 제작합니다. {{bestPractices}}를 반영하여 최적화합니다.',
          helperText: '인스타그램(시각적), 페이스북(커뮤니티), 링크드인(전문성), 트위터(실시간) 등 플랫폼별 특성을 고려하세요.'
        },
        {
          key: 'key_messages',
          title: '핵심 메시지',
          content: '{{brandValue}}를 강조하며, {{uniqueSellingPoint}}를 중심으로 {{callToAction}}을 유도합니다.',
          helperText: '브랜드의 고유 가치와 차별화 포인트를 명확히 전달하세요.'
        },
        {
          key: 'content_guidelines',
          title: '콘텐츠 가이드라인',
          content: '톤앤매너: {{toneOfVoice}}, 길이: {{contentLength}}, 해시태그: {{hashtags}}, CTA: {{callToAction}}',
          helperText: '플랫폼별 최적 길이와 형식을 준수하세요.'
        }
      ]
    },
    variables: ['campaignName', 'targetAudience', 'campaignGoal', 'targetMetric', 'targetValue', 'demographics', 'painPoints', 'platform', 'contentType', 'bestPractices', 'brandValue', 'uniqueSellingPoint', 'callToAction', 'toneOfVoice', 'contentLength', 'hashtags'],
    isPublic: true,
    isPremium: false,
    isTop5: true
  },
  {
    name: '[AI 추천] 이메일 마케팅 캠페인 프롬프트',
    description: '오픈율과 클릭률을 높이는 이메일 마케팅 캠페인을 위한 프롬프트입니다. 제목, 본문, CTA를 최적화합니다.',
    category: 'marketing',
    content: {
      title: '{{emailType}} 이메일 마케팅 캠페인',
      description: '{{targetSegment}}를 대상으로 {{emailPurpose}}를 달성하기 위한 이메일을 작성합니다.',
      sections: [
        {
          key: 'subject_line',
          title: '제목 라인',
          content: '{{subjectLine}} - {{valueProposition}}을(를) 강조하여 오픈율을 극대화합니다.',
          helperText: '개인화, 긴급성, 호기심 유발, 가치 제안 등 오픈율을 높이는 요소를 포함하세요.'
        },
        {
          key: 'preheader',
          title: '프리헤더',
          content: '{{preheaderText}} - 제목과 함께 이메일 미리보기에 표시될 텍스트입니다.',
          helperText: '제목을 보완하고 추가 가치를 제공하는 짧은 문구를 작성하세요.'
        },
        {
          key: 'opening',
          title: '오프닝',
          content: '{{greeting}} {{personalization}}를 통해 개인화된 인사로 시작합니다.',
          helperText: '수신자의 이름, 최근 활동, 관심사 등을 활용하여 개인화하세요.'
        },
        {
          key: 'value_proposition',
          title: '가치 제안',
          content: '{{benefit}}을(를) 제공하여 {{problem}} 문제를 해결합니다. {{proof}}를 통해 신뢰를 구축합니다.',
          helperText: '구체적인 혜택과 증거(통계, 리뷰, 사례)를 제시하세요.'
        },
        {
          key: 'call_to_action',
          title: '행동 유도 (CTA)',
          content: '{{ctaText}} - 명확하고 실행 가능한 다음 단계를 제시합니다.',
          helperText: '버튼 텍스트는 액션 지향적이고 긴급감을 조성하세요.'
        }
      ]
    },
    variables: ['emailType', 'targetSegment', 'emailPurpose', 'subjectLine', 'valueProposition', 'preheaderText', 'greeting', 'personalization', 'benefit', 'problem', 'proof', 'ctaText'],
    isPublic: true,
    isPremium: false
  },
  {
    name: '[AI 추천] 콘텐츠 마케팅 전략 프롬프트',
    description: 'SEO 최적화된 블로그 포스트, 기사, 가이드 등 콘텐츠 마케팅 자료를 생성하는 프롬프트입니다.',
    category: 'marketing',
    content: {
      title: '{{contentType}} 콘텐츠 마케팅 전략',
      description: '{{targetKeyword}}를 타겟으로 {{contentGoal}}을 달성하는 콘텐츠를 작성합니다.',
      sections: [
        {
          key: 'content_goal',
          title: '콘텐츠 목표',
          content: '이 콘텐츠는 {{primaryGoal}}을(를) 목표로 하며, {{secondaryGoals}}도 함께 달성합니다.',
          helperText: '브랜드 인지도, 트래픽 유도, 리드 생성, 권위 구축 등 목표를 명확히 하세요.'
        },
        {
          key: 'target_keywords',
          title: '타겟 키워드',
          content: '주요 키워드: {{primaryKeyword}}, 보조 키워드: {{secondaryKeywords}}, 롱테일 키워드: {{longTailKeywords}}',
          helperText: 'SEO를 위해 주요 키워드와 관련 키워드를 자연스럽게 배치하세요.'
        },
        {
          key: 'content_structure',
          title: '콘텐츠 구조',
          content: '{{introduction}} → {{mainPoints}} → {{examples}} → {{conclusion}} → {{cta}}',
          helperText: '독자의 관심을 끄는 도입부, 가치 있는 본문, 구체적인 예시, 명확한 결론 순서로 구성하세요.'
        },
        {
          key: 'audience_engagement',
          title: '오디언스 참여',
          content: '{{targetAudience}}의 {{painPoints}}와 {{interests}}를 다루며, {{engagementElements}}를 포함합니다.',
          helperText: '질문, 설문, 댓글 유도, 공유 버튼 등 참여 요소를 추가하세요.'
        }
      ]
    },
    variables: ['contentType', 'targetKeyword', 'contentGoal', 'primaryGoal', 'secondaryGoals', 'primaryKeyword', 'secondaryKeywords', 'longTailKeywords', 'introduction', 'mainPoints', 'examples', 'conclusion', 'cta', 'targetAudience', 'painPoints', 'interests', 'engagementElements'],
    isPublic: true,
    isPremium: false
  }
]

const commerceTemplates: TemplateInput[] = [
  {
    name: '[AI 추천] 제품 상세 페이지 프롬프트',
    description: '전환율을 높이는 제품 상세 페이지 콘텐츠를 생성합니다. 제품 특징, 혜택, 리뷰를 효과적으로 전달합니다.',
    category: 'commerce',
    content: {
      title: '{{productName}} 제품 상세 페이지',
      description: '{{targetCustomer}}를 대상으로 {{productCategory}} 제품의 가치를 전달하는 상세 페이지를 작성합니다.',
      sections: [
        {
          key: 'product_headline',
          title: '제품 헤드라인',
          content: '{{headline}} - {{uniqueValue}}을(를) 강조하는 강력한 헤드라인입니다.',
          helperText: '제품의 핵심 가치와 차별화 포인트를 한 문장으로 전달하세요.'
        },
        {
          key: 'product_features',
          title: '제품 특징',
          content: '{{feature1}}, {{feature2}}, {{feature3}} 등 주요 특징을 {{benefits}} 관점에서 설명합니다.',
          helperText: '기능보다는 고객이 얻는 혜택과 가치를 강조하세요.'
        },
        {
          key: 'social_proof',
          title: '사회적 증거',
          content: '{{testimonials}}, {{reviews}}, {{ratings}}, {{awards}}를 통해 신뢰를 구축합니다.',
          helperText: '고객 리뷰, 평점, 수상 내역, 판매량 등 신뢰 요소를 포함하세요.'
        },
        {
          key: 'pricing_strategy',
          title: '가격 전략',
          content: '{{pricing}} - {{valueProposition}}을(를) 강조하며 {{urgency}}를 조성합니다.',
          helperText: '가격의 가치를 명확히 전달하고, 한정 특가, 재고 부족 등 긴급성을 활용하세요.'
        },
        {
          key: 'purchase_cta',
          title: '구매 유도',
          content: '{{ctaButton}} - {{guarantee}}와 {{shippingInfo}}를 포함하여 구매 장벽을 낮춥니다.',
          helperText: '명확한 CTA 버튼, 보장 정책, 배송 정보를 제공하세요.'
        }
      ]
    },
    variables: ['productName', 'targetCustomer', 'productCategory', 'headline', 'uniqueValue', 'feature1', 'feature2', 'feature3', 'benefits', 'testimonials', 'reviews', 'ratings', 'awards', 'pricing', 'valueProposition', 'urgency', 'ctaButton', 'guarantee', 'shippingInfo'],
    isPublic: true,
    isPremium: false,
    isTop5: true
  },
  {
    name: '[AI 추천] 쇼핑몰 상품 설명 프롬프트',
    description: '온라인 쇼핑몰 상품 카탈로그를 위한 최적화된 상품 설명을 생성합니다.',
    category: 'commerce',
    content: {
      title: '{{productName}} 쇼핑몰 상품 설명',
      description: '{{platform}} 플랫폼에 최적화된 {{productType}} 상품 설명을 작성합니다.',
      sections: [
        {
          key: 'product_summary',
          title: '상품 요약',
          content: '{{shortDescription}} - {{keyBenefit}}을(를) 제공하는 {{productCategory}}입니다.',
          helperText: '한눈에 파악할 수 있는 간결한 요약을 제공하세요.'
        },
        {
          key: 'product_specifications',
          title: '상품 사양',
          content: '{{specs}} - {{materials}}, {{dimensions}}, {{weight}}, {{colors}} 등 상세 정보를 제공합니다.',
          helperText: '구매 결정에 필요한 모든 사양 정보를 체계적으로 나열하세요.'
        },
        {
          key: 'usage_scenarios',
          title: '사용 시나리오',
          content: '{{useCase1}}, {{useCase2}}, {{useCase3}} 등 다양한 사용 상황을 제시합니다.',
          helperText: '고객이 제품을 실제로 어떻게 사용할 수 있는지 구체적인 시나리오를 제공하세요.'
        },
        {
          key: 'care_instructions',
          title: '관리 방법',
          content: '{{careTips}} - 제품의 수명을 연장하기 위한 관리 가이드를 제공합니다.',
          helperText: '세탁, 보관, 사용 시 주의사항 등을 명확히 안내하세요.'
        }
      ]
    },
    variables: ['productName', 'platform', 'productType', 'shortDescription', 'keyBenefit', 'productCategory', 'specs', 'materials', 'dimensions', 'weight', 'colors', 'useCase1', 'useCase2', 'useCase3', 'careTips'],
    isPublic: true,
    isPremium: false
  },
  {
    name: '[AI 추천] 프로모션 이메일 프롬프트',
    description: '세일, 할인, 신제품 출시 등 프로모션 이메일을 작성하는 프롬프트입니다.',
    category: 'commerce',
    content: {
      title: '{{promotionType}} 프로모션 이메일',
      description: '{{promotionDetails}}를 전달하는 고전환율 프로모션 이메일을 작성합니다.',
      sections: [
        {
          key: 'promotion_headline',
          title: '프로모션 헤드라인',
          content: '{{headline}} - {{discountAmount}} 할인 또는 {{promotionOffer}}을(를) 강조합니다.',
          helperText: '할인율, 특가, 한정 오퍼 등 프로모션의 핵심을 명확히 전달하세요.'
        },
        {
          key: 'urgency_creation',
          title: '긴급성 조성',
          content: '{{deadline}}까지, {{limitedQuantity}} 한정, {{earlyBird}} 특가 등 긴급성을 강조합니다.',
          helperText: '시간 제한, 수량 제한, 선착순 등 구매를 촉진하는 요소를 활용하세요.'
        },
        {
          key: 'product_showcase',
          title: '제품 소개',
          content: '{{featuredProducts}} - {{productBenefits}}을(를) 강조하며 {{socialProof}}를 포함합니다.',
          helperText: '프로모션 대상 제품의 핵심 가치와 고객 리뷰를 함께 제시하세요.'
        },
        {
          key: 'promotion_terms',
          title: '프로모션 조건',
          content: '{{terms}} - {{eligibility}}, {{exclusions}}, {{validity}} 등 조건을 명확히 안내합니다.',
          helperText: '프로모션 참여 자격, 제외 항목, 유효 기간 등을 투명하게 공개하세요.'
        },
        {
          key: 'conversion_cta',
          title: '전환 유도',
          content: '{{ctaText}} - {{easySteps}}로 간편하게 구매할 수 있도록 안내합니다.',
          helperText: '명확한 CTA와 간단한 구매 프로세스를 제시하세요.'
        }
      ]
    },
    variables: ['promotionType', 'promotionDetails', 'headline', 'discountAmount', 'promotionOffer', 'deadline', 'limitedQuantity', 'earlyBird', 'featuredProducts', 'productBenefits', 'socialProof', 'terms', 'eligibility', 'exclusions', 'validity', 'ctaText', 'easySteps'],
    isPublic: true,
    isPremium: false
  },
  {
    name: '[AI 추천] 장바구니 포기 방지 이메일 프롬프트',
    description: '장바구니에 담았지만 구매를 완료하지 않은 고객을 위한 리마케팅 이메일 프롬프트입니다.',
    category: 'commerce',
    content: {
      title: '{{customerName}}님의 장바구니가 기다리고 있어요',
      description: '장바구니 포기를 줄이고 전환율을 높이는 리마케팅 이메일을 작성합니다.',
      sections: [
        {
          key: 'reminder_message',
          title: '리마인더 메시지',
          content: '{{personalizedGreeting}} - {{abandonedItems}}이(가) 장바구니에 남아있습니다.',
          helperText: '친근하고 개인화된 톤으로 고객을 다시 유도하세요.'
        },
        {
          key: 'cart_contents',
          title: '장바구니 내용',
          content: '{{itemList}} - 총 {{totalAmount}} 상품이 장바구니에 담겨있습니다.',
          helperText: '장바구니에 담긴 제품 목록과 총 금액을 명확히 표시하세요.'
        },
        {
          key: 'incentive_offer',
          title: '인센티브 제공',
          content: '{{specialOffer}} - {{discountCode}} 또는 {{freeShipping}}을(를) 제공합니다.',
          helperText: '할인 코드, 무료 배송, 추가 혜택 등을 제공하여 구매를 유도하세요.'
        },
        {
          key: 'urgency_reminder',
          title: '긴급성 상기',
          content: '{{stockAlert}}, {{priceChange}}, {{expiryNotice}} 등 구매를 촉진하는 정보를 제공합니다.',
          helperText: '재고 부족, 가격 변동, 프로모션 만료 등 긴급성을 조성하세요.'
        },
        {
          key: 'easy_checkout',
          title: '간편 결제 안내',
          content: '{{checkoutLink}} - {{paymentOptions}}로 빠르고 안전하게 결제할 수 있습니다.',
          helperText: '원클릭 체크아웃, 다양한 결제 수단 등을 강조하세요.'
        }
      ]
    },
    variables: ['customerName', 'personalizedGreeting', 'abandonedItems', 'itemList', 'totalAmount', 'specialOffer', 'discountCode', 'freeShipping', 'stockAlert', 'priceChange', 'expiryNotice', 'checkoutLink', 'paymentOptions'],
    isPublic: true,
    isPremium: false
  }
]

async function seedTemplates() {
  console.log('마케팅 및 커머스 템플릿 생성 시작...')

  try {
    // 기존 템플릿 확인 (중복 방지)
    const existingTemplates = await prisma.template.findMany({
      where: {
        category: {
          in: ['marketing', 'commerce']
        }
      },
      select: {
        name: true
      }
    })

    const existingNames = new Set(existingTemplates.map(t => t.name))

    // 마케팅 템플릿 생성
    for (const template of marketingTemplates) {
      if (existingNames.has(template.name)) {
        console.log(`템플릿 "${template.name}" 이미 존재 - 건너뜀`)
        continue
      }

      await prisma.template.create({
        data: {
          name: template.name,
          description: template.description,
          category: template.category,
          content: JSON.stringify(template.content),
          variables: template.variables as any,
          isPublic: template.isPublic,
          isPremium: template.isPremium,
          usageCount: 0,
          rating: 0,
          version: 1,
          history: []
        }
      })

      console.log(`✅ 마케팅 템플릿 생성: ${template.name}`)
    }

    // 커머스 템플릿 생성
    for (const template of commerceTemplates) {
      if (existingNames.has(template.name)) {
        console.log(`템플릿 "${template.name}" 이미 존재 - 건너뜀`)
        continue
      }

      await prisma.template.create({
        data: {
          name: template.name,
          description: template.description,
          category: template.category,
          content: JSON.stringify(template.content),
          variables: template.variables as any,
          isPublic: template.isPublic,
          isPremium: template.isPremium,
          usageCount: 0,
          rating: 0,
          version: 1,
          history: []
        }
      })

      console.log(`✅ 커머스 템플릿 생성: ${template.name}`)
    }

    console.log('✅ 모든 템플릿 생성 완료!')
  } catch (error) {
    console.error('❌ 템플릿 생성 실패:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seedTemplates()
  .then(() => {
    console.log('스크립트 실행 완료')
    process.exit(0)
  })
  .catch((error) => {
    console.error('스크립트 실행 실패:', error)
    process.exit(1)
  })
