// AI 기반 템플릿 자동 생성 및 DB 저장 스크립트
import { PrismaClient } from '@prisma/client'
import { generateTemplatesByCategory, PromptTemplate } from '../server/services/templateGenerator'

// 변수 추출 함수 (서버에서 사용)
function extractVariables(template: PromptTemplate): string[] {
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

const prisma = new PrismaClient()

interface CategoryConfig {
  category: 'text' | 'image' | 'video' | 'engineering'
  count: number
  namePrefix: string
}

const CATEGORY_CONFIGS: CategoryConfig[] = [
  { category: 'text', count: 5, namePrefix: '[AI 추천] 텍스트' },
  { category: 'image', count: 4, namePrefix: '[AI 추천] 이미지' },
  { category: 'video', count: 3, namePrefix: '[AI 추천] 비디오' },
  { category: 'engineering', count: 3, namePrefix: '[AI 추천] 엔지니어링' },
]

async function main() {
  console.log('🤖 AI 템플릿 자동 생성 시작...')

  // Admin 사용자 찾기
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com'
  const admin = await prisma.user.findFirst({
    where: { email: adminEmail },
  })

  if (!admin) {
    console.error('❌ Admin 사용자를 찾을 수 없습니다.')
    process.exit(1)
  }

  console.log(`✅ Admin 사용자 확인: ${admin.email}`)

  let totalCreated = 0
  let totalUpdated = 0

  for (const config of CATEGORY_CONFIGS) {
    console.log(`\n📝 ${config.category} 카테고리 템플릿 생성 중...`)

    try {
      const templates = await generateTemplatesByCategory(config.category, config.count)

      for (let i = 0; i < templates.length; i++) {
        const template = templates[i]
        const variables = extractVariables(template)
        
        const templateName = `${config.namePrefix} - ${template.title}`
        
        // 기존 템플릿 확인 (이름으로)
        const existing = await prisma.template.findFirst({
          where: {
            name: templateName,
            category: config.category,
          },
        })

        if (existing) {
          // 업데이트
          await prisma.template.update({
            where: { id: existing.id },
            data: {
              description: template.description || `${template.title} 템플릿`,
              content: JSON.stringify(template),
              variables: variables,
              version: existing.version + 1,
              updatedAt: new Date(),
            },
          })
          totalUpdated++
          console.log(`  🔄 업데이트: ${templateName}`)
        } else {
          // 생성
          await prisma.template.create({
            data: {
              name: templateName,
              description: template.description || `${template.title} 템플릿`,
              category: config.category,
              content: JSON.stringify(template),
              variables: variables,
              isPublic: true,
              isPremium: false,
              tierRequired: 'FREE',
              authorId: admin.id,
            },
          })
          totalCreated++
          console.log(`  ✅ 생성: ${templateName}`)
        }
      }
    } catch (error: any) {
      console.error(`❌ ${config.category} 카테고리 생성 실패:`, error.message)
    }
  }

  console.log('\n🎉 AI 템플릿 생성 완료!')
  console.log(`   - 생성: ${totalCreated}개`)
  console.log(`   - 업데이트: ${totalUpdated}개`)
  console.log(`   - 총: ${totalCreated + totalUpdated}개`)
}

main()
  .catch((e) => {
    console.error('❌ 스크립트 실행 오류:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

