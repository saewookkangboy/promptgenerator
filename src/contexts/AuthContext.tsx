// 인증 상태 관리 Context
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authAPI } from '../utils/api'

interface User {
  id: string
  email: string
  name: string | null
  tier: string
  subscriptionStatus?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  // 로그인 기능 비활성화: 항상 null로 설정하여 로그인 없이 사용 가능
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)

  // 로그인 없이 바로 사용 가능하도록 설정
  useEffect(() => {
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password)
      setUser(response.user)
      // 로컬 스토리지에도 저장 (API 서버 없을 때 대비)
      localStorage.setItem('local_user', JSON.stringify(response.user))
    } catch (error: any) {
      // API 서버가 없을 때 로컬 모드로 전환
      if (error.message && error.message.includes('서버에 연결할 수 없습니다')) {
        // 로컬 사용자 확인 (간단한 폴백)
        const localUser = localStorage.getItem('local_user')
        if (localUser) {
          try {
            const user = JSON.parse(localUser)
            if (user.email === email) {
              setUser(user)
              localStorage.setItem('auth_token', `local_token_${Date.now()}`)
              throw new Error('API 서버가 실행되지 않아 로컬 모드로 전환되었습니다. 일부 기능이 제한될 수 있습니다.')
            }
          } catch (e) {
            // 파싱 실패
          }
        }
        throw new Error('API 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.')
      }
      throw new Error(error.message || '로그인에 실패했습니다')
    }
  }

  const register = async (email: string, password: string, name?: string) => {
    try {
      const response = await authAPI.register(email, password, name)
      setUser(response.user)
      // 로컬 스토리지에도 저장 (API 서버 없을 때 대비)
      localStorage.setItem('local_user', JSON.stringify(response.user))
    } catch (error: any) {
      // API 서버가 없을 때 로컬 모드로 전환
      if (error.message && error.message.includes('서버에 연결할 수 없습니다')) {
        // 로컬 사용자 생성 (임시)
        const localUser = {
          id: `local_${Date.now()}`,
          email,
          name: name || null,
          tier: 'FREE',
        }
        setUser(localUser)
        localStorage.setItem('local_user', JSON.stringify(localUser))
        localStorage.setItem('auth_token', `local_token_${Date.now()}`)
        throw new Error('API 서버가 실행되지 않아 로컬 모드로 전환되었습니다. 일부 기능이 제한될 수 있습니다.')
      }
      throw new Error(error.message || '회원가입에 실패했습니다')
    }
  }

  const logout = () => {
    authAPI.logout()
    setUser(null)
  }

  const refreshUser = async () => {
    try {
      const response = await authAPI.getMe()
      setUser(response.user)
    } catch (error) {
      console.error('사용자 정보 갱신 실패:', error)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

