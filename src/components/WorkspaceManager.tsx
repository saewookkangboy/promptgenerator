// 워크스페이스 관리 컴포넌트
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { showNotification } from '../utils/notifications'
import LoadingSpinner from './LoadingSpinner'
import ErrorMessage from './ErrorMessage'
import './WorkspaceManager.css'

interface Workspace {
  id: string
  name: string
  description?: string
  tier: string
  memberCount?: number
  createdAt: string
}

function WorkspaceManager() {
  const { user } = useAuth()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('')

  useEffect(() => {
    loadWorkspaces()
  }, [])

  const loadWorkspaces = async () => {
    try {
      setLoading(true)
      setError(null)
      // TODO: 워크스페이스 API 구현 후 연결
      // const response = await workspaceAPI.list()
      // setWorkspaces(response.workspaces || [])
      
      // 임시: 로컬 스토리지에서 워크스페이스 로드
      const localWorkspaces = localStorage.getItem('local_workspaces')
      if (localWorkspaces) {
        setWorkspaces(JSON.parse(localWorkspaces))
      } else {
        setWorkspaces([])
      }
    } catch (err: any) {
      console.error('워크스페이스 로드 실패:', err)
      setError(err.message || '워크스페이스를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) {
      showNotification('워크스페이스 이름을 입력해주세요.', 'error')
      return
    }

    try {
      // TODO: 워크스페이스 API 구현 후 연결
      // const response = await workspaceAPI.create({
      //   name: newWorkspaceName,
      //   description: newWorkspaceDescription || undefined,
      // })

      // 임시: 로컬 스토리지에 저장
      const newWorkspace: Workspace = {
        id: `workspace_${Date.now()}`,
        name: newWorkspaceName,
        description: newWorkspaceDescription || undefined,
        tier: user?.tier || 'FREE',
        createdAt: new Date().toISOString(),
      }

      const updatedWorkspaces = [...workspaces, newWorkspace]
      setWorkspaces(updatedWorkspaces)
      localStorage.setItem('local_workspaces', JSON.stringify(updatedWorkspaces))

      showNotification('워크스페이스가 생성되었습니다.', 'success')
      setShowCreateModal(false)
      setNewWorkspaceName('')
      setNewWorkspaceDescription('')
    } catch (err: any) {
      showNotification(err.message || '워크스페이스 생성에 실패했습니다.', 'error')
    }
  }

  const handleDeleteWorkspace = async (id: string) => {
    if (!confirm('이 워크스페이스를 삭제하시겠습니까?')) {
      return
    }

    try {
      // TODO: 워크스페이스 API 구현 후 연결
      // await workspaceAPI.delete(id)

      // 임시: 로컬 스토리지에서 삭제
      const updatedWorkspaces = workspaces.filter(w => w.id !== id)
      setWorkspaces(updatedWorkspaces)
      localStorage.setItem('local_workspaces', JSON.stringify(updatedWorkspaces))

      showNotification('워크스페이스가 삭제되었습니다.', 'success')
    } catch (err: any) {
      showNotification(err.message || '워크스페이스 삭제에 실패했습니다.', 'error')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const getTierLabel = (tier: string) => {
    const labels: Record<string, string> = {
      FREE: '무료',
      BASIC: '기본',
      PROFESSIONAL: '프로',
      ENTERPRISE: '엔터프라이즈',
    }
    return labels[tier] || tier
  }

  return (
    <div className="workspace-manager-container">
      <div className="workspace-manager-header">
        <div>
          <h2>워크스페이스</h2>
          <p className="subtitle">프롬프트를 그룹으로 관리하고 팀과 협업하세요</p>
        </div>
        <button
          className="create-workspace-button"
          onClick={() => setShowCreateModal(true)}
        >
          + 워크스페이스 생성
        </button>
      </div>

      {loading && <LoadingSpinner />}
      {error && !loading && <ErrorMessage message={error} />}

      {!loading && !error && (
        <>
          {workspaces.length === 0 ? (
            <div className="empty-state">
              <p>워크스페이스가 없습니다.</p>
              <p className="empty-hint">워크스페이스를 생성하여 프롬프트를 그룹으로 관리하세요.</p>
              <button
                className="create-workspace-button"
                onClick={() => setShowCreateModal(true)}
              >
                첫 워크스페이스 생성하기
              </button>
            </div>
          ) : (
            <div className="workspaces-grid">
              {workspaces.map((workspace) => (
                <div key={workspace.id} className="workspace-card">
                  <div className="workspace-card-header">
                    <h3 className="workspace-name">{workspace.name}</h3>
                    <span className={`tier-badge tier-${workspace.tier.toLowerCase()}`}>
                      {getTierLabel(workspace.tier)}
                    </span>
                  </div>
                  {workspace.description && (
                    <p className="workspace-description">{workspace.description}</p>
                  )}
                  <div className="workspace-card-footer">
                    <div className="workspace-meta">
                      <span className="workspace-date">생성일: {formatDate(workspace.createdAt)}</span>
                      {workspace.memberCount !== undefined && (
                        <span className="workspace-members">멤버: {workspace.memberCount}명</span>
                      )}
                    </div>
                    <div className="workspace-actions">
                      <button
                        className="action-button view-button"
                        onClick={() => {
                          showNotification('워크스페이스 상세 기능은 곧 제공됩니다.', 'info')
                        }}
                      >
                        열기
                      </button>
                      <button
                        className="action-button delete-button"
                        onClick={() => handleDeleteWorkspace(workspace.id)}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>워크스페이스 생성</h3>
              <button
                className="modal-close-button"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="workspace-name">워크스페이스 이름 *</label>
                <input
                  id="workspace-name"
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="워크스페이스 이름을 입력하세요"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="workspace-description">설명 (선택사항)</label>
                <textarea
                  id="workspace-description"
                  value={newWorkspaceDescription}
                  onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                  placeholder="워크스페이스에 대한 설명을 입력하세요"
                  className="form-textarea"
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="modal-button cancel-button"
                onClick={() => {
                  setShowCreateModal(false)
                  setNewWorkspaceName('')
                  setNewWorkspaceDescription('')
                }}
              >
                취소
              </button>
              <button
                className="modal-button create-button"
                onClick={handleCreateWorkspace}
              >
                생성
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkspaceManager

