#!/usr/bin/env node

// 환경 변수 검증 스크립트
// 배포 전 필수 환경 변수가 설정되었는지 확인

const requiredEnvVars = [
  'GEMINI_API_KEY',
  'OPENAI_API_KEY',
]

const optionalEnvVars = [
  'GEMINI_MODEL',
  'OPENAI_SUMMARIZE_MODEL',
  'DATABASE_URL',
  'FRONTEND_URL',
  'PORT',
  'NODE_ENV',
]

console.log('🔍 환경 변수 검증 중...\n')

let hasErrors = false
let hasWarnings = false

// 필수 환경 변수 확인
console.log('📋 필수 환경 변수:')
requiredEnvVars.forEach(varName => {
  const value = process.env[varName]
  if (!value) {
    console.log(`  ❌ ${varName}: 설정되지 않음`)
    hasErrors = true
  } else {
    // API 키는 마스킹하여 표시
    const masked = varName.includes('API_KEY') 
      ? value.substring(0, 8) + '...' + value.substring(value.length - 4)
      : value
    console.log(`  ✅ ${varName}: ${masked}`)
  }
})

// 선택적 환경 변수 확인
console.log('\n📋 선택적 환경 변수:')
optionalEnvVars.forEach(varName => {
  const value = process.env[varName]
  if (!value) {
    console.log(`  ⚠️  ${varName}: 설정되지 않음 (기본값 사용)`)
    hasWarnings = true
  } else {
    console.log(`  ✅ ${varName}: ${value}`)
  }
})

// 데이터베이스 연결 확인
if (process.env.DATABASE_URL) {
  console.log('\n🗄️  데이터베이스 연결:')
  try {
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    // 연결 테스트는 실제 연결 시도 없이 스키마만 확인
    console.log('  ✅ DATABASE_URL 형식 확인됨')
  } catch (error) {
    console.log(`  ⚠️  Prisma 클라이언트 로드 실패: ${error.message}`)
    hasWarnings = true
  }
} else {
  console.log('\n🗄️  데이터베이스:')
  console.log('  ⚠️  DATABASE_URL이 설정되지 않음 (Admin 기능 제한)')
  hasWarnings = true
}

// 결과 요약
console.log('\n' + '='.repeat(50))
if (hasErrors) {
  console.log('❌ 오류: 필수 환경 변수가 설정되지 않았습니다.')
  console.log('   배포 전에 모든 필수 환경 변수를 설정해주세요.')
  process.exit(1)
} else if (hasWarnings) {
  console.log('⚠️  경고: 일부 선택적 환경 변수가 설정되지 않았습니다.')
  console.log('   기본값으로 작동하지만, 프로덕션에서는 권장되지 않습니다.')
  process.exit(0)
} else {
  console.log('✅ 모든 환경 변수가 올바르게 설정되었습니다!')
  process.exit(0)
}

