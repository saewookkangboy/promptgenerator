#!/usr/bin/env node

// 배포 전 체크리스트 검증 스크립트

const fs = require('fs')
const path = require('path')

console.log('🚀 배포 전 체크리스트 검증\n')
console.log('='.repeat(50))

let allPassed = true

// 1. 필수 파일 확인
console.log('\n📁 필수 파일 확인:')
const requiredFiles = [
  'package.json',
  'server/index.js',
  'railway.json',
  'prisma/schema.prisma',
]

requiredFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file)
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`)
  } else {
    console.log(`  ❌ ${file} (없음)`)
    allPassed = false
  }
})

// 2. package.json 확인
console.log('\n📦 package.json 확인:')
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  
  if (packageJson.scripts && packageJson.scripts.start) {
    console.log('  ✅ start 스크립트 존재')
  } else {
    console.log('  ❌ start 스크립트 없음')
    allPassed = false
  }
  
  const requiredDeps = ['express', 'cors', 'dotenv']
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      console.log(`  ✅ ${dep} 설치됨`)
    } else {
      console.log(`  ⚠️  ${dep} 없음 (선택적)`)
    }
  })
} catch (error) {
  console.log(`  ❌ package.json 파싱 실패: ${error.message}`)
  allPassed = false
}

// 3. railway.json 확인
console.log('\n🚂 Railway 설정 확인:')
try {
  const railwayJson = JSON.parse(fs.readFileSync('railway.json', 'utf8'))
  
  if (railwayJson.deploy && railwayJson.deploy.startCommand) {
    console.log(`  ✅ startCommand: ${railwayJson.deploy.startCommand}`)
  } else {
    console.log('  ⚠️  startCommand 없음 (기본값 사용)')
  }
} catch (error) {
  console.log(`  ⚠️  railway.json 파싱 실패: ${error.message}`)
}

// 4. 서버 파일 확인
console.log('\n🖥️  서버 파일 확인:')
try {
  const serverFile = fs.readFileSync('server/index.js', 'utf8')
  
  if (serverFile.includes('process.env.PORT')) {
    console.log('  ✅ PORT 환경 변수 사용')
  } else {
    console.log('  ⚠️  PORT 환경 변수 사용 안 함')
  }
  
  if (serverFile.includes('cors')) {
    console.log('  ✅ CORS 설정됨')
  } else {
    console.log('  ⚠️  CORS 설정 없음')
  }
} catch (error) {
  console.log(`  ❌ server/index.js 읽기 실패: ${error.message}`)
  allPassed = false
}

// 5. Prisma 스키마 확인
console.log('\n🗄️  Prisma 스키마 확인:')
try {
  if (fs.existsSync('prisma/schema.prisma')) {
    const schema = fs.readFileSync('prisma/schema.prisma', 'utf8')
    if (schema.includes('datasource db')) {
      console.log('  ✅ datasource 설정됨')
    } else {
      console.log('  ⚠️  datasource 설정 없음')
    }
  } else {
    console.log('  ⚠️  prisma/schema.prisma 없음 (데이터베이스 미사용 가능)')
  }
} catch (error) {
  console.log(`  ⚠️  Prisma 스키마 확인 실패: ${error.message}`)
}

// 결과
console.log('\n' + '='.repeat(50))
if (allPassed) {
  console.log('✅ 모든 체크리스트 통과!')
  console.log('\n다음 단계:')
  console.log('1. Railway에 프로젝트 배포')
  console.log('2. 환경 변수 설정')
  console.log('3. 데이터베이스 마이그레이션 실행')
  process.exit(0)
} else {
  console.log('❌ 일부 체크리스트 실패')
  console.log('   배포 전에 위 항목들을 확인해주세요.')
  process.exit(1)
}

