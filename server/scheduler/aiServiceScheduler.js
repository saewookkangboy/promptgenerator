/**
 * AI 서비스 정보 주 1회 자동 업데이트 스케줄러
 */

const cron = require('node-cron')
const axios = require('axios')
const { parseAndStoreAIServices } = require('../../scripts/parse-ai-services')
const { prisma } = require('../db/prisma')

/**
 * URL 검증 및 HTTP 상태 확인
 */
async function validateServiceUrls(service) {
  try {
    // Homepage URL 검증
    let httpStatusHome = null
    try {
      const homeResponse = await axios.head(service.homepageUrl, {
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: () => true, // 모든 상태 코드 허용
      })
      httpStatusHome = homeResponse.status
    } catch (error) {
      // HEAD 실패 시 GET 시도
      try {
        const homeResponse = await axios.get(service.homepageUrl, {
          timeout: 10000,
          maxRedirects: 5,
          validateStatus: () => true,
        })
        httpStatusHome = homeResponse.status
      } catch {
        httpStatusHome = null
      }
    }

    // API Docs URL 검증
    let httpStatusDocs = null
    try {
      const docsResponse = await axios.head(service.apiDocsUrl, {
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: () => true,
      })
      httpStatusDocs = docsResponse.status
    } catch (error) {
      // HEAD 실패 시 GET 시도
      try {
        const docsResponse = await axios.get(service.apiDocsUrl, {
          timeout: 10000,
          maxRedirects: 5,
          validateStatus: () => true,
        })
        httpStatusDocs = docsResponse.status
      } catch {
        httpStatusDocs = null
      }
    }

    // API 상태 업데이트
    let apiStatus = service.apiStatus
    if (httpStatusDocs === 200) {
      apiStatus = 'PUBLIC'
    } else if (httpStatusDocs === 403 || httpStatusDocs === 401) {
      apiStatus = 'GATED'
    } else if (httpStatusDocs === 404 || httpStatusDocs === 410) {
      apiStatus = 'UNKNOWN'
    }

    return {
      httpStatusHome,
      httpStatusDocs,
      apiStatus,
      lastVerifiedAt: new Date(),
    }
  } catch (error) {
    console.error(`URL 검증 오류 (${service.serviceName}):`, error.message)
    return {
      httpStatusHome: null,
      httpStatusDocs: null,
      apiStatus: service.apiStatus,
      lastVerifiedAt: new Date(),
    }
  }
}

/**
 * 모든 서비스 URL 검증 및 업데이트
 */
async function validateAllServices() {
  try {
    const services = await prisma.aIService.findMany({
      where: { isActive: true },
    })

    console.log(`\n🔍 ${services.length}개 서비스 URL 검증 시작...`)

    let updated = 0
    let failed = 0

    for (const service of services) {
      try {
        const validation = await validateServiceUrls(service)

        await prisma.aIService.update({
          where: { id: service.id },
          data: {
            httpStatusHome: validation.httpStatusHome,
            httpStatusDocs: validation.httpStatusDocs,
            apiStatus: validation.apiStatus,
            lastVerifiedAt: validation.lastVerifiedAt,
            updatedAt: new Date(),
          },
        })

        updated++
        console.log(`✅ ${service.serviceName}: ${validation.httpStatusDocs || 'N/A'}`)
      } catch (error) {
        failed++
        console.error(`❌ ${service.serviceName}: ${error.message}`)
      }

      // Rate limiting: 요청 간 500ms 대기
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    console.log(`\n✅ 검증 완료: ${updated}개 성공, ${failed}개 실패`)
  } catch (error) {
    console.error('❌ 서비스 검증 오류:', error)
  }
}

/**
 * 전체 업데이트 작업 실행
 */
async function runAIServiceUpdate(trigger = 'manual') {
  try {
    console.log(`\n🚀 AI 서비스 업데이트 시작 (트리거: ${trigger})`)
    console.log(`📅 시간: ${new Date().toISOString()}\n`)

    // 1. 마크다운 파일 파싱 및 DB 저장
    console.log('📖 마크다운 파일 파싱 중...')
    await parseAndStoreAIServices()

    // 2. URL 검증 및 상태 업데이트
    console.log('\n🔍 URL 검증 중...')
    await validateAllServices()

    console.log('\n✅ AI 서비스 업데이트 완료')
  } catch (error) {
    console.error('❌ AI 서비스 업데이트 오류:', error)
    throw error
  }
}

// 서버 시작 시 한 번 실행 (옵션)
// runAIServiceUpdate('server-startup')

// 매주 월요일 오전 9시(KST 기준) 실행
// cron 표현식: '0 9 * * 1' (매주 월요일 9시)
cron.schedule('0 9 * * 1', () => runAIServiceUpdate('weekly-cron'))

console.log('✅ AI 서비스 스케줄러 초기화 완료 (매주 월요일 9시 실행)')

module.exports = {
  runAIServiceUpdate,
  validateAllServices,
}

