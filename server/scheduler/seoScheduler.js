const cron = require('node-cron')
const { buildSeoMetadata } = require('../utils/seoMetaGenerator')

async function runSeoJob(trigger = 'manual') {
  try {
    await buildSeoMetadata({ reason: trigger })
  } catch (error) {
    console.error('[SEO Scheduler] 실행 오류:', error)
  }
}

// 서버 시작 시 한 번 실행
runSeoJob('server-startup')

// 매일 오전 5시(KST 기준) 실행
cron.schedule('0 5 * * *', () => runSeoJob('daily-cron'))

console.log('✅ SEO 메타 스케줄러 초기화 완료')

module.exports = {
  runSeoJob,
}

