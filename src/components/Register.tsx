// 회원가입 컴포넌트
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { showNotification } from '../utils/notifications'
import './Login.css'

interface RegisterProps {
  onSwitchToLogin: () => void
  onSuccess?: () => void
}

function Register({ onSwitchToLogin, onSuccess }: RegisterProps) {
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password || !confirmPassword) {
      showNotification('모든 필드를 입력해주세요', 'error')
      return
    }

    if (password.length < 8) {
      showNotification('비밀번호는 최소 8자 이상이어야 합니다', 'error')
      return
    }

    if (password !== confirmPassword) {
      showNotification('비밀번호가 일치하지 않습니다', 'error')
      return
    }

    setIsLoading(true)
    try {
      await register(email, password, name || undefined)
      showNotification('회원가입 성공!', 'success')
      onSuccess?.()
    } catch (error: any) {
      const errorMessage = error.message || '회원가입에 실패했습니다'
      showNotification(errorMessage, 'error')
      // 로컬 모드로 전환된 경우에도 성공으로 처리
      if (errorMessage.includes('로컬 모드로 전환')) {
        setTimeout(() => {
          onSuccess?.()
        }, 1000)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>회원가입</h2>
        <p className="auth-subtitle">새로운 계정을 만들어보세요</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="register-email">이메일</label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="register-name">이름 (선택사항)</label>
            <input
              id="register-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="register-password">비밀번호</label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="최소 8자 이상"
              required
              disabled={isLoading}
              minLength={8}
            />
          </div>

          <div className="form-group">
            <label htmlFor="register-confirm-password">비밀번호 확인</label>
            <input
              id="register-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="비밀번호를 다시 입력하세요"
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
            {isLoading ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <div className="auth-switch">
          <p>
            이미 계정이 있으신가요?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="auth-link-button"
            >
              로그인
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register

