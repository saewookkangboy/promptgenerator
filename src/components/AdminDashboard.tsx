import { useState, useEffect } from 'react'
import { getStats, getPromptRecords, getVisitCount, clearAdminAuth, PromptRecord } from '../utils/storage'
import { adminAPI } from '../utils/api'
import VisitGraphModal from './VisitGraphModal'
import GuideManager from './GuideManager'
import TemplateManager from './TemplateManager'
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
  const [isGraphModalOpen, setIsGraphModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<PromptRecord | null>(null)
  const [activeSection, setActiveSection] = useState<'stats' | 'guides' | 'users' | 'prompts' | 'templates'>('stats')
  
  // 새로운 상태: 서버 통계
  const [serverStats, setServerStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [serverPrompts, setServerPrompts] = useState<any[]>([])
  const [usersPage, setUsersPage] = useState(1)
  const [promptsPage, setPromptsPage] = useState(1)
  const [serverConnected, setServerConnected] = useState<boolean | null>(null) // null: 확인 중, true: 연결됨, false: 연결 안됨

  useEffect(() => {
    // 로컬 데이터는 즉시 로드 (서버와 무관)
    loadData()
    
    // 서버 연결 확인은 백그라운드에서 비동기로 수행 (블로킹하지 않음)
    if (serverConnected === null) {
      checkServerConnection()
    }
    
    // 서버가 연결된 경우에만 서버 데이터 로드
    if (serverConnected === true) {
      loadServerData()
    }
    
    // 로컬 데이터는 5초마다 새로고침 (서버와 무관)
    const localInterval = setInterval(() => {
      loadData()
    }, 5000)
    
    // 서버 데이터는 서버 연결된 경우에만 새로고침
    const serverInterval = setInterval(() => {
      if (serverConnected === true) {
        loadServerData()
      }
    }, 10000) // 서버 데이터는 10초마다
    
    return () => {
      clearInterval(localInterval)
      clearInterval(serverInterval)
    }
  }, [usersPage, promptsPage, serverConnected])

  // 서버 연결 확인 (타임아웃 포함, 비동기, 블로킹하지 않음)
  const checkServerConnection = async () => {
    // 로딩 상태는 설정하지 않음 (사용자 경험 방해하지 않음)
    try {
      // 타임아웃 설정 (2초로 단축)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('타임아웃')), 2000)
      })
      
      const statsPromise = adminAPI.getStats()
      await Promise.race([statsPromise, timeoutPromise])
      
      setServerConnected(true)
      // 연결 성공 시 서버 데이터 로드
      loadServerData()
    } catch (error) {
      // 서버 연결 실패는 정상적인 상황 (로컬 모드)
      // 콘솔에만 로그하고 사용자에게는 방해하지 않음
      console.log('서버 연결 확인 실패 (로컬 모드로 작동):', error)
      setServerConnected(false)
    }
  }

  const loadServerData = async () => {
    // 서버가 연결되지 않은 경우 호출하지 않음
    if (serverConnected !== true) return
    
    try {
      // 로딩 상태는 설정하지 않음 (사용자 경험 방해하지 않음)
      // 서버 통계 로드
      const statsData = await adminAPI.getStats()
      setServerStats(statsData)

      // 사용자 목록 로드
      const usersData = await adminAPI.getUsers({ page: usersPage, limit: 20 })
      setUsers(usersData.users)

      // 프롬프트 목록 로드
      const promptsData = await adminAPI.getPrompts({ page: promptsPage, limit: 20 })
      setServerPrompts(promptsData.prompts)
    } catch (error) {
      // 서버 데이터 로드 실패는 정상적인 상황 (서버가 없을 수 있음)
      // 콘솔에만 로그하고 사용자에게는 방해하지 않음
      console.log('서버 데이터 로드 실패 (로컬 모드로 계속 작동):', error)
      // 서버 연결 실패 시 연결 상태 업데이트
      setServerConnected(false)
    }
  }

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

            <div className="admin-section-tabs">
              <button
                className={`section-tab ${activeSection === 'stats' ? 'active' : ''}`}
                onClick={() => setActiveSection('stats')}
              >
                통계 및 기록
              </button>
              <button
                className={`section-tab ${activeSection === 'users' ? 'active' : ''}`}
                onClick={() => setActiveSection('users')}
              >
                사용자 관리
              </button>
              <button
                className={`section-tab ${activeSection === 'prompts' ? 'active' : ''}`}
                onClick={() => setActiveSection('prompts')}
              >
                프롬프트 관리
              </button>
              <button
                className={`section-tab ${activeSection === 'guides' ? 'active' : ''}`}
                onClick={() => setActiveSection('guides')}
              >
                가이드 관리
              </button>
              <button
                className={`section-tab ${activeSection === 'templates' ? 'active' : ''}`}
                onClick={() => setActiveSection('templates')}
              >
                템플릿 관리
              </button>
            </div>

            {activeSection === 'guides' && (
              <div style={{ marginBottom: '32px' }}>
                <GuideManager />
              </div>
            )}

            {activeSection === 'users' && (
              <div className="admin-section">
                <div className="admin-section-header">
                  <h2>사용자 관리</h2>
                  {serverConnected === false && (
                    <div style={{ 
                      marginTop: '12px', 
                      padding: '12px', 
                      background: '#fff3cd', 
                      border: '1px solid #ffc107',
                      borderRadius: '4px',
                      color: '#856404'
                    }}>
                      ⚠️ 서버에 연결할 수 없습니다. 로컬 모드로 작동 중입니다.
                    </div>
                  )}
                </div>
                {serverConnected === true && serverStats && (
                  <div className="admin-stats-grid" style={{ marginBottom: '24px' }}>
                    <div className="stat-card">
                      <div className="stat-label">총 사용자</div>
                      <div className="stat-value">{serverStats.overview?.totalUsers?.toLocaleString() || 0}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">활성 사용자</div>
                      <div className="stat-value">{serverStats.overview?.activeUsers?.toLocaleString() || 0}</div>
                    </div>
                  </div>
                )}
                {serverConnected === true ? (
                  <>
                    <div className="admin-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>이메일</th>
                            <th>이름</th>
                            <th>Tier</th>
                            <th>상태</th>
                            <th>가입일</th>
                            <th>액션</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="no-data">
                                사용자가 없습니다
                              </td>
                            </tr>
                          ) : (
                            users.map((user) => (
                              <tr key={user.id}>
                                <td>{user.email}</td>
                                <td>{user.name || '-'}</td>
                                <td>
                                  <span className={`category-badge tier-${user.tier.toLowerCase()}`}>
                                    {user.tier}
                                  </span>
                                </td>
                                <td>{user.subscriptionStatus}</td>
                                <td>{new Date(user.createdAt).toLocaleDateString('ko-KR')}</td>
                                <td>
                                  <button
                                    className="admin-action-button"
                                    onClick={() => {
                                      console.log('사용자 편집:', user.id)
                                    }}
                                  >
                                    편집
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="admin-pagination">
                      <button
                        onClick={() => setUsersPage(Math.max(1, usersPage - 1))}
                        disabled={usersPage === 1}
                      >
                        이전
                      </button>
                      <span>페이지 {usersPage}</span>
                      <button
                        onClick={() => setUsersPage(usersPage + 1)}
                      >
                        다음
                      </button>
                    </div>
                  </>
                ) : serverConnected === false ? (
                  <div style={{ 
                    padding: '24px', 
                    textAlign: 'center',
                    background: '#f8f9fa',
                    borderRadius: '4px',
                    color: '#6c757d'
                  }}>
                    <p>서버에 연결할 수 없습니다.</p>
                    <p style={{ marginTop: '8px', fontSize: '0.9em' }}>
                      서버를 시작하려면: <code>npm run server</code>
                    </p>
                    <button
                      onClick={checkServerConnection}
                      style={{
                        marginTop: '16px',
                        padding: '8px 16px',
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      연결 재시도
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {activeSection === 'prompts' && (
              <div className="admin-section">
                <div className="admin-section-header">
                  <h2>프롬프트 관리</h2>
                  {serverConnected === false && (
                    <div style={{ 
                      marginTop: '12px', 
                      padding: '12px', 
                      background: '#fff3cd', 
                      border: '1px solid #ffc107',
                      borderRadius: '4px',
                      color: '#856404'
                    }}>
                      ⚠️ 서버에 연결할 수 없습니다. 로컬 모드로 작동 중입니다.
                    </div>
                  )}
                </div>
                {serverConnected === true && serverStats && (
                  <div className="admin-stats-grid" style={{ marginBottom: '24px' }}>
                    <div className="stat-card">
                      <div className="stat-label">총 프롬프트</div>
                      <div className="stat-value">{serverStats.overview?.totalPrompts?.toLocaleString() || 0}</div>
                    </div>
                  </div>
                )}
                {serverConnected === true ? (
                  <>
                    <div className="admin-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>제목</th>
                            <th>카테고리</th>
                            <th>사용자</th>
                            <th>모델</th>
                            <th>생성일</th>
                            <th>액션</th>
                          </tr>
                        </thead>
                        <tbody>
                          {serverPrompts.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="no-data">
                                프롬프트가 없습니다
                              </td>
                            </tr>
                          ) : (
                            serverPrompts.map((prompt) => (
                              <tr key={prompt.id}>
                                <td>{prompt.title || prompt.content.substring(0, 50)}</td>
                                <td>
                                  <span className={`category-badge category-${prompt.category.toLowerCase()}`}>
                                    {prompt.category}
                                  </span>
                                </td>
                                <td>{prompt.user?.email || '-'}</td>
                                <td>{prompt.model || '-'}</td>
                                <td>{new Date(prompt.createdAt).toLocaleDateString('ko-KR')}</td>
                                <td>
                                  <button
                                    className="admin-action-button"
                                    onClick={() => {
                                      console.log('프롬프트 상세:', prompt.id)
                                    }}
                                  >
                                    상세
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="admin-pagination">
                      <button
                        onClick={() => setPromptsPage(Math.max(1, promptsPage - 1))}
                        disabled={promptsPage === 1}
                      >
                        이전
                      </button>
                      <span>페이지 {promptsPage}</span>
                      <button
                        onClick={() => setPromptsPage(promptsPage + 1)}
                      >
                        다음
                      </button>
                    </div>
                  </>
                ) : serverConnected === false ? (
                  <div style={{ 
                    padding: '24px', 
                    textAlign: 'center',
                    background: '#f8f9fa',
                    borderRadius: '4px',
                    color: '#6c757d'
                  }}>
                    <p>서버에 연결할 수 없습니다.</p>
                    <p style={{ marginTop: '8px', fontSize: '0.9em' }}>
                      서버를 시작하려면: <code>npm run server</code>
                    </p>
                    <button
                      onClick={checkServerConnection}
                      style={{
                        marginTop: '16px',
                        padding: '8px 16px',
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      연결 재시도
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {activeSection === 'stats' && (
        <>
          <div className="admin-stats-grid">
            <div className="stat-card stat-card-clickable" onClick={() => setIsGraphModalOpen(true)}>
              <div className="stat-label">총 방문수</div>
              <div className="stat-value">{visitCount.toLocaleString()}</div>
              <div className="stat-hint">클릭하여 그래프 보기</div>
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
        </>
      )}

            {activeSection === 'templates' && (
              <div className="admin-section">
                <div className="admin-section-header">
                  <h2>템플릿 관리</h2>
                </div>
                <TemplateManager />
              </div>
            )}

      <VisitGraphModal
        isOpen={isGraphModalOpen}
        onClose={() => setIsGraphModalOpen(false)}
      />
    </div>
  )
}

export default AdminDashboard

