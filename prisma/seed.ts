// Prisma 시드 파일 - 초기 데이터 생성
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 데이터베이스 시드 시작...')

  // Admin 사용자 생성
  const adminEmail = process.env.ADMIN_EMAIL || 'chunghyo@troe.kr'
  const adminPassword = process.env.ADMIN_PASSWORD || 'pch912712Q!'
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10)
  
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: adminPasswordHash,
      tier: 'ENTERPRISE',
      subscriptionStatus: 'ACTIVE',
      subscriptionStartedAt: new Date(),
    },
    create: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      name: 'Admin User',
      tier: 'ENTERPRISE',
      subscriptionStatus: 'ACTIVE',
      subscriptionStartedAt: new Date(),
    },
  })

  console.log('✅ Admin 사용자 생성:', admin.email)

  // 샘플 사용자 생성 (테스트용)
  const sampleUsers = [
    {
      email: 'user1@example.com',
      name: 'Test User 1',
      tier: 'BASIC' as const,
    },
    {
      email: 'user2@example.com',
      name: 'Test User 2',
      tier: 'PROFESSIONAL' as const,
    },
  ]

  for (const userData of sampleUsers) {
    const password = await bcrypt.hash('password123', 10)
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        passwordHash: password,
        name: userData.name,
        tier: userData.tier,
        subscriptionStatus: 'ACTIVE',
        subscriptionStartedAt: new Date(),
      },
    })
    console.log(`✅ 샘플 사용자 생성: ${user.email}`)
  }

  // 샘플 템플릿 생성
  const templates = [
    {
      name: '블로그 포스트 템플릿',
      description: 'SEO 최적화된 블로그 포스트 작성 템플릿',
      category: 'text',
      content: '주제: {{topic}}\n타겟 독자: {{audience}}\n길이: {{length}}자\n\n{{content}}',
      variables: ['topic', 'audience', 'length', 'content'],
      isPublic: true,
      isPremium: false,
      tierRequired: 'FREE' as const,
      authorId: admin.id,
    },
    {
      name: 'Midjourney 이미지 프롬프트',
      description: '고품질 Midjourney 이미지 생성 프롬프트',
      category: 'image',
      content: '{{subject}}, {{style}}, {{lighting}}, {{composition}}, --v 6 --ar 16:9',
      variables: ['subject', 'style', 'lighting', 'composition'],
      isPublic: true,
      isPremium: true,
      tierRequired: 'BASIC' as const,
      authorId: admin.id,
    },
  ]

  for (const templateData of templates) {
    const template = await prisma.template.create({
      data: templateData,
    })
    console.log(`✅ 템플릿 생성: ${template.name}`)
  }

  console.log('🎉 데이터베이스 시드 완료!')
}

main()
  .catch((e) => {
    console.error('❌ 시드 실행 오류:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

