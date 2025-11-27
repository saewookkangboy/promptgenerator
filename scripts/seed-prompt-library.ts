// 프롬프트 라이브러리 시드 스크립트
// prompt_library_top5.md 파일의 템플릿들을 데이터베이스에 저장

import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

interface TemplateData {
  id: string
  name: string
  description: string
  category: string
  prompt: string
  isTop5: boolean
  priority?: number
}

// 마크다운 파일 파싱
function parseMarkdownFile(filePath: string): TemplateData[] {
  const content = readFileSync(filePath, 'utf-8')
  const templates: TemplateData[] = []

  // Top 5 템플릿 파싱
  const top5SectionMatch = content.match(/# 2\) Top 5[\s\S]*?# 3\) 전체 15종 템플릿/)
  if (top5SectionMatch) {
    const top5Section = top5SectionMatch[0]
    // 라인별로 파싱
    const lines = top5Section.split('\n')
    let currentTemplate: Partial<TemplateData> | null = null
    let inPromptBlock = false
    let promptLines: string[] = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Top N) 헤더 찾기
      const topMatch = line.match(/^## Top (\d+)\)\s+(.+?)\s+[—\-]\s+(.+?)\s+\(ID:\s+([^)]+)\)/)
      if (topMatch) {
        // 이전 템플릿 저장
        if (currentTemplate && promptLines.length > 0) {
          currentTemplate.prompt = promptLines.join('\n').trim()
          if (currentTemplate.prompt) {
            templates.push(currentTemplate as TemplateData)
          }
        }
        
        const priority = parseInt(topMatch[1])
        const categoryName = topMatch[2].trim()
        const name = topMatch[3].trim()
        const id = topMatch[4].trim()
        
        // 카테고리 결정
        let category = 'text'
        const fullName = `${categoryName} ${name}`
        if (fullName.includes('마케팅') || fullName.includes('소셜') || fullName.includes('콘텐츠')) {
          category = 'text'
        } else if (fullName.includes('데이터') || fullName.includes('시각화')) {
          category = 'text'
        } else if (fullName.includes('프로젝트') || fullName.includes('리스크')) {
          category = 'engineering'
        } else if (fullName.includes('운영') || fullName.includes('프로세스')) {
          category = 'engineering'
        }
        
        currentTemplate = {
          id,
          name: `[Top ${priority}] ${categoryName} — ${name}`,
          description: `${categoryName} — ${name} - 실무 사용 빈도가 높고 자동화 확장성이 뛰어난 템플릿`,
          category,
          prompt: '',
          isTop5: true,
          priority,
        }
        promptLines = []
        inPromptBlock = false
        continue
      }
      
      // 프롬프트 블록 시작
      if (line.trim() === '```text') {
        inPromptBlock = true
        promptLines = []
        continue
      }
      
      // 프롬프트 블록 종료
      if (inPromptBlock && line.trim() === '```') {
        inPromptBlock = false
        continue
      }
      
      // 프롬프트 내용 수집
      if (inPromptBlock && currentTemplate) {
        promptLines.push(line)
      }
    }
    
    // 마지막 템플릿 저장
    if (currentTemplate && promptLines.length > 0) {
      currentTemplate.prompt = promptLines.join('\n').trim()
      if (currentTemplate.prompt) {
        templates.push(currentTemplate as TemplateData)
      }
    }
  }

  // 전체 15종 템플릿 파싱
  const allTemplatesSectionMatch = content.match(/# 3\) 전체 15종 템플릿[\s\S]*?## 4\) 변경 이력/)
  if (allTemplatesSectionMatch) {
    const allTemplatesSection = allTemplatesSectionMatch[0]
    const lines = allTemplatesSection.split('\n')
    let currentTemplate: Partial<TemplateData> | null = null
    let inPromptBlock = false
    let promptLines: string[] = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // ## N) 헤더 찾기
      const templateMatch = line.match(/^## (\d+)\)\s+(.+?)\s+\(ID:\s+([^)]+)\)/)
      if (templateMatch) {
        // 이전 템플릿 저장
        if (currentTemplate && promptLines.length > 0) {
          currentTemplate.prompt = promptLines.join('\n').trim()
          if (currentTemplate.prompt && !templates.some(t => t.id === currentTemplate!.id)) {
            templates.push(currentTemplate as TemplateData)
          }
        }
        
        const number = parseInt(templateMatch[1])
        const name = templateMatch[2].trim()
        const id = templateMatch[3].trim()
        
        // 이미 Top 5에 포함된 템플릿은 스킵
        if (templates.some(t => t.id === id)) {
          currentTemplate = null
          continue
        }
        
        // 카테고리 결정
        let category = 'text'
        if (name.includes('소프트웨어') || name.includes('개발')) {
          category = 'engineering'
        } else if (name.includes('프로젝트') || name.includes('리스크')) {
          category = 'engineering'
        } else if (name.includes('운영') || name.includes('프로세스')) {
          category = 'engineering'
        } else if (name.includes('제품')) {
          category = 'engineering'
        }
        
        currentTemplate = {
          id,
          name,
          description: `${name} 템플릿`,
          category,
          prompt: '',
          isTop5: false,
        }
        promptLines = []
        inPromptBlock = false
        continue
      }
      
      // 프롬프트 블록 시작
      if (line.trim() === '```text') {
        inPromptBlock = true
        promptLines = []
        continue
      }
      
      // 프롬프트 블록 종료
      if (inPromptBlock && line.trim() === '```') {
        inPromptBlock = false
        continue
      }
      
      // 프롬프트 내용 수집
      if (inPromptBlock && currentTemplate) {
        promptLines.push(line)
      }
    }
    
    // 마지막 템플릿 저장
    if (currentTemplate && promptLines.length > 0) {
      currentTemplate.prompt = promptLines.join('\n').trim()
      if (currentTemplate.prompt && !templates.some(t => t.id === currentTemplate!.id)) {
        templates.push(currentTemplate as TemplateData)
      }
    }
  }

  return templates
}

// PromptTemplate 형식으로 변환
function convertToPromptTemplate(template: TemplateData) {
  const sections = []
  
  // 프롬프트를 섹션으로 나눔
  const lines = template.prompt.split('\n').filter(line => line.trim())
  
  let currentSection = {
    key: 'main',
    title: '프롬프트',
    content: template.prompt,
  }
  
  sections.push(currentSection)
  
  return {
    title: template.name,
    description: template.description,
    sections: sections.map(s => ({
      key: s.key,
      title: s.title,
      content: s.content,
    })),
  }
}

async function main() {
  console.log('🌱 프롬프트 라이브러리 시드 시작...')

  const filePath = join(process.cwd(), 'prompt_library_top5.md')
  const templates = parseMarkdownFile(filePath)

  console.log(`📚 총 ${templates.length}개의 템플릿을 발견했습니다.`)

  // Admin 사용자 찾기
  const adminEmail = process.env.ADMIN_EMAIL || 'chunghyo@troe.kr'
  const admin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (!admin) {
    console.error('❌ Admin 사용자를 찾을 수 없습니다.')
    process.exit(1)
  }

  console.log(`✅ Admin 사용자 확인: ${admin.email}`)

  // 템플릿 저장
  let created = 0
  let updated = 0
  let skipped = 0

  for (const templateData of templates) {
    try {
      const promptTemplate = convertToPromptTemplate(templateData)
      
      // 변수 추출
      const variables: string[] = []
      const variableRegex = /\{\{(\w+)\}\}/g
      let match
      while ((match = variableRegex.exec(templateData.prompt)) !== null) {
        if (!variables.includes(match[1])) {
          variables.push(match[1])
        }
      }

      // 기존 템플릿 확인 (이름으로)
      const existing = await prisma.template.findFirst({
        where: {
          name: templateData.name,
        },
      })

      if (existing) {
        // 업데이트
        await prisma.template.update({
          where: { id: existing.id },
          data: {
            description: templateData.description,
            category: templateData.category,
            content: JSON.stringify(promptTemplate),
            variables: variables,
            isPublic: true,
            isPremium: templateData.isTop5,
            tierRequired: templateData.isTop5 ? 'BASIC' : 'FREE',
            version: existing.version + 1,
          },
        })
        updated++
        console.log(`🔄 업데이트: ${templateData.name}`)
      } else {
        // 생성
        await prisma.template.create({
          data: {
            name: templateData.name,
            description: templateData.description,
            category: templateData.category,
            content: JSON.stringify(promptTemplate),
            variables: variables,
            isPublic: true,
            isPremium: templateData.isTop5,
            tierRequired: templateData.isTop5 ? 'BASIC' : 'FREE',
            authorId: admin.id,
          },
        })
        created++
        console.log(`✅ 생성: ${templateData.name}`)
      }
    } catch (error: any) {
      console.error(`❌ 오류 (${templateData.name}):`, error.message)
      skipped++
    }
  }

  console.log('\n🎉 프롬프트 라이브러리 시드 완료!')
  console.log(`   - 생성: ${created}개`)
  console.log(`   - 업데이트: ${updated}개`)
  console.log(`   - 스킵: ${skipped}개`)
}

main()
  .catch((e) => {
    console.error('❌ 시드 실행 오류:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

