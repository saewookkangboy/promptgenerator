# 템플릿 활용 구현 예시 코드

## 1. Frontend: 템플릿 갤러리 컴포넌트

### 1.1 TemplateGallery.tsx
```typescript
// src/components/TemplateGallery.tsx
import { useState, useEffect } from 'react'
import { templateAPI } from '../utils/api'
import { PromptTemplate } from '../types/prompt.types'
import './TemplateGallery.css'

interface Template {
  id: string
  name: string
  description: string
  category: string
  isPremium: boolean
  isTop5: boolean
  usageCount: number
  rating: number
  content: PromptTemplate
  variables: string[]
}

export default function TemplateGallery({ onSelect }: { onSelect: (template: Template) => void }) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTemplates()
  }, [])

  useEffect(() => {
    filterTemplates()
  }, [templates, selectedCategory, searchQuery])

  const loadTemplates = async () => {
    try {
      const data = await templateAPI.getPublic({
        page: 1,
        limit: 100
      })
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('템플릿 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterTemplates = () => {
    let filtered = [...templates]

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      )
    }

    // Top 5 우선 정렬
    filtered.sort((a, b) => {
      if (a.isTop5 && !b.isTop5) return -1
      if (!a.isTop5 && b.isTop5) return 1
      return b.usageCount - a.usageCount
    })

    setFilteredTemplates(filtered)
  }

  if (loading) {
    return <div className="template-gallery-loading">템플릿을 불러오는 중...</div>
  }

  return (
    <div className="template-gallery">
      <div className="template-gallery-header">
        <h2>프롬프트 템플릿 갤러리</h2>
        <p>원하는 템플릿을 선택하여 빠르게 프롬프트를 생성하세요</p>
      </div>

      <div className="template-gallery-filters">
        <div className="category-filters">
          <button
            className={selectedCategory === 'all' ? 'active' : ''}
            onClick={() => setSelectedCategory('all')}
          >
            전체
          </button>
          <button
            className={selectedCategory === 'text' ? 'active' : ''}
            onClick={() => setSelectedCategory('text')}
          >
            텍스트
          </button>
          <button
            className={selectedCategory === 'image' ? 'active' : ''}
            onClick={() => setSelectedCategory('image')}
          >
            이미지
          </button>
          <button
            className={selectedCategory === 'video' ? 'active' : ''}
            onClick={() => setSelectedCategory('video')}
          >
            비디오
          </button>
          <button
            className={selectedCategory === 'engineering' ? 'active' : ''}
            onClick={() => setSelectedCategory('engineering')}
          >
            엔지니어링
          </button>
        </div>

        <div className="search-box">
          <input
            type="text"
            placeholder="템플릿 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="template-grid">
        {filteredTemplates.map(template => (
          <TemplateCard
            key={template.id}
            template={template}
            onClick={() => onSelect(template)}
          />
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="template-gallery-empty">
          검색 결과가 없습니다.
        </div>
      )}
    </div>
  )
}

function TemplateCard({ template, onClick }: { template: Template; onClick: () => void }) {
  return (
    <div className="template-card" onClick={onClick}>
      <div className="template-card-header">
        <h3>{template.name}</h3>
        <div className="template-badges">
          {template.isTop5 && <span className="badge top5">Top 5</span>}
          {template.isPremium && <span className="badge premium">프리미엄</span>}
        </div>
      </div>
      <p className="template-description">{template.description}</p>
      <div className="template-meta">
        <span className="template-category">{template.category.toUpperCase()}</span>
        <span className="template-usage">사용 {template.usageCount}회</span>
        <span className="template-rating">⭐ {template.rating.toFixed(1)}</span>
      </div>
      <div className="template-variables-preview">
        변수: {template.variables.slice(0, 3).join(', ')}
        {template.variables.length > 3 && ` +${template.variables.length - 3}`}
      </div>
    </div>
  )
}
```

### 1.2 TemplateVariableForm.tsx
```typescript
// src/components/TemplateVariableForm.tsx
import { useState } from 'react'
import { PromptTemplate } from '../types/prompt.types'

interface TemplateVariableFormProps {
  template: {
    content: PromptTemplate
    variables: string[]
  }
  onSubmit: (variables: Record<string, string>) => void
  onCancel: () => void
}

export default function TemplateVariableForm({ template, onSubmit, onCancel }: TemplateVariableFormProps) {
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const variableDescriptions: Record<string, string> = {
    '주제': '다루려는 주제(키워드 단위로 구체화 권장)',
    '타겟': '독자/고객/사용자(직군, 연차, 지역 등 포함)',
    '목표': '목적(인지/유입/전환/리텐션/운영 효율 등)',
    '기간': '분석/캘린더/리서치 범위(예: 최근 30일, 다음 4주)',
    '채널': '플랫폼/매체(예: Instagram, TikTok, Google Search 등)',
    'KPI': '성공지표(예: CTR, CVR, CAC, ROAS, NPS, Retention)',
    '제약사항': '예산/인력/툴/브랜드 규정/컴플라이언스',
    '입력데이터': '표/로그/리포트/설문 원문 등',
  }

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {}
    
    // 필수 변수 검증
    template.variables.forEach(variable => {
      if (!variableValues[variable]?.trim()) {
        newErrors[variable] = '이 변수는 필수입니다'
      }
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSubmit(variableValues)
  }

  return (
    <div className="template-variable-form">
      <div className="template-variable-form-header">
        <h3>템플릿 변수 입력</h3>
        <p>아래 변수들을 입력하여 템플릿을 완성하세요</p>
      </div>

      <div className="template-variable-form-body">
        {template.variables.map(variable => (
          <div key={variable} className="variable-input-group">
            <label>
              {variable}
              {variableDescriptions[variable] && (
                <span className="variable-hint">({variableDescriptions[variable]})</span>
              )}
            </label>
            <textarea
              value={variableValues[variable] || ''}
              onChange={(e) => {
                setVariableValues(prev => ({ ...prev, [variable]: e.target.value }))
                if (errors[variable]) {
                  setErrors(prev => {
                    const newErrors = { ...prev }
                    delete newErrors[variable]
                    return newErrors
                  })
                }
              }}
              placeholder={`{{${variable}}} 값을 입력하세요`}
              rows={3}
              className={errors[variable] ? 'error' : ''}
            />
            {errors[variable] && (
              <span className="error-message">{errors[variable]}</span>
            )}
          </div>
        ))}
      </div>

      <div className="template-variable-form-footer">
        <button onClick={onCancel} className="btn-secondary">취소</button>
        <button onClick={handleSubmit} className="btn-primary">템플릿 적용</button>
      </div>
    </div>
  )
}
```

### 1.3 템플릿 적용 유틸 함수
```typescript
// src/utils/templateUtils.ts
import { PromptTemplate } from '../types/prompt.types'

/**
 * 템플릿의 변수를 실제 값으로 치환
 */
export function applyTemplate(
  template: PromptTemplate,
  variables: Record<string, string>
): string {
  let result = template.title || ''
  
  if (template.description) {
    result += '\n\n' + template.description
  }

  template.sections.forEach(section => {
    let sectionContent = section.content
    
    // 변수 치환
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      sectionContent = sectionContent.replace(regex, value)
    })
    
    result += `\n\n## ${section.title}\n${sectionContent}`
  })

  return result
}

/**
 * 템플릿에서 변수 추출
 */
export function extractVariables(template: PromptTemplate): string[] {
  const variables = new Set<string>()
  const regex = /\{\{(\w+)\}\}/g
  
  const checkText = (text: string) => {
    let match
    while ((match = regex.exec(text)) !== null) {
      variables.add(match[1])
    }
  }
  
  if (template.title) checkText(template.title)
  if (template.description) checkText(template.description)
  template.sections.forEach(section => {
    if (section.content) checkText(section.content)
    if (section.helperText) checkText(section.helperText)
  })
  
  return Array.from(variables)
}
```

### 1.4 API 유틸 추가
```typescript
// src/utils/api.ts에 추가

export const templateAPI = {
  getPublic: async (params?: {
    category?: string
    search?: string
    page?: number
    limit?: number
  }) => {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value))
        }
      })
    }
    return apiRequest<{ templates: any[]; pagination: any }>(
      `/api/templates/public?${queryParams.toString()}`
    )
  },

  get: async (id: string) => {
    return apiRequest<any>(`/api/templates/${id}`)
  },

  apply: async (id: string, variables: Record<string, string>) => {
    return apiRequest<{ prompt: string }>(`/api/templates/${id}/apply`, {
      method: 'POST',
      body: JSON.stringify({ variables }),
    })
  },

  recordUsage: async (templateId: string, data: {
    variables: Record<string, string>
    qualityScore?: number
  }) => {
    return apiRequest<void>('/api/analytics/template-used', {
      method: 'POST',
      body: JSON.stringify({
        templateId,
        ...data,
      }),
    })
  },
}
```

---

## 2. Backend: 템플릿 API 및 학습 시스템

### 2.1 템플릿 라우트 추가
```typescript
// server/routes/templates.ts
import { Router, Response } from 'express'
import { prisma } from '../db/prisma'
import { authenticateToken, requireTier, AuthRequest } from '../middleware/auth'

const router = Router()

// 공개 템플릿 목록 조회 (인증 불필요)
router.get('/public', async (req, res: Response) => {
  try {
    const { category, search, page = '1', limit = '20' } = req.query

    const where: any = {
      isPublic: true,
    }

    if (category) {
      where.category = category
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: [
          { isPremium: 'desc' }, // 프리미엄 우선
          { usageCount: 'desc' }, // 사용 횟수 순
        ],
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          isPremium: true,
          tierRequired: true,
          usageCount: true,
          rating: true,
          content: true,
          variables: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.template.count({ where }),
    ])

    // Top 5 표시를 위한 플래그 추가
    const templatesWithFlags = templates.map(t => ({
      ...t,
      isTop5: t.name.includes('[Top'),
    }))

    res.json({
      templates: templatesWithFlags,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    })
  } catch (error: any) {
    console.error('템플릿 목록 조회 오류:', error)
    res.status(500).json({ error: '템플릿 목록을 가져오는데 실패했습니다' })
  }
})

// 템플릿 상세 조회
router.get('/:id', async (req, res: Response) => {
  try {
    const template = await prisma.template.findFirst({
      where: {
        id: req.params.id,
        isPublic: true,
      },
    })

    if (!template) {
      res.status(404).json({ error: '템플릿을 찾을 수 없습니다' })
      return
    }

    res.json(template)
  } catch (error: any) {
    console.error('템플릿 조회 오류:', error)
    res.status(500).json({ error: '템플릿을 가져오는데 실패했습니다' })
  }
})

// 템플릿 적용 (변수 치환)
router.post('/:id/apply', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { variables } = req.body
    const template = await prisma.template.findFirst({
      where: {
        id: req.params.id,
        isPublic: true,
      },
    })

    if (!template) {
      res.status(404).json({ error: '템플릿을 찾을 수 없습니다' })
      return
    }

    // 티어 확인
    if (template.isPremium && template.tierRequired !== 'FREE') {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
      })
      
      if (!user || user.tier === 'FREE') {
        res.status(403).json({ error: '프리미엄 템플릿은 구독이 필요합니다' })
        return
      }
    }

    // 변수 치환
    const templateContent = JSON.parse(template.content as string)
    let prompt = templateContent.title || ''
    
    if (templateContent.description) {
      prompt += '\n\n' + templateContent.description
    }

    templateContent.sections.forEach((section: any) => {
      let sectionContent = section.content
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
        sectionContent = sectionContent.replace(regex, value as string)
      })
      prompt += `\n\n## ${section.title}\n${sectionContent}`
    })

    // 사용 통계 업데이트
    await prisma.template.update({
      where: { id: template.id },
      data: {
        usageCount: { increment: 1 },
      },
    })

    // Analytics 이벤트 기록
    await prisma.analytics.create({
      data: {
        userId: req.user!.id,
        eventType: 'TEMPLATE_USED',
        eventData: {
          templateId: template.id,
          templateName: template.name,
          variables,
        },
      },
    })

    res.json({ prompt })
  } catch (error: any) {
    console.error('템플릿 적용 오류:', error)
    res.status(500).json({ error: '템플릿 적용에 실패했습니다' })
  }
})

export default router
```

### 2.2 Analytics 이벤트 기록
```typescript
// server/routes/analytics.ts에 추가

// 템플릿 사용 이벤트 기록
router.post('/template-used', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { templateId, variables, qualityScore } = req.body

    await prisma.analytics.create({
      data: {
        userId: req.user!.id,
        eventType: 'TEMPLATE_USED',
        eventData: {
          templateId,
          variables,
          qualityScore,
          timestamp: new Date().toISOString(),
        },
      },
    })

    res.json({ success: true })
  } catch (error: any) {
    console.error('Analytics 기록 오류:', error)
    res.status(500).json({ error: '이벤트 기록에 실패했습니다' })
  }
})
```

### 2.3 템플릿 학습 스케줄러
```typescript
// server/scheduler/templateScheduler.ts
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
        const variables = event.eventData?.variables || {}
        Object.keys(variables).forEach(key => {
          variableUsage[key] = (variableUsage[key] || 0) + 1
        })

        if (event.eventData?.qualityScore) {
          totalQualityScore += event.eventData.qualityScore
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

      // 템플릿 메타데이터 업데이트
      await prisma.template.update({
        where: { id: template.id },
        data: {
          metadata: {
            ...(template.metadata as any || {}),
            lastAnalyzedAt: new Date().toISOString(),
            variableUsage,
            mostUsedVariables,
            averageQuality,
            usageCount30Days: usageData.length,
          },
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
        .map(e => e.eventData?.qualityScore)
        .filter((score): score is number => typeof score === 'number')

      const averageQuality = qualityScores.length > 0
        ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
        : 0

      // 완성도 계산 (변수 입력 완료율)
      const completionRate = usageData.length > 0
        ? usageData.filter(e => {
            const variables = e.eventData?.variables || {}
            const requiredVars = (template.variables as string[]) || []
            return requiredVars.every(v => variables[v])
          }).length / usageData.length
        : 0

      // 종합 점수 계산
      const overallScore = (averageQuality * 0.6) + (completionRate * 100 * 0.4)

      await prisma.template.update({
        where: { id: template.id },
        data: {
          rating: overallScore,
          metadata: {
            ...(template.metadata as any || {}),
            lastEvaluatedAt: new Date().toISOString(),
            averageQuality,
            completionRate,
            overallScore,
          },
        },
      })
    }

    console.log('[Template Scheduler] 템플릿 품질 평가 완료')
  } catch (error) {
    console.error('[Template Scheduler] 오류:', error)
  }
})
```

---

## 3. Admin: 템플릿 관리 확장

### 3.1 템플릿 대시보드 API
```typescript
// server/routes/admin.ts에 추가

// 템플릿 대시보드 데이터
router.get('/templates/dashboard', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 오늘의 통계
    const todayUsage = await prisma.analytics.count({
      where: {
        eventType: 'TEMPLATE_USED',
        createdAt: { gte: today },
      },
    })

    // 가장 인기 있는 템플릿
    const topTemplates = await prisma.template.findMany({
      where: { isPublic: true },
      orderBy: { usageCount: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        usageCount: true,
        rating: true,
      },
    })

    // 카테고리별 통계
    const categoryStats = await prisma.template.groupBy({
      by: ['category'],
      where: { isPublic: true },
      _count: { id: true },
      _sum: { usageCount: true },
    })

    // 최근 7일 사용 추이
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const dailyUsage = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM analytics
      WHERE event_type = 'TEMPLATE_USED'
        AND created_at >= ${sevenDaysAgo}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `

    res.json({
      todayUsage,
      topTemplates,
      categoryStats,
      dailyUsage,
    })
  } catch (error: any) {
    console.error('템플릿 대시보드 오류:', error)
    res.status(500).json({ error: '대시보드 데이터를 가져오는데 실패했습니다' })
  }
})
```

이 예시 코드들을 참고하여 단계적으로 구현하시면 됩니다!

