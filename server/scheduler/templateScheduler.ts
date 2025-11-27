// 템플릿 학습 스케줄러
import cron from 'node-cron'
import { prisma } from '../db/prisma'

// 매일 새벽 2시: 템플릿 사용 패턴 분석
cron.schedule('0 2 * * *', async () => {
  console.log('[Template Scheduler] 템플릿 사용 패턴 분석 시작...')
  
  try {
    const templates = await prisma.template.findMany({
      where: { isPublic: true },
    })

    for (const template of templates) {
      // 최근 30일간의 사용 데이터 수집
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const usageData = await prisma.analytics.findMany({
        where: {
          eventType: 'TEMPLATE_USED',
          eventData: {
            path: ['templateId'],
            equals: template.id,
          },
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      })

      // 변수 사용 패턴 분석
      const variableUsage: Record<string, number> = {}
      let totalQualityScore = 0
      let qualityScoreCount = 0

      usageData.forEach(event => {
        const eventData = event.eventData as any
        const variables = eventData?.variables || {}
        Object.keys(variables).forEach(key => {
          variableUsage[key] = (variableUsage[key] || 0) + 1
        })

        if (eventData?.qualityScore) {
          totalQualityScore += eventData.qualityScore
          qualityScoreCount++
        }
      })

      // 평균 품질 점수 계산
      const averageQuality = qualityScoreCount > 0
        ? totalQualityScore / qualityScoreCount
        : null

      // 가장 많이 사용된 변수
      const mostUsedVariables = Object.entries(variableUsage)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([key]) => key)

      // 템플릿 메타데이터 업데이트 (history 필드 활용)
      const currentHistory = (template.history as any) || []
      const analysisEntry = {
        timestamp: new Date().toISOString(),
        type: 'usage_analysis',
        variableUsage,
        mostUsedVariables,
        averageQuality,
        usageCount30Days: usageData.length,
      }
      
      await prisma.template.update({
        where: { id: template.id },
        data: {
          history: [...currentHistory, analysisEntry].slice(-50), // 최근 50개만 유지
        },
      })
    }

    console.log('[Template Scheduler] 템플릿 사용 패턴 분석 완료')
  } catch (error) {
    console.error('[Template Scheduler] 오류:', error)
  }
})

// 매주 월요일: 템플릿 품질 평가
cron.schedule('0 3 * * 1', async () => {
  console.log('[Template Scheduler] 템플릿 품질 평가 시작...')
  
  try {
    const templates = await prisma.template.findMany({
      where: { isPublic: true },
    })

    for (const template of templates) {
      const usageData = await prisma.analytics.findMany({
        where: {
          eventType: 'TEMPLATE_USED',
          eventData: {
            path: ['templateId'],
            equals: template.id,
          },
        },
      })

      if (usageData.length === 0) continue

      // 품질 점수 계산
      const qualityScores = usageData
        .map(e => {
          const eventData = e.eventData as any
          return eventData?.qualityScore
        })
        .filter((score): score is number => typeof score === 'number')

      const averageQuality = qualityScores.length > 0
        ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
        : 0

      // 완성도 계산 (변수 입력 완료율)
      const templateVariables = (template.variables as string[]) || []
      const completionRate = usageData.length > 0
        ? usageData.filter(e => {
            const eventData = e.eventData as any
            const variables = eventData?.variables || {}
            return templateVariables.every(v => variables[v])
          }).length / usageData.length
        : 0

      // 종합 점수 계산
      const overallScore = (averageQuality * 0.6) + (completionRate * 100 * 0.4)

      const currentHistory = (template.history as any) || []
      const evaluationEntry = {
        timestamp: new Date().toISOString(),
        type: 'quality_evaluation',
        averageQuality,
        completionRate,
        overallScore,
      }
      
      await prisma.template.update({
        where: { id: template.id },
        data: {
          rating: overallScore,
          history: [...currentHistory, evaluationEntry].slice(-50), // 최근 50개만 유지
        },
      })
    }

    console.log('[Template Scheduler] 템플릿 품질 평가 완료')
  } catch (error) {
    console.error('[Template Scheduler] 오류:', error)
  }
})

console.log('✅ 템플릿 스케줄러 초기화 완료')

