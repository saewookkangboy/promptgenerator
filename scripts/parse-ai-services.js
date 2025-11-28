/**
 * ai-gen-services.md 파일을 파싱하여 DB에 저장하는 스크립트
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { prisma } = require('../server/db/prisma')

// fingerprint 생성 함수
function generateFingerprint(category, serviceName, apiDocsUrl) {
  const data = `${category}|${serviceName}|${apiDocsUrl}`
  return crypto.createHash('sha256').update(data).digest('hex')
}

// URL 검증 함수 (간단한 형식 검증)
function isValidUrl(url) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

// API 문서 URL 키워드 확인
function hasApiDocsKeyword(url) {
  const keywords = ['api', 'docs', 'documentation', 'reference', 'developer']
  const lowerUrl = url.toLowerCase()
  return keywords.some(keyword => lowerUrl.includes(keyword))
}

// 마크다운 테이블 파싱
function parseMarkdownTable(content, category, headingKeyword) {
  const lines = content.split('\n')
  const services = []
  let inTable = false
  let headerFound = false
  let inSection = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // 섹션 진입/이탈 감지
    if (line.startsWith('##')) {
      const normalized = line.replace(/[#\s\d\)\(]/g, '').toLowerCase()
      const keywordNormalized = headingKeyword.replace(/\s+/g, '').toLowerCase()

      if (normalized.includes(keywordNormalized)) {
        inSection = true
        inTable = false
        headerFound = false
        continue
      }

      if (inSection) {
        // 이미 섹션 안이었고 다른 섹션을 만났으면 종료
        break
      }
    }

    if (!inSection) {
      continue
    }

    // 테이블 시작 감지 (헤더 라인)
    if (line.startsWith('| 서비스 명') || line.startsWith('| 서비스명')) {
      inTable = true
      headerFound = true
      continue
    }

    // 테이블 구분선 건너뛰기
    if (inTable && line.startsWith('|---')) {
      continue
    }

    // 테이블 종료 감지 (빈 줄 또는 다른 섹션)
    if (inTable && line === '') {
      if (headerFound) break
      inTable = false
      continue
    }

    // 테이블 행 파싱
    if (inTable && line.startsWith('|') && headerFound) {
      const cells = line
        .split('|')
        .map(cell => cell.trim())
        .filter(cell => cell !== '')

      if (cells.length >= 3) {
        const serviceName = cells[0]
        const homepageUrl = cells[1]
        const apiDocsUrl = cells[2]

        // 기본 검증
        if (serviceName && homepageUrl && apiDocsUrl) {
          // URL 형식 검증
          if (isValidUrl(homepageUrl) && isValidUrl(apiDocsUrl)) {
            // API 문서 키워드 확인
            if (hasApiDocsKeyword(apiDocsUrl)) {
              // Provider 추출 (URL 기반)
              let provider = '기타'
              if (homepageUrl.includes('openai.com')) provider = 'OpenAI'
              else if (homepageUrl.includes('google.com') || homepageUrl.includes('ai.google.dev')) provider = 'Google'
              else if (homepageUrl.includes('adobe.com')) provider = 'Adobe'
              else if (homepageUrl.includes('aws.amazon.com') || homepageUrl.includes('amazon.com')) provider = 'AWS'
              else if (homepageUrl.includes('stability.ai')) provider = 'Stability AI'
              else if (homepageUrl.includes('ideogram.ai')) provider = 'Ideogram'
              else if (homepageUrl.includes('leonardo.ai')) provider = 'Leonardo.Ai'
              else if (homepageUrl.includes('lumalabs.ai')) provider = 'Luma'
              else if (homepageUrl.includes('runwayml.com')) provider = 'Runway'
              else if (homepageUrl.includes('fal.ai')) provider = 'fal.ai'
              else if (homepageUrl.includes('replicate.com')) provider = 'Replicate'
              else if (homepageUrl.includes('huggingface.co')) provider = 'Hugging Face'

              // API 상태 추정 (기본값은 UNKNOWN, 나중에 검증으로 업데이트)
              let apiStatus = 'UNKNOWN'
              if (apiDocsUrl.includes('waitlist') || apiDocsUrl.includes('limited')) {
                apiStatus = 'GATED'
              } else if (apiDocsUrl.includes('api-reference') || apiDocsUrl.includes('docs/api')) {
                apiStatus = 'PUBLIC'
              }

              // Auth 타입 추정
              let authType = 'UNKNOWN'
              if (apiDocsUrl.includes('oauth') || apiDocsUrl.includes('authentication')) {
                authType = 'OAUTH'
              } else if (apiDocsUrl.includes('api-key') || apiDocsUrl.includes('api_key')) {
                authType = 'API_KEY'
              } else if (apiDocsUrl.includes('aws') || apiDocsUrl.includes('sigv4')) {
                authType = 'AWS_SIGV4'
              }

              services.push({
                category: category.toUpperCase(),
                serviceName,
                homepageUrl,
                apiDocsUrl,
                provider,
                apiStatus,
                authType,
                fingerprint: generateFingerprint(category.toUpperCase(), serviceName, apiDocsUrl),
              })
            }
          }
        }
      }
    }
  }

  return services
}

// 메인 함수
async function parseAndStoreAIServices() {
  try {
    const filePath = path.join(__dirname, '..', 'data', 'ai-gen-services.md')
    
    // 파일이 없으면 사용자에게 안내
    if (!fs.existsSync(filePath)) {
      console.log('⚠️  ai-gen-services.md 파일을 찾을 수 없습니다.')
      console.log(`📁 예상 경로: ${filePath}`)
      console.log('💡 파일을 data/ 디렉토리에 배치해주세요.')
      return
    }

    const content = fs.readFileSync(filePath, 'utf-8')

    // 이미지 서비스 파싱
  const imageServices = parseMarkdownTable(content, 'IMAGE', '이미지생성')
    console.log(`📸 이미지 서비스 ${imageServices.length}개 발견`)

    // 동영상 서비스 파싱
  const videoServices = parseMarkdownTable(content, 'VIDEO', '동영상생성')
    console.log(`🎬 동영상 서비스 ${videoServices.length}개 발견`)

    const allServices = [...imageServices, ...videoServices]
    console.log(`\n📊 총 ${allServices.length}개 서비스 발견\n`)

    // DB에 저장 (upsert)
    let created = 0
    let updated = 0
    let skipped = 0

    for (const service of allServices) {
      try {
        const existing = await prisma.aIService.findUnique({
          where: { fingerprint: service.fingerprint },
        })

        if (existing) {
          // 업데이트
          await prisma.aIService.update({
            where: { fingerprint: service.fingerprint },
            data: {
              ...service,
              updatedAt: new Date(),
            },
          })
          updated++
          console.log(`🔄 업데이트: ${service.serviceName}`)
        } else {
          // 생성
          await prisma.aIService.create({
            data: service,
          })
          created++
          console.log(`✨ 생성: ${service.serviceName}`)
        }
      } catch (error) {
        console.error(`❌ 오류 (${service.serviceName}):`, error.message)
        skipped++
      }
    }

    console.log(`\n✅ 완료:`)
    console.log(`   - 생성: ${created}개`)
    console.log(`   - 업데이트: ${updated}개`)
    console.log(`   - 건너뜀: ${skipped}개`)
  } catch (error) {
    console.error('❌ 파싱 오류:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 실행
if (require.main === module) {
  parseAndStoreAIServices()
    .then(() => {
      console.log('\n🎉 스크립트 실행 완료')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 스크립트 실행 실패:', error)
      process.exit(1)
    })
}

module.exports = { parseAndStoreAIServices }

