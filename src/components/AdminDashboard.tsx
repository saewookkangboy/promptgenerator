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
  const [selectedRecord, setSelectedRecord] = useState<PromptRecord | null>(null)

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

  const renderOptionsTable = (record: PromptRecord) => {
    if (!record.options) return null

    const options = record.options
    const rows: Array<{ label: string; value: string | number | boolean | undefined }> = []

    if (record.category === 'text') {
      if (options.contentType) rows.push({ label: '콘텐츠 타입', value: options.contentType })
      if (options.age) rows.push({ label: '나이', value: options.age })
      if (options.gender) rows.push({ label: '성별', value: options.gender })
      if (options.occupation) rows.push({ label: '직업', value: options.occupation })
      if (options.conversational !== undefined) rows.push({ label: '대화체', value: options.conversational ? '예' : '아니오' })
    } else if (record.category === 'image') {
      if (options.artStyle) rows.push({ label: '아트 스타일', value: options.artStyle })
      if (options.framing) rows.push({ label: '프레이밍', value: options.framing })
      if (options.lighting) rows.push({ label: '조명', value: options.lighting })
      if (options.colorMood) rows.push({ label: '색상 무드', value: options.colorMood })
      if (options.aspectRatio) rows.push({ label: '종횡비', value: options.aspectRatio })
      if (options.quality) rows.push({ label: '품질', value: options.quality })
      if (options.negativePrompt && Array.isArray(options.negativePrompt) && options.negativePrompt.length > 0) {
        rows.push({ label: '네거티브 프롬프트', value: options.negativePrompt.join(', ') })
      }
    } else if (record.category === 'video') {
      if (options.genre) rows.push({ label: '장르', value: options.genre })
      if (options.mood) rows.push({ label: '무드', value: options.mood })
      if (options.totalDuration) rows.push({ label: '총 길이', value: `${options.totalDuration}초` })
      if (options.fps) rows.push({ label: 'FPS', value: options.fps })
      if (options.resolution) rows.push({ label: '해상도', value: options.resolution })
      if (options.sceneCount) rows.push({ label: '장면 수', value: options.sceneCount })
      if (options.hasReferenceImage !== undefined) rows.push({ label: '참조 이미지', value: options.hasReferenceImage ? '예' : '아니오' })
    } else if (record.category === 'engineering') {
      if (options.method) rows.push({ label: '엔지니어링 방법', value: options.method })
    }

    if (rows.length === 0) return null

    return (
      <table className="options-table">
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              <td className="options-label">{row.label}</td>
              <td className="options-value">{String(row.value || '-')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
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
                <th>옵션</th>
                <th>생성 시간</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="no-data">
                    기록이 없습니다
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record, index) => (
                  <tr 
                    key={record.id}
                    className={selectedRecord?.id === record.id ? 'selected' : ''}
                    onClick={() => setSelectedRecord(selectedRecord?.id === record.id ? null : record)}
                    style={{ cursor: 'pointer' }}
                  >
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
                    <td>
                      {record.options ? (
                        <span className="options-indicator">옵션 있음</span>
                      ) : (
                        <span className="options-indicator empty">옵션 없음</span>
                      )}
                    </td>
                    <td>{formatDate(record.timestamp)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {selectedRecord && (
          <div className="options-detail-section">
            <div className="options-detail-header">
              <h3>선택된 기록의 상세 옵션</h3>
              <button 
                onClick={() => setSelectedRecord(null)}
                className="close-detail-button"
              >
                닫기
              </button>
            </div>
            <div className="options-detail-content">
              <div className="detail-item">
                <strong>프롬프트:</strong>
                <p>{selectedRecord.userInput}</p>
              </div>
              {selectedRecord.model && (
                <div className="detail-item">
                  <strong>모델:</strong>
                  <p>{selectedRecord.model}</p>
                </div>
              )}
              {renderOptionsTable(selectedRecord)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard

