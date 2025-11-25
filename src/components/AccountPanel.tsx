import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { userAPI } from '../utils/api'
import { showNotification } from '../utils/notifications'
import type { UserOverview } from '../types/user.types'

interface AccountPanelProps {
  user: { id: string; email: string; name: string | null }
  onNavigate: (tab: 'list' | 'workspace') => void
  onLogout: () => void
}

function AccountPanel({ user, onNavigate, onLogout }: AccountPanelProps) {
  const { refreshUser } = useAuth()
  const [overview, setOverview] = useState<UserOverview | null>(null)
  const [editName, setEditName] = useState(user.name || '')
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    let mounted = true
    userAPI
      .getOverview()
      .then((data: UserOverview) => {
        if (mounted) {
          setOverview(data)
          setEditName(data.user.name || '')
        }
      })
      .catch((err) => {
        console.error('계정 개요 로딩 실패:', err)
      })
    return () => {
      mounted = false
    }
  }, [])

  const handleProfileUpdate = async () => {
    if (editName.trim().length === 0) {
      showNotification('이름을 입력하거나 기존 이름을 유지하세요.', 'warning')
      return
    }

    setIsUpdating(true)
    try {
      await userAPI.updateProfile(editName.trim())
      await refreshUser()
      showNotification('프로필이 업데이트되었습니다.', 'success')
    } catch (error: any) {
      showNotification(error.message || '프로필 수정에 실패했습니다.', 'error')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm('정말로 계정을 삭제하시겠습니까? 모든 데이터가 영구적으로 삭제됩니다.')) {
      return
    }
    setIsDeleting(true)
    try {
      await userAPI.deleteAccount()
      showNotification('계정이 삭제되었습니다.', 'success')
      onLogout()
    } catch (error: any) {
      showNotification(error.message || '계정 삭제에 실패했습니다.', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  const recentPrompts = overview?.recentPrompts ?? []

  return (
    <section className="account-panel">
      <div className="account-header">
        <div>
          <h2>{overview?.user.name || overview?.user.email || user.email} 님</h2>
          <p>내 프롬프트/워크스페이스와 계정 설정을 한 곳에서 관리하세요.</p>
        </div>
        <div className="account-badges">
          <span className="badge">{overview?.user.tier || 'FREE'}</span>
          {overview?.user.subscriptionStatus && (
            <span className="badge secondary">{overview.user.subscriptionStatus}</span>
          )}
        </div>
      </div>

      <div className="account-grid">
        <div className="account-card">
          <h3>계정 정보</h3>
          <label htmlFor="displayName">표시 이름</label>
          <input
            id="displayName"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="이름을 입력하세요"
          />
          <label>이메일</label>
          <input value={overview?.user.email || user.email} disabled />
          <div className="account-card-actions">
            <button onClick={handleProfileUpdate} disabled={isUpdating}>
              {isUpdating ? '저장 중...' : '프로필 저장'}
            </button>
            <button className="danger" onClick={handleDeleteAccount} disabled={isDeleting}>
              {isDeleting ? '삭제 중...' : '회원 탈퇴'}
            </button>
          </div>
        </div>

        <div className="account-card">
          <h3>활동 요약</h3>
          <div className="stats-row">
            <div>
              <strong>{overview?.user.stats?.promptCount ?? 0}</strong>
              <span>프롬프트</span>
            </div>
            <div>
              <strong>{overview?.user.stats?.workspaceCount ?? 0}</strong>
              <span>워크스페이스</span>
            </div>
          </div>
          <div className="account-card-actions">
            <button onClick={() => onNavigate('list')}>내 프롬프트 관리</button>
            <button onClick={() => onNavigate('workspace')}>워크스페이스 관리</button>
          </div>
        </div>

        <div className="account-card recent-prompts">
          <h3>최근 프롬프트</h3>
          {recentPrompts.length ? (
            <ul>
              {recentPrompts.map((prompt) => (
                <li key={prompt.id}>
                  <div>
                    <strong>{prompt.title || '제목 없음'}</strong>
                    <span>{prompt.category}</span>
                  </div>
                  <small>{new Date(prompt.createdAt).toLocaleString()}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p>아직 생성한 프롬프트가 없습니다.</p>
          )}
        </div>
      </div>
    </section>
  )
}

export default AccountPanel

