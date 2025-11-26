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
      
      // API URL 확인 및 로그
      const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001'
      console.log('[Admin Login] API URL:', API_BASE_URL)
      console.log('[Admin Login] Email:', email)
      
      // 서버에 로그인 시도
      const result = await authAPI.login(email, password)
      
      if (result.token) {
        // JWT 토큰이 성공적으로 받아졌으면 Admin 인증 완료
        console.log('[Admin Login] 로그인 성공, 토큰 받음')
        setAdminAuth(true)
        
        // 로그인 성공 후 약간의 딜레이를 두고 콜백 호출 (상태 업데이트 보장)
        setTimeout(() => {
          onLogin()
        }, 100)
      } else {
        setError('로그인에 실패했습니다. 토큰을 받을 수 없습니다.')
      }
    } catch (err: any) {
      console.error('[Admin Login] 오류 상세:', {
        message: err.message,
        name: err.name,
        stack: err.stack,
        error: err
      })
      
      // 네트워크 오류 또는 서버 오류 처리
      if (err.message?.includes('서버에 연결할 수 없습니다') || 
          err.message?.includes('fetch') ||
          err.name === 'TypeError') {
        // 서버 연결 실패
        const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001'
        const errorMsg = `서버에 연결할 수 없습니다.\n\n서버 URL: ${API_BASE_URL}\n\n확인 사항:\n1. Railway 서버가 실행 중인지 확인\n2. Vercel 환경 변수에 VITE_API_BASE_URL이 설정되어 있는지 확인\n3. 브라우저 콘솔에서 네트워크 오류 확인`
        setError(errorMsg)
      } else if (err.message?.includes('401') || 
                 err.message?.includes('인증이 만료') ||
                 err.message?.includes('이메일 또는 비밀번호') ||
                 err.message?.includes('올바르지 않습니다')) {
        // 인증 실패 (401 오류 또는 잘못된 자격증명)
        setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      } else if (err.message?.includes('403') || err.message?.includes('Admin 권한')) {
        // Admin 권한 없음
        setError('Admin 권한이 없습니다. Admin 이메일로 로그인해주세요.')
      } else {
        // 기타 오류 - 리다이렉트 방지를 위해 에러만 표시
        const errorMsg = err.message || '로그인 중 오류가 발생했습니다.'
        setError(errorMsg)
        console.error('[Admin Login] 처리되지 않은 오류:', err)
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

