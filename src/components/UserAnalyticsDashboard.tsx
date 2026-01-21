// 사용자 분석 대시보드 컴포넌트
import { useState, useEffect, useMemo } from 'react'
import { 
  getPromptRecords, 
  getStats, 
  getDailyVisitsArray,
  analyzeUserPatterns,
  PromptRecord 
} from '../utils/storage'
import { PromptStats } from '../utils/storage'
import './UserAnalyticsDashboard.css'

function UserAnalyticsDashboard() {
  const [records, setRecords] = useState<PromptRecord[]>([])
  const [_stats, setStats] = useState<PromptStats>({ text: 0, image: 0, video: 0, engineering: 0, total: 0 })
  const [dailyVisits, setDailyVisits] = useState<Array<{ date: string; count: number }>>([])
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

  useEffect(() => {
    loadData()
  }, [selectedPeriod])

  const loadData = () => {
    const allRecords = getPromptRecords()
    const filteredRecords = filterByPeriod(allRecords, selectedPeriod)
    setRecords(filteredRecords)
    setStats(getStats())
    
    const days = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : selectedPeriod === '90d' ? 90 : 365
    setDailyVisits(getDailyVisitsArray(days))
  }

  const filterByPeriod = (records: PromptRecord[], period: string): PromptRecord[] => {
    if (period === 'all') return records
    
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000)
    
    return records.filter(r => r.timestamp >= cutoff)
  }

  const patterns = useMemo(() => analyzeUserPatterns(), [records])

  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {}
    records.forEach(r => {
      counts[r.category] = (counts[r.category] || 0) + 1
    })
    return counts
  }, [records])

  const contentTypeStats = useMemo(() => {
    const counts: Record<string, number> = {}
    records.forEach(r => {
      const contentType = r.options?.contentType || 'general'
      counts[contentType] = (counts[contentType] || 0) + 1
    })
    return counts
  }, [records])

  const goalStats = useMemo(() => {
    const counts: Record<string, number> = {}
    records.forEach(r => {
      const goal = r.options?.goal || 'unknown'
      counts[goal] = (counts[goal] || 0) + 1
    })
    return counts
  }, [records])

  const averagePromptLength = useMemo(() => {
    if (records.length === 0) return 0
    const total = records.reduce((sum, r) => sum + (r.userInput?.length || 0), 0)
    return Math.round(total / records.length)
  }, [records])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="user-analytics-dashboard">
      <div className="analytics-header">
        <h2>내 사용 통계</h2>
        <div className="period-selector">
          <button
            className={`period-button ${selectedPeriod === '7d' ? 'active' : ''}`}
            onClick={() => setSelectedPeriod('7d')}
          >
            7일
          </button>
          <button
            className={`period-button ${selectedPeriod === '30d' ? 'active' : ''}`}
            onClick={() => setSelectedPeriod('30d')}
          >
            30일
          </button>
          <button
            className={`period-button ${selectedPeriod === '90d' ? 'active' : ''}`}
            onClick={() => setSelectedPeriod('90d')}
          >
            90일
          </button>
          <button
            className={`period-button ${selectedPeriod === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedPeriod('all')}
          >
            전체
          </button>
        </div>
      </div>

      <div className="analytics-grid">
        {/* 전체 통계 */}
        <div className="stat-card">
          <h3>전체 통계</h3>
          <div className="stat-content">
            <div className="stat-item">
              <span className="stat-label">총 생성 수</span>
              <span className="stat-value">{records.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">평균 프롬프트 길이</span>
              <span className="stat-value">{averagePromptLength}자</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">가장 많이 사용한 태그</span>
              <span className="stat-value">
                {patterns.mostUsedTags && patterns.mostUsedTags.length > 0 ? patterns.mostUsedTags[0] : '없음'}
              </span>
            </div>
          </div>
        </div>

        {/* 카테고리별 통계 */}
        <div className="stat-card">
          <h3>카테고리별 생성 수</h3>
          <div className="stat-content">
            <div className="stat-item">
              <span className="stat-label">텍스트</span>
              <span className="stat-value">{categoryStats.text || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">이미지</span>
              <span className="stat-value">{categoryStats.image || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">동영상</span>
              <span className="stat-value">{categoryStats.video || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">엔지니어링</span>
              <span className="stat-value">{categoryStats.engineering || 0}</span>
            </div>
          </div>
        </div>

        {/* 콘텐츠 타입 통계 */}
        <div className="stat-card">
          <h3>콘텐츠 타입 사용률</h3>
          <div className="stat-content">
            {Object.entries(contentTypeStats)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([type, count]) => (
                <div key={type} className="stat-item">
                  <span className="stat-label">{type}</span>
                  <span className="stat-value">{count}</span>
                </div>
              ))}
          </div>
        </div>

        {/* 목표 통계 */}
        <div className="stat-card">
          <h3>콘텐츠 목표 사용률</h3>
          <div className="stat-content">
            {Object.entries(goalStats)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([goal, count]) => (
                <div key={goal} className="stat-item">
                  <span className="stat-label">{goal}</span>
                  <span className="stat-value">{count}</span>
                </div>
              ))}
          </div>
        </div>

        {/* 사용 패턴 */}
        <div className="stat-card">
          <h3>사용 패턴</h3>
          <div className="stat-content">
            <div className="stat-item">
              <span className="stat-label">선호 콘텐츠 타입</span>
              <span className="stat-value">
                {patterns.preferredContentTypes && patterns.preferredContentTypes.length > 0 
                  ? patterns.preferredContentTypes.join(', ') 
                  : '없음'}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">선호 톤 스타일</span>
              <span className="stat-value">
                {patterns.preferredToneStyles && patterns.preferredToneStyles.length > 0 
                  ? patterns.preferredToneStyles.join(', ') 
                  : '없음'}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">선호 목표</span>
              <span className="stat-value">
                {patterns.preferredGoals && patterns.preferredGoals.length > 0 
                  ? patterns.preferredGoals.join(', ') 
                  : '없음'}
              </span>
            </div>
          </div>
        </div>

        {/* 일별 방문 통계 */}
        <div className="stat-card full-width">
          <h3>일별 사용 통계</h3>
          <div className="daily-visits-chart">
            {dailyVisits.length > 0 ? (
              <div className="visits-bars">
                {dailyVisits.map(({ date, count }) => (
                  <div key={date} className="visit-bar-item">
                    <div className="visit-bar" style={{ height: `${(count / Math.max(...dailyVisits.map(d => d.count))) * 100}%` }} />
                    <span className="visit-date">{formatDate(date)}</span>
                    <span className="visit-count">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-message">데이터가 없습니다</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserAnalyticsDashboard
