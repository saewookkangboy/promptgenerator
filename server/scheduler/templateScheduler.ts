// 템플릿 학습 스케줄러
import cron from 'node-cron'
import { prisma } from '../db/prisma'
import { log } from '../utils/logger'

// 매일 새벽 2시: 템플릿 사용 패턴 분석
cron.schedule('0 2 * * *', async () => {
  log.info({ type: 'template_scheduler', task: 'usage_analysis' }, '템플릿 사용 패턴 분석 시작...')
  
  try {
    const templates = await prisma.template.findMany({
      where: { isPublic: true },
    })

    log.debug({ type: 'template_scheduler', templateCount: templates.length }, '분석 대상 템플릿 수')

    let analyzedCount = 0
    for (const template of templates) {
      try {
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

        analyzedCount++
      } catch (templateError: any) {
        log.error({ 
          type: 'template_scheduler', 
          templateId: template.id,
          error: templateError.message 
        }, '템플릿 분석 중 오류 발생 (계속 진행)')
      }
    }

    log.info({ 
      type: 'template_scheduler', 
      task: 'usage_analysis',
      analyzedCount,
      totalCount: templates.length 
    }, '템플릿 사용 패턴 분석 완료')
  } catch (error: any) {
    log.error({ 
      type: 'template_scheduler', 
      task: 'usage_analysis',
      error: error.message,
      stack: error.stack 
    }, '템플릿 사용 패턴 분석 오류')
  }
})

// 매주 월요일: 템플릿 품질 평가
cron.schedule('0 3 * * 1', async () => {
  log.info({ type: 'template_scheduler', task: 'quality_evaluation' }, '템플릿 품질 평가 시작...')
  
  try {
    const templates = await prisma.template.findMany({
      where: { isPublic: true },
    })

    let evaluatedCount = 0
    for (const template of templates) {
      try {
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

        evaluatedCount++
      } catch (templateError: any) {
        log.error({ 
          type: 'template_scheduler', 
          templateId: template.id,
          error: templateError.message 
        }, '템플릿 품질 평가 중 오류 발생 (계속 진행)')
      }
    }

    log.info({ 
      type: 'template_scheduler', 
      task: 'quality_evaluation',
      evaluatedCount,
      totalCount: templates.length 
    }, '템플릿 품질 평가 완료')
  } catch (error: any) {
    log.error({ 
      type: 'template_scheduler', 
      task: 'quality_evaluation',
      error: error.message,
      stack: error.stack 
    }, '템플릿 품질 평가 오류')
  }
})

// 매주 화요일 새벽 4시: AI 템플릿 자동 생성 (학습 기반)
cron.schedule('0 4 * * 2', async () => {
  log.info({ type: 'template_scheduler', task: 'auto_generation' }, 'AI 템플릿 자동 생성 시작...')
  
  try {
    const { generateTemplatesByCategory, generateTemplateWithLearning } = require('../services/templateGenerator')
    
    // Admin 사용자 찾기
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com'
    const admin = await prisma.user.findFirst({
      where: { email: adminEmail },
    })

    if (!admin) {
      log.error({ type: 'template_scheduler', adminEmail }, 'Admin 사용자를 찾을 수 없습니다.')
      return
    }

    log.debug({ type: 'template_scheduler', adminId: admin.id }, 'Admin 사용자 확인 완료')

    const categories: Array<'text' | 'image' | 'video' | 'engineering'> = ['text', 'image', 'video', 'engineering']
    const counts = { text: 3, image: 2, video: 2, engineering: 2 } // 주간 생성 개수

    let totalCreated = 0
    let totalFailed = 0

    for (const category of categories) {
      try {
        log.debug({ type: 'template_scheduler', category, count: counts[category] }, '카테고리별 템플릿 생성 시작')

        // 기존 성공 템플릿 학습 데이터 수집
        const successfulTemplates = await prisma.template.findMany({
          where: {
            category: category,
            isPublic: true,
            rating: { gte: 70 }, // 평점 70 이상인 템플릿
          },
          orderBy: { rating: 'desc' },
          take: 5, // 상위 5개만 학습
        })

        log.debug({ 
          type: 'template_scheduler', 
          category, 
          learningTemplates: successfulTemplates.length 
        }, '학습 데이터 수집 완료')

        // 학습 데이터를 활용한 템플릿 생성
        const templates = successfulTemplates.length > 0
          ? await generateTemplateWithLearning(category, counts[category], successfulTemplates)
          : await generateTemplatesByCategory(category, counts[category])

        for (const template of templates) {
          try {
            // 변수 추출
            const variables: string[] = []
            const variableRegex = /\{\{(\w+)\}\}/g
            const checkText = (text: string) => {
              let match
              while ((match = variableRegex.exec(text)) !== null) {
                if (!variables.includes(match[1])) {
                  variables.push(match[1])
                }
              }
            }
            
            if (template.title) checkText(template.title)
            if (template.description) checkText(template.description)
            template.sections.forEach((section: any) => {
              if (section.content) checkText(section.content)
              if (section.helperText) checkText(section.helperText)
            })

            const templateName = `[AI 추천] ${category === 'text' ? '텍스트' : category === 'image' ? '이미지' : category === 'video' ? '비디오' : '엔지니어링'} - ${template.title}`
            
            // 기존 템플릿 확인
            const existing = await prisma.template.findFirst({
              where: {
                name: templateName,
                category: category,
              },
            })

            if (!existing) {
              await prisma.template.create({
                data: {
                  name: templateName,
                  description: template.description || `${template.title} 템플릿`,
                  category: category,
                  content: JSON.stringify(template),
                  variables: variables,
                  isPublic: true,
                  isPremium: false,
                  tierRequired: 'FREE',
                  authorId: admin.id,
                },
              })
              totalCreated++
              log.info({ 
                type: 'template_scheduler', 
                category, 
                templateName 
              }, '템플릿 생성 완료')
            } else {
              log.debug({ 
                type: 'template_scheduler', 
                category, 
                templateName 
              }, '기존 템플릿 존재 (생성 건너뜀)')
            }
          } catch (templateError: any) {
            totalFailed++
            log.error({ 
              type: 'template_scheduler', 
              category,
              error: templateError.message 
            }, '템플릿 저장 실패')
          }
        }
      } catch (error: any) {
        totalFailed++
        log.error({ 
          type: 'template_scheduler', 
          category,
          error: error.message,
          stack: error.stack 
        }, '카테고리별 템플릿 생성 실패')
      }
    }

    log.info({ 
      type: 'template_scheduler', 
      task: 'auto_generation',
      totalCreated,
      totalFailed 
    }, `AI 템플릿 생성 완료: ${totalCreated}개 생성, ${totalFailed}개 실패`)
  } catch (error: any) {
    log.error({ 
      type: 'template_scheduler', 
      task: 'auto_generation',
      error: error.message,
      stack: error.stack 
    }, 'AI 템플릿 생성 오류')
  }
})

log.info({ type: 'template_scheduler' }, '템플릿 스케줄러 초기화 완료')

