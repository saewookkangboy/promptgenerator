// 워크스페이스 관리 컴포넌트
import { useState, useEffect } from 'react'
import { workspaceAPI } from '../utils/api'
import { showNotification } from '../utils/notifications'
import './WorkspaceManager.css'

interface Workspace {
  id: string
  name: string
  description?: string
  ownerId: string
  tier: string
  createdAt: string
  memberCount?: number
}

interface WorkspaceMember {
  id: string
  userId: string
  userName?: string
  userEmail?: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
  joinedAt: string
}

function WorkspaceManager() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER')

  useEffect(() => {
    loadWorkspaces()
  }, [])

  useEffect(() => {
    if (selectedWorkspace) {
      loadMembers(selectedWorkspace.id)
    }
  }, [selectedWorkspace])

  const loadWorkspaces = async () => {
    try {
      setIsLoading(true)
      // TODO: workspaceAPI 구현 필요
      // const data = await workspaceAPI.list()
      // setWorkspaces(data.workspaces || [])
      showNotification('워크스페이스 목록을 불러오는 중...', 'info')
    } catch (error: any) {
      showNotification(error.message || '워크스페이스 목록을 불러오는데 실패했습니다', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const loadMembers = async (workspaceId: string) => {
    try {
      // TODO: workspaceAPI.getMembers 구현 필요
      // const data = await workspaceAPI.getMembers(workspaceId)
      // setMembers(data.members || [])
    } catch (error: any) {
      showNotification(error.message || '멤버 목록을 불러오는데 실패했습니다', 'error')
    }
  }

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) {
      showNotification('워크스페이스 이름을 입력해주세요', 'error')
      return
    }

    try {
      setIsLoading(true)
      // TODO: workspaceAPI.create 구현 필요
      // const workspace = await workspaceAPI.create({
      //   name: newWorkspaceName,
      //   description: newWorkspaceDesc,
      // })
      // setWorkspaces([...workspaces, workspace])
      setShowCreateModal(false)
      setNewWorkspaceName('')
      setNewWorkspaceDesc('')
      showNotification('워크스페이스가 생성되었습니다', 'success')
    } catch (error: any) {
      showNotification(error.message || '워크스페이스 생성에 실패했습니다', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !selectedWorkspace) {
      showNotification('이메일을 입력해주세요', 'error')
      return
    }

    try {
      setIsLoading(true)
      // TODO: workspaceAPI.inviteMember 구현 필요
      // await workspaceAPI.inviteMember(selectedWorkspace.id, {
      //   email: inviteEmail,
      //   role: inviteRole,
      // })
      setShowInviteModal(false)
      setInviteEmail('')
      showNotification('멤버 초대가 전송되었습니다', 'success')
      loadMembers(selectedWorkspace.id)
    } catch (error: any) {
      showNotification(error.message || '멤버 초대에 실패했습니다', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="workspace-manager">
      <div className="workspace-header">
        <h2>워크스페이스</h2>
        <button
          className="create-workspace-button"
          onClick={() => setShowCreateModal(true)}
        >
          + 새 워크스페이스
        </button>
      </div>

      <div className="workspace-content">
        <div className="workspace-list">
          {workspaces.length === 0 ? (
            <div className="empty-state">
              <p>워크스페이스가 없습니다</p>
              <p className="empty-hint">새 워크스페이스를 생성하여 팀과 협업하세요</p>
            </div>
          ) : (
            workspaces.map(workspace => (
              <div
                key={workspace.id}
                className={`workspace-item ${selectedWorkspace?.id === workspace.id ? 'selected' : ''}`}
                onClick={() => setSelectedWorkspace(workspace)}
              >
                <div className="workspace-info">
                  <h3>{workspace.name}</h3>
                  {workspace.description && (
                    <p className="workspace-description">{workspace.description}</p>
                  )}
                  <div className="workspace-meta">
                    <span>멤버 {workspace.memberCount || 0}명</span>
                    <span>•</span>
                    <span>{new Date(workspace.createdAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {selectedWorkspace && (
          <div className="workspace-details">
            <div className="workspace-details-header">
              <h3>{selectedWorkspace.name}</h3>
              <button
                className="invite-button"
                onClick={() => setShowInviteModal(true)}
              >
                멤버 초대
              </button>
            </div>

            <div className="members-section">
              <h4>멤버</h4>
              <div className="members-list">
                {members.map(member => (
                  <div key={member.id} className="member-item">
                    <div className="member-info">
                      <span className="member-name">{member.userName || member.userEmail}</span>
                      <span className="member-role">{member.role}</span>
                    </div>
                    <span className="member-joined">
                      {new Date(member.joinedAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 생성 모달 */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>새 워크스페이스 생성</h3>
            <div className="form-group">
              <label>워크스페이스 이름</label>
              <input
                type="text"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="예: 마케팅 팀"
              />
            </div>
            <div className="form-group">
              <label>설명 (선택사항)</label>
              <textarea
                value={newWorkspaceDesc}
                onChange={(e) => setNewWorkspaceDesc(e.target.value)}
                placeholder="워크스페이스에 대한 설명을 입력하세요"
                rows={3}
              />
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowCreateModal(false)}>취소</button>
              <button onClick={handleCreateWorkspace} disabled={isLoading}>
                생성
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 초대 모달 */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>멤버 초대</h3>
            <div className="form-group">
              <label>이메일</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className="form-group">
              <label>역할</label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)}>
                <option value="MEMBER">멤버</option>
                <option value="ADMIN">관리자</option>
                <option value="VIEWER">뷰어</option>
              </select>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowInviteModal(false)}>취소</button>
              <button onClick={handleInviteMember} disabled={isLoading}>
                초대
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkspaceManager
