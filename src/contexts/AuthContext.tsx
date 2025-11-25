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
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // 초기 사용자 정보 로드
  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setLoading(false)
        return
      }

      const response = await authAPI.getMe()
      setUser(response.user)
    } catch (error) {
      console.error('사용자 정보 로드 실패:', error)
      localStorage.removeItem('auth_token')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password)
      setUser(response.user)
    } catch (error: any) {
      throw new Error(error.message || '로그인에 실패했습니다')
    }
  }

  const register = async (email: string, password: string, name?: string) => {
    try {
      const response = await authAPI.register(email, password, name)
      setUser(response.user)
    } catch (error: any) {
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

