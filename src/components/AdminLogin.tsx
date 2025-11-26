import { useState, FormEvent } from 'react'
import { setAdminAuth } from '../utils/storage'
import './AdminLogin.css'

interface AdminLoginProps {
  onLogin: () => void
  onBack?: () => void
}

function AdminLogin({ onLogin, onBack }: AdminLoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    // 간단한 딜레이로 UX 개선
    setTimeout(() => {
      if (username === 'park' && password === '3107') {
        setAdminAuth(true)
        onLogin()
      } else {
        setError('아이디 또는 비밀번호가 올바르지 않습니다.')
      }
      setIsLoading(false)
    }, 300)
  }

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2>Admin 로그인</h2>
          {onBack && (
            <button
              onClick={onBack}
              className="admin-back-button"
              type="button"
              style={{
                padding: '8px 16px',
                background: '#ffffff',
                border: '1px solid #e5e5e5',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                color: '#000000'
              }}
            >
              메인으로
            </button>
          )}
        </div>
        <p className="admin-login-subtitle">관리자 전용 페이지입니다</p>
        
        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="form-group">
            <label htmlFor="username">아이디</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="아이디를 입력하세요"
              className="admin-input"
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              className="admin-input"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="admin-error-message" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="admin-login-button"
            disabled={isLoading}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AdminLogin

