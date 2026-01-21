// Admin 고급 분석 컴포넌트
import { useState, useEffect, useMemo } from 'react'
// import { adminAPI } from '../utils/api' // 사용하지 않음
import './AdminAdvancedAnalytics.css'

interface UserBehavior {
  userId: string
  email: string
  totalPrompts: number
  categories: Record<string, number>
  averagePromptLength: number
  lastActiveAt: string
  sessionCount: number
  averageSessionDuration: number
  conversionFunnel: {
    visited: number
    generated: number
    saved: number
    shared: number
  }
}

interface FunnelData {
  stage: string
  count: number
  percentage: number
  dropoff: number
}

interface UserSegment {
  segment: string
  count: number
  percentage: number
  characteristics: string[]
}

function AdminAdvancedAnalytics() {
  const [userBehaviors, _setUserBehaviors] = useState<UserBehavior[]>([])
  const [funnelData, _setFunnelData] = useState<FunnelData[]>([])
  const [userSegments, _setUserSegments] = useState<UserSegment[]>([])
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadAnalytics()
  }, [timeRange])

  const loadAnalytics = async () => {
    try {
      setIsLoading(true)
      // TODO: adminAPI.getAdvancedAnalytics 구현 필요
      // const data = await adminAPI.getAdvancedAnalytics({ timeRange })
      // setUserBehaviors(data.userBehaviors || [])
      // setFunnelData(data.funnelData || [])
      // setUserSegments(data.userSegments || [])
    } catch (error: any) {
      console.error('분석 데이터 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const topUsers = useMemo(() => {
    return [...userBehaviors]
      .sort((a, b) => b.totalPrompts - a.totalPrompts)
      .slice(0, 10)
  }, [userBehaviors])

  const categoryDistribution = useMemo(() => {
    const distribution: Record<string, number> = {}
    userBehaviors.forEach(user => {
      Object.entries(user.categories).forEach(([category, count]) => {
        distribution[category] = (distribution[category] || 0) + count
      })
    })
    return distribution
  }, [userBehaviors])

  const averageMetrics = useMemo(() => {
    if (userBehaviors.length === 0) return null
    const totalPrompts = userBehaviors.reduce((sum, u) => sum + u.totalPrompts, 0)
    const totalSessions = userBehaviors.reduce((sum, u) => sum + u.sessionCount, 0)
    const totalDuration = userBehaviors.reduce((sum, u) => sum + u.averageSessionDuration, 0)
    const totalLength = userBehaviors.reduce((sum, u) => sum + u.averagePromptLength, 0)

    return {
      avgPromptsPerUser: Math.round(totalPrompts / userBehaviors.length),
      avgSessionsPerUser: Math.round(totalSessions / userBehaviors.length),
      avgSessionDuration: Math.round(totalDuration / userBehaviors.length),
      avgPromptLength: Math.round(totalLength / userBehaviors.length),
    }
  }, [userBehaviors])

  return (
    <div className="admin-advanced-analytics">
      <div className="analytics-header">
        <h2>고급 분석</h2>
        <div className="time-range-selector">
          <button
            className={`time-button ${timeRange === '7d' ? 'active' : ''}`}
            onClick={() => setTimeRange('7d')}
          >
            7일
          </button>
          <button
            className={`time-button ${timeRange === '30d' ? 'active' : ''}`}
            onClick={() => setTimeRange('30d')}
          >
            30일
          </button>
          <button
            className={`time-button ${timeRange === '90d' ? 'active' : ''}`}
            onClick={() => setTimeRange('90d')}
          >
            90일
          </button>
          <button
            className={`time-button ${timeRange === 'all' ? 'active' : ''}`}
            onClick={() => setTimeRange('all')}
          >
            전체
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-state">분석 데이터를 불러오는 중...</div>
      ) : (
        <>
          {/* 평균 지표 */}
          {averageMetrics && (
            <div className="metrics-grid">
              <div className="metric-card">
                <h3>사용자당 평균 프롬프트</h3>
                <div className="metric-value">{averageMetrics.avgPromptsPerUser}</div>
              </div>
              <div className="metric-card">
                <h3>사용자당 평균 세션</h3>
                <div className="metric-value">{averageMetrics.avgSessionsPerUser}</div>
              </div>
              <div className="metric-card">
                <h3>평균 세션 시간</h3>
                <div className="metric-value">{averageMetrics.avgSessionDuration}분</div>
              </div>
              <div className="metric-card">
                <h3>평균 프롬프트 길이</h3>
                <div className="metric-value">{averageMetrics.avgPromptLength}자</div>
              </div>
            </div>
          )}

          {/* 퍼널 분석 */}
          {funnelData.length > 0 && (
            <div className="funnel-section">
              <h3>전환 퍼널</h3>
              <div className="funnel-chart">
                {funnelData.map((stage, index) => (
                  <div key={stage.stage} className="funnel-stage">
                    <div className="funnel-bar" style={{ width: `${stage.percentage}%` }}>
                      <span className="funnel-label">{stage.stage}</span>
                      <span className="funnel-count">{stage.count}</span>
                      <span className="funnel-percentage">{stage.percentage.toFixed(1)}%</span>
                    </div>
                    {index < funnelData.length - 1 && (
                      <div className="funnel-dropoff">
                        {stage.dropoff > 0 && `-${stage.dropoff.toFixed(1)}%`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 사용자 세그먼트 */}
          {userSegments.length > 0 && (
            <div className="segments-section">
              <h3>사용자 세그먼트</h3>
              <div className="segments-grid">
                {userSegments.map(segment => (
                  <div key={segment.segment} className="segment-card">
                    <h4>{segment.segment}</h4>
                    <div className="segment-count">{segment.count}명 ({segment.percentage.toFixed(1)}%)</div>
                    <ul className="segment-characteristics">
                      {segment.characteristics.map((char, idx) => (
                        <li key={idx}>{char}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 카테고리 분포 */}
          {Object.keys(categoryDistribution).length > 0 && (
            <div className="category-distribution">
              <h3>카테고리별 사용 분포</h3>
              <div className="distribution-chart">
                {Object.entries(categoryDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, count]) => {
                    const total = Object.values(categoryDistribution).reduce((sum, c) => sum + c, 0)
                    const percentage = (count / total) * 100
                    return (
                      <div key={category} className="distribution-item">
                        <div className="distribution-label">{category}</div>
                        <div className="distribution-bar">
                          <div
                            className="distribution-fill"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="distribution-value">
                          {count} ({percentage.toFixed(1)}%)
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* 상위 사용자 */}
          {topUsers.length > 0 && (
            <div className="top-users-section">
              <h3>상위 사용자 (프롬프트 생성 기준)</h3>
              <div className="top-users-list">
                {topUsers.map((user, index) => (
                  <div key={user.userId} className="top-user-item">
                    <span className="user-rank">#{index + 1}</span>
                    <div className="user-info">
                      <span className="user-email">{user.email}</span>
                      <span className="user-stats">
                        {user.totalPrompts}개 프롬프트 • {user.sessionCount}회 세션
                      </span>
                    </div>
                    <div className="user-conversion">
                      <span>전환율: {((user.conversionFunnel.saved / user.conversionFunnel.visited) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default AdminAdvancedAnalytics
