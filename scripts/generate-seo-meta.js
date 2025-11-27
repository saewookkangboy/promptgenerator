#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') })

const { buildSeoMetadata } = require('../server/utils/seoMetaGenerator')

buildSeoMetadata({ reason: 'cli-command' })
  .then((payload) => {
    console.log('SEO 메타 데이터 생성 완료:', {
      generatedAt: payload.generatedAt,
      keywords: payload.metaKeywords.slice(0, 10),
    })
    process.exit(0)
  })
  .catch((error) => {
    console.error('SEO 메타 데이터 생성 실패:', error)
    process.exit(1)
  })

