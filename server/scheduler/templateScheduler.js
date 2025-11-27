"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// 템플릿 학습 스케줄러
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_1 = require("../db/prisma");
// 매일 새벽 2시: 템플릿 사용 패턴 분석
node_cron_1.default.schedule('0 2 * * *', async () => {
    console.log('[Template Scheduler] 템플릿 사용 패턴 분석 시작...');
    try {
        const templates = await prisma_1.prisma.template.findMany({
            where: { isPublic: true },
        });
        for (const template of templates) {
            // 최근 30일간의 사용 데이터 수집
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const usageData = await prisma_1.prisma.analytics.findMany({
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
            });
            // 변수 사용 패턴 분석
            const variableUsage = {};
            let totalQualityScore = 0;
            let qualityScoreCount = 0;
            usageData.forEach(event => {
                const eventData = event.eventData;
                const variables = eventData?.variables || {};
                Object.keys(variables).forEach(key => {
                    variableUsage[key] = (variableUsage[key] || 0) + 1;
                });
                if (eventData?.qualityScore) {
                    totalQualityScore += eventData.qualityScore;
                    qualityScoreCount++;
                }
            });
            // 평균 품질 점수 계산
            const averageQuality = qualityScoreCount > 0
                ? totalQualityScore / qualityScoreCount
                : null;
            // 가장 많이 사용된 변수
            const mostUsedVariables = Object.entries(variableUsage)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([key]) => key);
            // 템플릿 메타데이터 업데이트 (history 필드 활용)
            const currentHistory = template.history || [];
            const analysisEntry = {
                timestamp: new Date().toISOString(),
                type: 'usage_analysis',
                variableUsage,
                mostUsedVariables,
                averageQuality,
                usageCount30Days: usageData.length,
            };
            await prisma_1.prisma.template.update({
                where: { id: template.id },
                data: {
                    history: [...currentHistory, analysisEntry].slice(-50), // 최근 50개만 유지
                },
            });
        }
        console.log('[Template Scheduler] 템플릿 사용 패턴 분석 완료');
    }
    catch (error) {
        console.error('[Template Scheduler] 오류:', error);
    }
});
// 매주 월요일: 템플릿 품질 평가
node_cron_1.default.schedule('0 3 * * 1', async () => {
    console.log('[Template Scheduler] 템플릿 품질 평가 시작...');
    try {
        const templates = await prisma_1.prisma.template.findMany({
            where: { isPublic: true },
        });
        for (const template of templates) {
            const usageData = await prisma_1.prisma.analytics.findMany({
                where: {
                    eventType: 'TEMPLATE_USED',
                    eventData: {
                        path: ['templateId'],
                        equals: template.id,
                    },
                },
            });
            if (usageData.length === 0)
                continue;
            // 품질 점수 계산
            const qualityScores = usageData
                .map(e => {
                const eventData = e.eventData;
                return eventData?.qualityScore;
            })
                .filter((score) => typeof score === 'number');
            const averageQuality = qualityScores.length > 0
                ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
                : 0;
            // 완성도 계산 (변수 입력 완료율)
            const templateVariables = template.variables || [];
            const completionRate = usageData.length > 0
                ? usageData.filter(e => {
                    const eventData = e.eventData;
                    const variables = eventData?.variables || {};
                    return templateVariables.every(v => variables[v]);
                }).length / usageData.length
                : 0;
            // 종합 점수 계산
            const overallScore = (averageQuality * 0.6) + (completionRate * 100 * 0.4);
            const currentHistory = template.history || [];
            const evaluationEntry = {
                timestamp: new Date().toISOString(),
                type: 'quality_evaluation',
                averageQuality,
                completionRate,
                overallScore,
            };
            await prisma_1.prisma.template.update({
                where: { id: template.id },
                data: {
                    rating: overallScore,
                    history: [...currentHistory, evaluationEntry].slice(-50), // 최근 50개만 유지
                },
            });
        }
        console.log('[Template Scheduler] 템플릿 품질 평가 완료');
    }
    catch (error) {
        console.error('[Template Scheduler] 오류:', error);
    }
});
// 매주 화요일 새벽 4시: AI 템플릿 자동 생성
node_cron_1.default.schedule('0 4 * * 2', async () => {
    console.log('[Template Scheduler] AI 템플릿 자동 생성 시작...');
    try {
        const { generateTemplatesByCategory } = require('../services/templateGenerator');
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        // Admin 사용자 찾기
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
        const admin = await prisma.user.findFirst({
            where: { email: adminEmail },
        });
        if (!admin) {
            console.error('[Template Scheduler] Admin 사용자를 찾을 수 없습니다.');
            await prisma.$disconnect();
            return;
        }
        const categories = ['text', 'image', 'video', 'engineering'];
        const counts = { text: 3, image: 2, video: 2, engineering: 2 }; // 주간 생성 개수
        let totalCreated = 0;
        for (const category of categories) {
            try {
                const templates = await generateTemplatesByCategory(category, counts[category]);
                for (const template of templates) {
                    // 변수 추출
                    const variables = [];
                    const variableRegex = /\{\{(\w+)\}\}/g;
                    const checkText = (text) => {
                        let match;
                        while ((match = variableRegex.exec(text)) !== null) {
                            if (!variables.includes(match[1])) {
                                variables.push(match[1]);
                            }
                        }
                    };
                    if (template.title)
                        checkText(template.title);
                    if (template.description)
                        checkText(template.description);
                    template.sections.forEach((section) => {
                        if (section.content)
                            checkText(section.content);
                        if (section.helperText)
                            checkText(section.helperText);
                    });
                    const templateName = `[AI 추천] ${category === 'text' ? '텍스트' : category === 'image' ? '이미지' : category === 'video' ? '비디오' : '엔지니어링'} - ${template.title}`;
                    // 기존 템플릿 확인
                    const existing = await prisma.template.findFirst({
                        where: {
                            name: templateName,
                            category: category,
                        },
                    });
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
                        });
                        totalCreated++;
                        console.log(`  ✅ 생성: ${templateName}`);
                    }
                }
            }
            catch (error) {
                console.error(`❌ ${category} 카테고리 생성 실패:`, error.message);
            }
        }
        console.log(`[Template Scheduler] AI 템플릿 생성 완료: ${totalCreated}개`);
        await prisma.$disconnect();
    }
    catch (error) {
        console.error('[Template Scheduler] AI 템플릿 생성 오류:', error);
    }
});
console.log('✅ 템플릿 스케줄러 초기화 완료');
//# sourceMappingURL=templateScheduler.js.map