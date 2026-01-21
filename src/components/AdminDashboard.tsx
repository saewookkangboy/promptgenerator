import { useState, useEffect, useCallback, useMemo } from 'react'
import { clearAdminAuth } from '../utils/storage'
import { removeToken, adminAPI } from '../utils/api'
import VisitGraphModal from './VisitGraphModal'
import TemplateManager from './TemplateManager'
import UserEditModal from './UserEditModal'
import PromptDetailModal from './PromptDetailModal'
import UserAnalyticsDashboard from './UserAnalyticsDashboard'
import PromptHistoryManager from './PromptHistoryManager'
import { useAdminData, AdminPromptRecord } from '../hooks/useAdminData'
import './AdminDashboard.css'

interface AdminDashboardProps {
  onLogout: () => void
  onBackToMain?: () => void
}

function AdminDashboard({ onLogout, onBackToMain }: AdminDashboardProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'text' | 'image' | 'video' | 'engineering'>('all')
  const [isGraphModalOpen, setIsGraphModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<AdminPromptRecord | null>(null)
  const [activeSection, setActiveSection] = useState<'stats' | 'users' | 'prompts' | 'templates' | 'history' | 'analytics'>('stats')
  const [usersPage, setUsersPage] = useState(1)
  const [promptsPage, setPromptsPage] = useState(1)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null)
  const [selectedPromptData, setSelectedPromptData] = useState<any | null>(null)
  const [dbHealth, setDbHealth] = useState<any | null>(null)
  const [dbHealthLoading, setDbHealthLoading] = useState(false)
  const [dbHealthError, setDbHealthError] = useState<string | null>(null)
  const {
    generationStats: stats,
    statsOverview: serverStats,
    visitCount,
    promptRecords: records,
    users,
    prompts: serverPrompts,
    pagination,
    loading,
    serverStatus,
    errors: adminErrors,
    refresh,
    lastUpdated,
  } = useAdminData({ usersPage, promptsPage })

  const globalErrorMessage = adminErrors.global || adminErrors.stats || null
  const isServerOnline = serverStatus === 'online'
  const isServerChecking = serverStatus === 'connecting'
  const isServerOffline = serverStatus === 'offline'
  const isServerAuthError = serverStatus === 'auth_error'
  const serverWarningMessage =
    globalErrorMessage ||
    (isServerAuthError
      ? 'Admin 권한이 없거나 세션이 만료되었습니다. 다시 로그인해주세요.'
      : '서버에 연결할 수 없습니다. Railway 서버가 실행 중인지 확인해주세요.')

  // loadData 함수 제거 (서버 기반으로 변경)

  const handleLogout = () => {
    removeToken()
    clearAdminAuth()
    onLogout()
  }

  const fetchDbHealth = useCallback(async () => {
    setDbHealthLoading(true)
    setDbHealthError(null)
    try {
      const result = await adminAPI.getDbHealth()
      setDbHealth(result)
    } catch (error: any) {
      setDbHealthError(error?.message || 'DB 상태 확인에 실패했습니다.')
      setDbHealth({
        status: 'error',
        message: error?.message || null,
      })
    } finally {
      setDbHealthLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDbHealth()
  }, [fetchDbHealth])

  const dbStatusConfig = useMemo(() => {
    if (dbHealthLoading) {
      return {
        label: '상태 확인 중',
        tone: 'loading',
        description: 'DB 상태를 점검하는 중입니다.',
        latencyText: '',
      }
    }

    if (!dbHealth) {
      return {
        label: '정보 없음',
        tone: 'neutral',
        description: 'DB 상태 정보를 불러오지 못했습니다.',
        latencyText: '',
      }
    }

    const latencyText =
      typeof dbHealth.latencyMs === 'number' ? `${Math.round(dbHealth.latencyMs)}ms` : ''

    if (dbHealth.status === 'ok') {
      return {
        label: '정상 연결',
        tone: 'success',
        description: '핵심 쿼리가 정상 응답 중입니다.',
        latencyText,
      }
    }

    return {
      label: '오류 발생',
      tone: 'danger',
      description: dbHealthError || dbHealth.message || 'DB 연결 오류가 감지되었습니다.',
      latencyText,
    }
  }, [dbHealth, dbHealthError, dbHealthLoading])

  const filteredRecords = selectedCategory === 'all' 
    ? records 
    : records.filter(r => r.category.toLowerCase() === selectedCategory)

  const formatDate = (timestamp: number | string) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp)
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

  const renderOptionsTable = (record: AdminPromptRecord) => {
    if (!record.options) return null

    const options = record.options
    const rows: Array<{ label: string; value: string | number | boolean | undefined }> = []

    const category = record.category.toLowerCase()
    if (category === 'text') {
      if (options.contentType) rows.push({ label: '콘텐츠 타입', value: options.contentType })
      if (options.age) rows.push({ label: '나이', value: options.age })
      if (options.gender) rows.push({ label: '성별', value: options.gender })
      if (options.occupation) rows.push({ label: '직업', value: options.occupation })
      if (options.conversational !== undefined) rows.push({ label: '대화체', value: options.conversational ? '예' : '아니오' })
    } else if (category === 'image') {
      if (options.artStyle) rows.push({ label: '아트 스타일', value: options.artStyle })
      if (options.framing) rows.push({ label: '프레이밍', value: options.framing })
      if (options.lighting) rows.push({ label: '조명', value: options.lighting })
      if (options.colorMood) rows.push({ label: '색상 무드', value: options.colorMood })
      if (options.aspectRatio) rows.push({ label: '종횡비', value: options.aspectRatio })
      if (options.quality) rows.push({ label: '품질', value: options.quality })
      if (options.negativePrompt && Array.isArray(options.negativePrompt) && options.negativePrompt.length > 0) {
        rows.push({ label: '네거티브 프롬프트', value: options.negativePrompt.join(', ') })
      }
    } else if (category === 'video') {
      if (options.genre) rows.push({ label: '장르', value: options.genre })
      if (options.mood) rows.push({ label: '무드', value: options.mood })
      if (options.totalDuration) rows.push({ label: '총 길이', value: `${options.totalDuration}초` })
      if (options.fps) rows.push({ label: 'FPS', value: options.fps })
      if (options.resolution) rows.push({ label: '해상도', value: options.resolution })
      if (options.sceneCount) rows.push({ label: '장면 수', value: options.sceneCount })
      if (options.hasReferenceImage !== undefined) rows.push({ label: '참조 이미지', value: options.hasReferenceImage ? '예' : '아니오' })
    } else if (category === 'engineering') {
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
                className={`section-tab ${activeSection === 'history' ? 'active' : ''}`}
                onClick={() => setActiveSection('history')}
              >
                📚 히스토리
              </button>
              <button
                className={`section-tab ${activeSection === 'analytics' ? 'active' : ''}`}
                onClick={() => setActiveSection('analytics')}
              >
                📊 통계
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
                className={`section-tab ${activeSection === 'templates' ? 'active' : ''}`}
                onClick={() => setActiveSection('templates')}
              >
                템플릿 관리
              </button>
            </div>

            {activeSection === 'users' && (
              <div className="admin-section">
                <div className="admin-section-header">
                  <h2>사용자 관리</h2>
                  <div className="section-actions">
                    <button className="template-button secondary" onClick={refresh}>
                      새로고침
                    </button>
                    {lastUpdated && (
                      <span className="section-updated">
                        업데이트: {new Date(lastUpdated).toLocaleTimeString('ko-KR')}
                      </span>
                    )}
                  </div>
                </div>
                {isServerChecking && (
                  <div className="admin-status-card">서버 연결 확인 중...</div>
                )}
                {!isServerChecking && (isServerOffline || isServerAuthError) && (
                  <div className="admin-warning-card">
                    <p className="warning-title">⚠️ {serverWarningMessage}</p>
                    <button onClick={refresh} className="template-button" style={{ marginTop: '8px' }}>
                      다시 시도
                    </button>
                  </div>
                )}
                {!loading && isServerOnline && serverStats && (
                  <div className="admin-stats-grid" style={{ marginBottom: '24px' }}>
                    <div className="stat-card">
                      <div className="stat-label">총 사용자</div>
                      <div className="stat-value">
                        {serverStats.overview?.totalUsers?.toLocaleString() || 0}
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">활성 사용자</div>
                      <div className="stat-value">
                        {serverStats.overview?.activeUsers?.toLocaleString() || 0}
                      </div>
                    </div>
                  </div>
                )}
                {!loading && isServerOnline ? (
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
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedUserId(user.id)
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
                        disabled={
                          usersPage >= (pagination.users.totalPages || usersPage)
                        }
                      >
                        다음
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            )}

            {activeSection === 'prompts' && (
              <div className="admin-section">
                <div className="admin-section-header">
                  <h2>프롬프트 관리</h2>
                  <div className="section-actions">
                    <button className="template-button secondary" onClick={refresh}>
                      새로고침
                    </button>
                  </div>
                </div>
                {isServerChecking && (
                  <div className="admin-status-card">서버 연결 확인 중...</div>
                )}
                {!isServerChecking && (isServerOffline || isServerAuthError) && (
                  <div className="admin-warning-card">
                    <p className="warning-title">⚠️ {serverWarningMessage}</p>
                    <button onClick={refresh} className="template-button" style={{ marginTop: '8px' }}>
                      다시 시도
                    </button>
                  </div>
                )}
                {!loading && isServerOnline && serverStats && (
                  <div className="admin-stats-grid" style={{ marginBottom: '24px' }}>
                    <div className="stat-card">
                      <div className="stat-label">총 프롬프트</div>
                      <div className="stat-value">
                        {serverStats.overview?.totalPrompts?.toLocaleString() || 0}
                      </div>
                    </div>
                  </div>
                )}
                {!loading && isServerOnline ? (
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
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedPromptId(prompt.id)
                                      setSelectedPromptData(prompt)
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
                        disabled={
                          promptsPage >= (pagination.prompts.totalPages || promptsPage)
                        }
                      >
                        다음
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            )}

            {activeSection === 'stats' && (
        <>
          {isServerChecking && (
            <div className="admin-status-card">서버 데이터를 불러오는 중...</div>
          )}
          {!isServerChecking && (isServerOffline || isServerAuthError) && (
            <div className="admin-warning-card">
              ⚠️ {serverWarningMessage}
            </div>
          )}
          {!loading && isServerOnline && (
          <>
          <div className={`db-status-card tone-${dbStatusConfig.tone}`}>
            <div className="db-status-header">
              <div className="db-status-heading">
                <span className="db-status-pill">
                  <span className="db-status-dot" />
                  {dbStatusConfig.label}
                </span>
                {dbStatusConfig.latencyText && (
                  <span className="db-status-latency">· {dbStatusConfig.latencyText}</span>
                )}
              </div>
              <button
                className="db-status-refresh"
                onClick={fetchDbHealth}
                disabled={dbHealthLoading}
              >
                {dbHealthLoading ? '확인 중…' : 'DB 상태 새로고침'}
              </button>
            </div>
            <div className="db-status-body">
              <p className="db-status-description">{dbStatusConfig.description}</p>
              {dbHealth?.database && (
                <div className="db-status-meta">
                  <span className="meta-label">연결 대상</span>
                  <span className="meta-value">{dbHealth.database}</span>
                </div>
              )}
              {(dbHealthError || dbHealth?.message) && dbStatusConfig.tone !== 'success' && (
                <div className="db-status-meta db-status-meta-error">
                  <span className="meta-label">메시지</span>
                  <span className="meta-value">{dbHealthError || dbHealth?.message}</span>
                </div>
              )}
              {dbHealth?.detail?.code && (
                <div className="db-status-meta db-status-meta-error">
                  <span className="meta-label">코드</span>
                  <span className="meta-value">{dbHealth.detail.code}</span>
                </div>
              )}
            </div>
          </div>

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

          <div className="lab-grid">
            <div className="lab-card">
              <div className="lab-title">AB 테스트 / 프롬프트 최적화</div>
              <p className="lab-desc">
                Prisma 스키마(ABTest · ABTestVariant · ModelOptimization)가 적용된 상태입니다. API 라우트만 연결하면 Admin에서 실험 생성/결과 조회를 활성화할 수 있습니다.
              </p>
              <ul className="lab-list">
                <li>DB 상태: {dbHealth?.status === 'ok' ? '정상 연결' : '확인 필요'}</li>
                <li>필요 작업: Admin/API에 AB 테스트 CRUD · 실행 엔드포인트 추가</li>
                <li>권장: Premium 플랜 전용 노출 및 사용량 로깅</li>
              </ul>
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
                      <span className={`category-badge category-${record.category.toLowerCase()}`}>
                        {record.category.toLowerCase() === 'text' ? '텍스트' :
                         record.category.toLowerCase() === 'image' ? '이미지' :
                         record.category.toLowerCase() === 'video' ? '동영상' : '엔지니어링'}
                      </span>
                    </td>
                    <td>{record.model || '-'}</td>
                    <td className="prompt-cell" title={record.title || record.content}>
                      {truncateText(record.title || record.content, 40)}
                    </td>
                    <td>
                      {record.options ? (
                        <span className="options-indicator">옵션 있음</span>
                      ) : (
                        <span className="options-indicator empty">옵션 없음</span>
                      )}
                    </td>
                    <td>{formatDate(record.createdAt)}</td>
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
                <strong>제목:</strong>
                <p>{selectedRecord.title || '-'}</p>
              </div>
              <div className="detail-item">
                <strong>프롬프트:</strong>
                <p>{selectedRecord.content}</p>
              </div>
              {selectedRecord.user && (
                <div className="detail-item">
                  <strong>사용자:</strong>
                  <p>{selectedRecord.user.email} {selectedRecord.user.name ? `(${selectedRecord.user.name})` : ''}</p>
                </div>
              )}
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

            {activeSection === 'history' && (
              <div className="admin-section">
                <div className="admin-section-header">
                  <h2>프롬프트 히스토리</h2>
                </div>
                <PromptHistoryManager />
              </div>
            )}

            {activeSection === 'analytics' && (
              <div className="admin-section">
                <div className="admin-section-header">
                  <h2>사용 통계</h2>
                </div>
                <UserAnalyticsDashboard />
              </div>
            )}

      <VisitGraphModal
        isOpen={isGraphModalOpen}
        onClose={() => setIsGraphModalOpen(false)}
      />

      <UserEditModal
        isOpen={selectedUserId !== null}
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onUpdate={refresh}
      />

      <PromptDetailModal
        isOpen={selectedPromptId !== null}
        promptId={selectedPromptId}
        promptData={selectedPromptData}
        onClose={() => {
          setSelectedPromptId(null)
          setSelectedPromptData(null)
        }}
      />
    </div>
  )
}

export default AdminDashboard
