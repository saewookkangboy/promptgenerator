// Admin 계정 업데이트 스크립트
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function updateAdmin() {
  try {
    console.log('🔐 Admin 계정 업데이트 시작...')

    const adminEmail = 'chunghyo@troe.kr'
    const adminPassword = 'pch912712Q!'

    // 비밀번호 해시 생성
    const passwordHash = await bcrypt.hash(adminPassword, 10)

    // Admin 계정 생성 또는 업데이트
    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        passwordHash: passwordHash,
        tier: 'ENTERPRISE',
        subscriptionStatus: 'ACTIVE',
        subscriptionStartedAt: new Date(),
      },
      create: {
        email: adminEmail,
        passwordHash: passwordHash,
        name: 'Admin User',
        tier: 'ENTERPRISE',
        subscriptionStatus: 'ACTIVE',
        subscriptionStartedAt: new Date(),
      },
    })

    console.log('✅ Admin 계정 업데이트 완료!')
    console.log(`   이메일: ${admin.email}`)
    console.log(`   이름: ${admin.name || 'N/A'}`)
    console.log(`   Tier: ${admin.tier}`)
    console.log(`   상태: ${admin.subscriptionStatus}`)
    console.log(`   생성일: ${admin.createdAt}`)
  } catch (error) {
    console.error('❌ Admin 계정 업데이트 오류:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

updateAdmin()

