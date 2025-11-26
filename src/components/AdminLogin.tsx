import { useState, FormEvent } from 'react'
import { setAdminAuth } from '../utils/storage'
import { authAPI } from '../utils/api'
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

    try {
      // Admin 이메일 형식으로 변환 (username이 이메일이 아니면 @troe.kr 추가)
      const email = username.includes('@') ? username : `${username}@troe.kr`
      
      // 서버에 로그인 시도
      const result = await authAPI.login(email, password)
      
      if (result.token) {
        // JWT 토큰이 성공적으로 받아졌으면 Admin 인증 완료
        setAdminAuth(true)
        onLogin()
      } else {
        setError('로그인에 실패했습니다. 토큰을 받을 수 없습니다.')
      }
    } catch (err: any) {
      console.error('Admin 로그인 오류:', err)
      
      // 네트워크 오류 또는 서버 오류 처리
      if (err.message?.includes('서버에 연결할 수 없습니다')) {
        // 서버 연결 실패 시 로컬 인증으로 폴백 (개발 환경만)
        const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001'
        if (API_BASE_URL.includes('localhost') && username === 'park' && password === '3107') {
          console.warn('서버 연결 실패, 로컬 인증으로 폴백 (개발 환경)')
          setAdminAuth(true)
          onLogin()
        } else {
          setError('서버에 연결할 수 없습니다. Railway 서버가 실행 중인지 확인해주세요.')
        }
      } else {
        // 인증 실패 - 더 자세한 오류 메시지
        const errorMessage = err.message || '아이디 또는 비밀번호가 올바르지 않습니다.'
        setError(errorMessage)
        
        // 403 오류인 경우 Admin 권한 안내
        if (errorMessage.includes('403') || errorMessage.includes('Admin 권한')) {
          setError('Admin 권한이 없습니다. Admin 이메일로 로그인해주세요. (예: park@troe.kr)')
        }
      }
    } finally {
      setIsLoading(false)
    }
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
            <label htmlFor="username">이메일 또는 아이디</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="이메일 또는 아이디를 입력하세요"
              className="admin-input"
              required
              autoComplete="username"
            />
            <small style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px', display: 'block' }}>
              아이디만 입력하면 @troe.kr이 자동으로 추가됩니다
            </small>
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

