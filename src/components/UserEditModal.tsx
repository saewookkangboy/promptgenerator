import { useState, useEffect } from 'react'
import { adminAPI } from '../utils/api'
import { showNotification } from '../utils/notifications'
import './UserEditModal.css'

interface User {
  id: string
  email: string
  name?: string | null
  tier: string
  subscriptionStatus: string
  subscriptionStartedAt?: string | null
  subscriptionEndsAt?: string | null
  createdAt: string
  lastLoginAt?: string | null
  stats?: {
    promptCount: number
    workspaceCount: number
  }
}

interface UserEditModalProps {
  isOpen: boolean
  userId: string | null
  onClose: () => void
  onUpdate: () => void
}

const TIER_OPTIONS = [
  { value: 'FREE', label: 'FREE' },
  { value: 'BASIC', label: 'BASIC' },
  { value: 'PROFESSIONAL', label: 'PROFESSIONAL' },
  { value: 'ENTERPRISE', label: 'ENTERPRISE' },
]

const SUBSCRIPTION_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'INACTIVE', label: 'INACTIVE' },
  { value: 'CANCELLED', label: 'CANCELLED' },
  { value: 'EXPIRED', label: 'EXPIRED' },
]

function UserEditModal({ isOpen, userId, onClose, onUpdate }: UserEditModalProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    tier: 'FREE',
    subscriptionStatus: 'INACTIVE',
    subscriptionEndsAt: '',
  })

  useEffect(() => {
    if (isOpen && userId) {
      loadUser()
    } else {
      setUser(null)
      setFormData({
        tier: 'FREE',
        subscriptionStatus: 'INACTIVE',
        subscriptionEndsAt: '',
      })
    }
  }, [isOpen, userId])

  const loadUser = async () => {
    if (!userId) return

    setLoading(true)
    try {
      const response = await adminAPI.getUser(userId)
      const userData = response.user
      setUser(userData)
      setFormData({
        tier: userData.tier || 'FREE',
        subscriptionStatus: userData.subscriptionStatus || 'INACTIVE',
        subscriptionEndsAt: userData.subscriptionEndsAt
          ? new Date(userData.subscriptionEndsAt).toISOString().split('T')[0]
          : '',
      })
    } catch (error: any) {
      console.error('사용자 정보 로드 실패:', error)
      showNotification('사용자 정보를 불러오는데 실패했습니다.', 'error')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!userId) return

    setSaving(true)
    try {
      // Tier 업데이트
      if (formData.tier !== user?.tier) {
        await adminAPI.updateUserTier(userId, formData.tier)
      }

      // Subscription 상태 업데이트
      if (formData.subscriptionStatus !== user?.subscriptionStatus || formData.subscriptionEndsAt) {
        await adminAPI.updateUserSubscription(
          userId,
          formData.subscriptionStatus,
          formData.subscriptionEndsAt || undefined
        )
      }

      showNotification('사용자 정보가 업데이트되었습니다.', 'success')
      onUpdate()
      onClose()
    } catch (error: any) {
      console.error('사용자 정보 업데이트 실패:', error)
      showNotification(
        error?.error || '사용자 정보를 업데이트하는데 실패했습니다.',
        'error'
      )
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>사용자 편집</h2>
          <button className="modal-close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="modal-loading">로딩 중...</div>
          ) : user ? (
            <>
              <div className="user-info-section">
                <div className="info-row">
                  <label>이메일</label>
                  <div className="info-value">{user.email}</div>
                </div>
                <div className="info-row">
                  <label>이름</label>
                  <div className="info-value">{user.name || '-'}</div>
                </div>
                <div className="info-row">
                  <label>가입일</label>
                  <div className="info-value">
                    {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                  </div>
                </div>
                {user.lastLoginAt && (
                  <div className="info-row">
                    <label>마지막 로그인</label>
                    <div className="info-value">
                      {new Date(user.lastLoginAt).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                )}
                {user.stats && (
                  <>
                    <div className="info-row">
                      <label>프롬프트 수</label>
                      <div className="info-value">{user.stats.promptCount}</div>
                    </div>
                    <div className="info-row">
                      <label>워크스페이스 수</label>
                      <div className="info-value">{user.stats.workspaceCount}</div>
                    </div>
                  </>
                )}
              </div>

              <div className="form-section">
                <div className="form-group">
                  <label htmlFor="tier">Tier</label>
                  <select
                    id="tier"
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                    className="form-select"
                  >
                    {TIER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="subscriptionStatus">구독 상태</label>
                  <select
                    id="subscriptionStatus"
                    value={formData.subscriptionStatus}
                    onChange={(e) =>
                      setFormData({ ...formData, subscriptionStatus: e.target.value })
                    }
                    className="form-select"
                  >
                    {SUBSCRIPTION_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="subscriptionEndsAt">구독 종료일 (선택사항)</label>
                  <input
                    id="subscriptionEndsAt"
                    type="date"
                    value={formData.subscriptionEndsAt}
                    onChange={(e) =>
                      setFormData({ ...formData, subscriptionEndsAt: e.target.value })
                    }
                    className="form-input"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="modal-error">사용자 정보를 불러올 수 없습니다.</div>
          )}
        </div>

        <div className="modal-footer">
          <button className="modal-button secondary" onClick={onClose} disabled={saving}>
            취소
          </button>
          <button
            className="modal-button primary"
            onClick={handleSave}
            disabled={loading || saving || !user}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UserEditModal

