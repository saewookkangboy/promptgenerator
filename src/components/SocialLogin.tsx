import { useState } from 'react'
import { showNotification } from '../utils/notifications'
import './SocialLogin.css'

interface SocialLoginProps {
  onSuccess?: () => void
}

export default function SocialLogin({ onSuccess }: SocialLoginProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const handleSocialLogin = async (provider: 'google' | 'github' | 'kakao' | 'naver') => {
    setIsLoading(provider)
    try {
      // 소셜 로그인 URL 생성
      const redirectUri = `${window.location.origin}/auth/callback?provider=${provider}`
      const authUrl = `/api/auth/${provider}?redirect_uri=${encodeURIComponent(redirectUri)}`
      
      // 새 창으로 소셜 로그인 페이지 열기
      const width = 500
      const height = 600
      const left = (window.screen.width - width) / 2
      const top = (window.screen.height - height) / 2
      
      const popup = window.open(
        authUrl,
        `${provider}Login`,
        `width=${width},height=${height},left=${left},top=${top}`
      )

      if (!popup) {
        showNotification('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.', 'error')
        setIsLoading(null)
        return
      }

      // 팝업에서 메시지 수신 대기
      const messageListener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return

        if (event.data.type === 'SOCIAL_LOGIN_SUCCESS') {
          window.removeEventListener('message', messageListener)
          popup.close()
          
          // 토큰 저장
          if (event.data.token) {
            localStorage.setItem('auth_token', event.data.token)
          }
          if (event.data.refreshToken) {
            localStorage.setItem('refresh_token', event.data.refreshToken)
          }
          
          showNotification(`${provider} 로그인 성공!`, 'success')
          setIsLoading(null)
          onSuccess?.()
          
          // 페이지 새로고침하여 인증 상태 반영
          window.location.reload()
        } else if (event.data.type === 'SOCIAL_LOGIN_ERROR') {
          window.removeEventListener('message', messageListener)
          popup.close()
          showNotification(event.data.message || '로그인에 실패했습니다', 'error')
          setIsLoading(null)
        }
      }

      window.addEventListener('message', messageListener)

      // 팝업이 닫혔는지 확인
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          window.removeEventListener('message', messageListener)
          setIsLoading(null)
        }
      }, 1000)
    } catch (error: any) {
      showNotification(error.message || '로그인에 실패했습니다', 'error')
      setIsLoading(null)
    }
  }

  const socialProviders = [
    {
      id: 'google' as const,
      name: 'Google',
      icon: '🔵',
      color: '#4285F4',
    },
    {
      id: 'github' as const,
      name: 'GitHub',
      icon: '⚫',
      color: '#24292e',
    },
    {
      id: 'kakao' as const,
      name: 'Kakao',
      icon: '💛',
      color: '#FEE500',
    },
    {
      id: 'naver' as const,
      name: 'Naver',
      icon: '🟢',
      color: '#03C75A',
    },
  ]

  return (
    <div className="social-login">
      <div className="social-login-divider">
        <span>또는</span>
      </div>
      <div className="social-login-buttons">
        {socialProviders.map((provider) => (
          <button
            key={provider.id}
            type="button"
            className={`social-login-button social-login-${provider.id}`}
            onClick={() => handleSocialLogin(provider.id)}
            disabled={isLoading !== null}
            style={{ '--provider-color': provider.color } as React.CSSProperties}
          >
            {isLoading === provider.id ? (
              <span className="social-login-spinner">⏳</span>
            ) : (
              <span className="social-login-icon">{provider.icon}</span>
            )}
            <span className="social-login-text">{provider.name}로 시작하기</span>
          </button>
        ))}
      </div>
    </div>
  )
}
