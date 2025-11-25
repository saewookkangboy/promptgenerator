// 로그인 컴포넌트
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { showNotification } from '../utils/notifications'
import './Login.css'

interface LoginProps {
  onSwitchToRegister: () => void
  onSuccess?: () => void
}

function Login({ onSwitchToRegister, onSuccess }: LoginProps) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      showNotification('이메일과 비밀번호를 입력해주세요', 'error')
      return
    }

    setIsLoading(true)
    try {
      await login(email, password)
      showNotification('로그인 성공!', 'success')
      onSuccess?.()
    } catch (error: any) {
      showNotification(error.message || '로그인에 실패했습니다', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>로그인</h2>
        <p className="auth-subtitle">프롬프트 메이커에 오신 것을 환영합니다</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={isLoading}
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
              required
              disabled={isLoading}
              minLength={8}
            />
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={isLoading}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="auth-switch">
          <p>
            계정이 없으신가요?{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="auth-link-button"
            >
              회원가입
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login

