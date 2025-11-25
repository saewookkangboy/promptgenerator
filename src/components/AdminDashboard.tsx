import { useState, useEffect } from 'react'
import { getStats, getPromptRecords, getVisitCount, clearAdminAuth, PromptRecord } from '../utils/storage'
import './AdminDashboard.css'

interface AdminDashboardProps {
  onLogout: () => void
  onBackToMain?: () => void
}

function AdminDashboard({ onLogout, onBackToMain }: AdminDashboardProps) {
  const [stats, setStats] = useState(getStats())
  const [records, setRecords] = useState<PromptRecord[]>([])
  const [visitCount, setVisitCount] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'text' | 'image' | 'video' | 'engineering'>('all')

  useEffect(() => {
    loadData()
    // 5초마다 데이터 새로고침
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [])

  const loadData = () => {
    setStats(getStats())
    setRecords(getPromptRecords())
    setVisitCount(getVisitCount())
  }

  const handleLogout = () => {
    clearAdminAuth()
    onLogout()
  }

  const filteredRecords = selectedCategory === 'all' 
    ? records 
    : records.filter(r => r.category === selectedCategory)

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div>
          <h1>Admin 대시보드</h1>
          <p className="admin-subtitle">프롬프트 생성 통계 및 기록</p>
        </div>
        <div className="admin-header-buttons">
          {onBackToMain && (
            <button onClick={onBackToMain} className="admin-back-button">
              메인으로
            </button>
          )}
          <button onClick={handleLogout} className="admin-logout-button">
            로그아웃
          </button>
        </div>
      </div>

      <div className="admin-stats-grid">
        <div className="stat-card">
          <div className="stat-label">총 방문수</div>
          <div className="stat-value">{visitCount.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">총 생성 건수</div>
          <div className="stat-value">{stats.total.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">텍스트 콘텐츠</div>
          <div className="stat-value">{stats.text.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">이미지 생성</div>
          <div className="stat-value">{stats.image.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">동영상 생성</div>
          <div className="stat-value">{stats.video.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">프롬프트 엔지니어링</div>
          <div className="stat-value">{stats.engineering.toLocaleString()}</div>
        </div>
      </div>

      <div className="admin-section">
        <div className="admin-section-header">
          <h2>프롬프트 생성 기록</h2>
          <div className="category-filter">
            <button
              className={`filter-button ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              전체
            </button>
            <button
              className={`filter-button ${selectedCategory === 'text' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('text')}
            >
              텍스트
            </button>
            <button
              className={`filter-button ${selectedCategory === 'image' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('image')}
            >
              이미지
            </button>
            <button
              className={`filter-button ${selectedCategory === 'video' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('video')}
            >
              동영상
            </button>
            <button
              className={`filter-button ${selectedCategory === 'engineering' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('engineering')}
            >
              엔지니어링
            </button>
          </div>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>번호</th>
                <th>카테고리</th>
                <th>모델</th>
                <th>프롬프트</th>
                <th>생성 시간</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="no-data">
                    기록이 없습니다
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record, index) => (
                  <tr key={record.id}>
                    <td>{index + 1}</td>
                    <td>
                      <span className={`category-badge category-${record.category}`}>
                        {record.category === 'text' ? '텍스트' :
                         record.category === 'image' ? '이미지' :
                         record.category === 'video' ? '동영상' : '엔지니어링'}
                      </span>
                    </td>
                    <td>{record.model || '-'}</td>
                    <td className="prompt-cell" title={record.userInput}>
                      {truncateText(record.userInput, 40)}
                    </td>
                    <td>{formatDate(record.timestamp)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard

