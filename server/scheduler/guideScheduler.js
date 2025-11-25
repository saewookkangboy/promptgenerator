// 서버 사이드 가이드 수집 스케줄러

const cron = require('node-cron')
const { collectAllGuides } = require('../scraper/guideScraper')

// 매일 새벽 3시에 가이드 수집
const COLLECTION_SCHEDULE = '0 3 * * *' // cron 표현식: 매일 03:00

// 스케줄러 초기화
function initializeScheduler() {
  console.log('📅 가이드 수집 스케줄러 초기화...')
  console.log(`스케줄: 매일 새벽 3시 (${COLLECTION_SCHEDULE})`)
  
  // cron job 설정
  cron.schedule(COLLECTION_SCHEDULE, async () => {
    console.log('\n⏰ 스케줄된 가이드 수집 시작...')
    console.log(`시간: ${new Date().toLocaleString('ko-KR')}`)
    
    try {
      const results = await collectAllGuides()
      
      // 결과 요약
      const successCount = results.filter(r => r.success).length
      const failCount = results.filter(r => !r.success).length
      
      console.log(`\n✅ 수집 완료:`)
      console.log(`   성공: ${successCount}개`)
      console.log(`   실패: ${failCount}개`)
      
      // 성공한 가이드 출력
      results.filter(r => r.success).forEach(result => {
        console.log(`   ✓ ${result.modelName}`)
      })
      
      // 실패한 가이드 출력
      if (failCount > 0) {
        console.log(`\n❌ 실패한 모델:`)
        results.filter(r => !r.success).forEach(result => {
          console.log(`   ✗ ${result.modelName}: ${result.error}`)
        })
      }
      
    } catch (error) {
      console.error('❌ 스케줄된 수집 중 오류:', error)
    }
    
    console.log(`\n다음 수집 일정: 내일 새벽 3시\n`)
  }, {
    scheduled: true,
    timezone: 'Asia/Seoul',
  })
  
  console.log('✅ 스케줄러가 활성화되었습니다\n')
}

// 수집 상태 조회
function getCollectionStatus() {
  return {
    scheduled: true,
    schedule: COLLECTION_SCHEDULE,
    nextRun: getNextRunTime(),
    timezone: 'Asia/Seoul',
  }
}

// 다음 실행 시간 계산
function getNextRunTime() {
  const now = new Date()
  const next = new Date(now)
  next.setHours(3, 0, 0, 0)
  
  // 오늘 3시가 지났으면 내일 3시
  if (next <= now) {
    next.setDate(next.getDate() + 1)
  }
  
  return next.toISOString()
}

module.exports = {
  initializeScheduler,
  getCollectionStatus,
}

