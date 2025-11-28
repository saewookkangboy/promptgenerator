// API 클라이언트 유틸리티

// API 서버 주소를 환경 변수 → 현재 호스트 → 로컬호스트 순으로 해석
const resolveApiBaseUrl = (): string => {
  const envUrl = (import.meta.env?.VITE_API_BASE_URL as string | undefined)?.trim()
  if (envUrl) {
    return envUrl.replace(/\/+$/, '')
  }

  if (typeof window !== 'undefined') {
    const origin = window.location.origin
    // 로컬 환경에서는 명시적으로 백엔드 포트로 연결
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return 'http://localhost:3001'
    }
    // 배포 환경에서는 동일 도메인으로 프록시된 API 사용
    return origin.replace(/\/+$/, '')
  }

  return 'http://localhost:3001'
}

export const API_BASE_URL = resolveApiBaseUrl()

// Admin 모드 확인 (순환 참조 방지를 위해 직접 확인)
function isAdminMode(): boolean {
  if (typeof window === 'undefined') return false
  try {
    // admin_auth가 설정되어 있거나, admin_mode가 설정되어 있으면 Admin 모드
    const adminAuth = localStorage.getItem('admin_auth')
    const adminMode = localStorage.getItem('admin_mode')
    // 또는 현재 URL이 Admin 관련 페이지인지 확인
    const isAdminPage = window.location.pathname.includes('/admin') || 
                        window.location.hash.includes('admin')
    
    return adminAuth === 'true' || adminMode === 'true' || isAdminPage
  } catch {
    return false
  }
}

// 토큰 저장/조회
export function getToken(): string | null {
  return localStorage.getItem('auth_token')
}

export function setToken(token: string): void {
  localStorage.setItem('auth_token', token)
}

export function removeToken(): void {
  localStorage.removeItem('auth_token')
}

// API 요청 헬퍼
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = `${API_BASE_URL}${normalizedEndpoint}`
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // 기존 headers 병합
  if (options.headers) {
    Object.assign(headers, options.headers as Record<string, string>)
  }

  // Authorization 헤더 추가
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    console.log(`[API Request] ${options.method || 'GET'} ${url}`)
    
    const response = await fetch(url, {
      ...options,
      headers,
    })

    console.log(`[API Response] ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '알 수 없는 오류가 발생했습니다' }))
      
      // 401 Unauthorized - 토큰 만료 또는 무효
      if (response.status === 401) {
        removeToken()
        // Admin 모드이거나 로그인 페이지에서는 리다이렉트하지 않음
        const isAdmin = isAdminMode()
        const isLoginPage = window.location.pathname.includes('/login') || 
                           window.location.pathname === '/' ||
                           document.querySelector('.admin-login-container') !== null
        
        if (!isAdmin && !isLoginPage) {
          // 일반 사용자이고 로그인 페이지가 아니면 리다이렉트
          window.location.href = '/login'
        }
        // Admin 모드이거나 로그인 페이지에서는 에러만 throw (리다이렉트 안 함)
        throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.')
      }

      throw new Error(error.error || `HTTP ${response.status}`)
    }

    const jsonData = await response.json()
    console.log(`[API Response] 응답 데이터:`, jsonData)
    return jsonData
  } catch (error: any) {
    // 네트워크 오류 처리
    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
      console.error('[API Error] 네트워크 오류:', error)
      console.error('[API Error] 시도한 URL:', `${API_BASE_URL}${normalizedEndpoint}`)
      throw new Error(`서버에 연결할 수 없습니다. API 서버(${API_BASE_URL})가 실행 중인지 확인해주세요.`)
    }
    console.error('[API Error] 기타 오류:', error)
    console.error('[API Error] 에러 상세:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack
    })
    throw error
  }
}

// 인증 API
export const authAPI = {
  register: async (email: string, password: string, name?: string) => {
    return apiRequest<{ message: string; user: any; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    })
  },

  login: async (email: string, password: string) => {
    const result = await apiRequest<{ message: string; user: any; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    
    if (result.token) {
      setToken(result.token)
    }
    
    return result
  },

  logout: () => {
    removeToken()
  },

  getMe: async () => {
    return apiRequest<{ user: any }>('/api/auth/me')
  },

  refreshToken: async () => {
    const result = await apiRequest<{ token: string }>('/api/auth/refresh', {
      method: 'POST',
    })
    
    if (result.token) {
      setToken(result.token)
    }
    
    return result
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    return apiRequest<{ message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
  },
}

// 사용자 API
export const userAPI = {
  getProfile: async () => {
    return apiRequest<{ user: any }>('/api/users/profile')
  },

  updateProfile: async (name?: string) => {
    return apiRequest<{ message: string; user: any }>('/api/users/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    })
  },

  getApiKey: async () => {
    return apiRequest<{ apiKey: string | null; hasApiKey: boolean }>('/api/users/api-key')
  },

  createApiKey: async () => {
    return apiRequest<{ message: string; apiKey: string; warning: string }>('/api/users/api-key', {
      method: 'POST',
    })
  },

  deleteApiKey: async () => {
    return apiRequest<{ message: string }>('/api/users/api-key', {
      method: 'DELETE',
    })
  },
}

const buildQueryString = (params?: Record<string, string | number | boolean | undefined>): string => {
  if (!params) return ''
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query.append(key, String(value))
    }
  })
  const queryString = query.toString()
  return queryString ? `?${queryString}` : ''
}

// 프롬프트 API
export const promptAPI = {
  list: async (params?: {
    category?: string
    folderId?: string
    tagId?: string
    search?: string
    page?: number
    limit?: number
  }) => {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value))
        }
      })
    }
    
    return apiRequest<{ prompts: any[]; pagination: any }>(`/api/prompts?${queryParams.toString()}`)
  },

  get: async (id: string) => {
    return apiRequest<any>(`/api/prompts/${id}`)
  },

  create: async (data: {
    title?: string
    content: string
    category: string
    model?: string
    inputText?: string
    options?: any
    folderId?: string
    workspaceId?: string
    tagIds?: string[]
  }) => {
    return apiRequest<any>('/api/prompts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update: async (id: string, data: {
    title?: string
    content?: string
    options?: any
    folderId?: string
    tagIds?: string[]
  }) => {
    return apiRequest<any>(`/api/prompts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string) => {
    return apiRequest<{ message: string }>(`/api/prompts/${id}`, {
      method: 'DELETE',
    })
  },

  getVersions: async (id: string) => {
    return apiRequest<any[]>(`/api/prompts/${id}/versions`)
  },
}

// 가이드 API
export const guideAPI = {
  getLatest: async (params?: { category?: string; limit?: number; includeInactive?: boolean }) => {
    const query = buildQueryString({
      category: params?.category,
      limit: params?.limit,
      includeInactive: params?.includeInactive,
    })
    return apiRequest<{ guides: any[]; count: number }>(`/api/admin/guides/latest${query}`)
  },

  getHistory: async (params?: { limit?: number }) => {
    const query = buildQueryString({ limit: params?.limit })
    return apiRequest<{ history: any[] }>(`/api/admin/guides/history${query}`)
  },

  getGuideByModel: async (modelName: string) => {
    return apiRequest<{ guide: any }>(`/api/admin/guides/model/${modelName}`)
  },

  getStatus: async () => {
    return apiRequest<{ nextCollection: number; daysUntilNext: number; isOverdue: boolean }>(
      '/api/guides/status'
    )
  },

  getPublicLatest: async (params?: { category?: string; limit?: number }) => {
    const query = buildQueryString({
      category: params?.category,
      limit: params?.limit,
    })
    return apiRequest<{ guides: any[] }>(`/api/guides/public/latest${query}`)
  },
}

// 템플릿 API
export const templateAPI = {
  getPublic: async (params?: {
    category?: string
    search?: string
    page?: number
    limit?: number
  }) => {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value))
        }
      })
    }
    
    const url = `/api/templates/public${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    console.log('[templateAPI] 요청 URL:', url)
    console.log('[templateAPI] API_BASE_URL:', API_BASE_URL)
    console.log('[templateAPI] 전체 URL:', `${API_BASE_URL}${url}`)
    
    try {
      const result = await apiRequest<{ templates: any[]; pagination: any }>(url)
      console.log('[templateAPI] 응답 성공:', result)
      return result
    } catch (error: any) {
      console.error('[templateAPI] 요청 실패:', error)
      throw error
    }
  },

  get: async (id: string) => {
    return apiRequest<any>(`/api/templates/${id}`)
  },

  apply: async (id: string, variables: Record<string, string>) => {
    // 공개 템플릿은 인증 없이 사용 가능하므로 인증 헤더를 보내지 않음
    const normalizedEndpoint = `/api/templates/${id}/apply`
    const url = `${API_BASE_URL}${normalizedEndpoint}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    // 공개 템플릿은 인증 헤더 없이 요청
    // (프리미엄 템플릿인 경우 서버에서 401을 반환하지만, 공개 템플릿은 문제없음)
    
    try {
      console.log(`[templateAPI.apply] POST ${url}`)
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ variables }),
      })

      console.log(`[templateAPI.apply] ${response.status} ${response.statusText}`)

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: '알 수 없는 오류가 발생했습니다' }))
        
        // 401 에러인 경우, 공개 템플릿이므로 에러 메시지를 변경
        if (response.status === 401) {
          throw new Error(error.error || '템플릿에 접근할 수 없습니다. 프리미엄 템플릿은 로그인이 필요할 수 있습니다.')
        }
        
        throw new Error(error.error || `HTTP ${response.status}`)
      }

      const jsonData = await response.json()
      console.log(`[templateAPI.apply] 응답 성공:`, jsonData)
      return jsonData
    } catch (error: any) {
      // 네트워크 오류 처리
      if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
        console.error('[templateAPI.apply] 네트워크 오류:', error)
        throw new Error(`서버에 연결할 수 없습니다. API 서버(${API_BASE_URL})가 실행 중인지 확인해주세요.`)
      }
      console.error('[templateAPI.apply] 요청 실패:', error)
      throw error
    }
  },

  recordUsage: async (templateId: string, data: {
    variables: Record<string, string>
    qualityScore?: number
  }) => {
    return apiRequest<void>('/api/analytics/template-used', {
      method: 'POST',
      body: JSON.stringify({
        templateId,
        ...data,
      }),
    })
  },
}

// 키워드 추출 API
export const keywordAPI = {
  extract: async (metaPrompt: string, contextPrompt: string) => {
    return apiRequest<{ keywords: Array<{ keyword: string; importance: 'high' | 'medium' | 'low'; pos: string }> }>(
      '/api/keywords/extract',
      {
        method: 'POST',
        body: JSON.stringify({ metaPrompt, contextPrompt }),
      }
    )
  },
}

// Admin API
export const adminAPI = {
  getStats: async () => {
    return apiRequest<any>('/api/admin/stats')
  },

  getDbHealth: async () => {
    return apiRequest<any>('/api/admin/db/health')
  },

  getUsers: async (params?: {
    page?: number
    limit?: number
    tier?: string
    status?: string
    search?: string
  }) => {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value))
        }
      })
    }
    
    return apiRequest<{ users: any[]; pagination: any }>(`/api/admin/users?${queryParams.toString()}`)
  },

  getUser: async (id: string) => {
    return apiRequest<{ user: any }>(`/api/admin/users/${id}`)
  },

  updateUserTier: async (id: string, tier: string) => {
    return apiRequest<{ message: string; user: any }>(`/api/admin/users/${id}/tier`, {
      method: 'PATCH',
      body: JSON.stringify({ tier }),
    })
  },

  updateUserSubscription: async (id: string, status: string, endsAt?: string) => {
    return apiRequest<{ message: string; user: any }>(`/api/admin/users/${id}/subscription`, {
      method: 'PATCH',
      body: JSON.stringify({ status, endsAt }),
    })
  },

  getPrompts: async (params?: {
    page?: number
    limit?: number
    category?: string
    userId?: string
    search?: string
  }) => {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value))
        }
      })
    }
    
    return apiRequest<{ prompts: any[]; pagination: any }>(`/api/admin/prompts?${queryParams.toString()}`)
  },

  getAuditLogs: async (params?: {
    page?: number
    limit?: number
    action?: string
    resourceType?: string
  }) => {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value))
        }
      })
    }
    
    return apiRequest<{ logs: any[]; pagination: any }>(`/api/admin/audit-logs?${queryParams.toString()}`)
  },

  getTemplates: async (params?: {
    page?: number
    limit?: number
    category?: string
    search?: string
  }) => {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value))
        }
      })
    }
    return apiRequest<{ templates: any[]; pagination: any }>(`/api/admin/templates?${queryParams.toString()}`)
  },

  getTemplate: async (id: string) => {
    return apiRequest<any>(`/api/admin/templates/${id}`)
  },

  createTemplate: async (data: any) => {
    return apiRequest<any>('/api/admin/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  updateTemplate: async (id: string, data: any) => {
    return apiRequest<any>(`/api/admin/templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  deleteTemplate: async (id: string) => {
    return apiRequest<{ message: string }>(`/api/admin/templates/${id}`, {
      method: 'DELETE',
    })
  },

  rollbackTemplate: async (id: string, version: number, changeSummary?: string) => {
    return apiRequest<any>(`/api/admin/templates/${id}/rollback`, {
      method: 'POST',
      body: JSON.stringify({ version, changeSummary }),
    })
  },
}

// Analytics API
export const analyticsAPI = {
  logPromptSaveFailure: async (data: {
    category: string
    reason: string
    context?: any
  }) => {
    return apiRequest<{ success: boolean }>('/api/analytics/prompt-save-failed', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// 번역 API
export const translationAPI = {
  translateToEnglish: async (
    texts: string[],
    options: { targetLang?: string; sourceLang?: string; compress?: boolean; context?: string } = {}
  ) => {
    if (!Array.isArray(texts) || texts.length === 0) {
      return { translations: [] as string[] }
    }

    return apiRequest<{ translations: string[] }>('/api/translate', {
      method: 'POST',
      body: JSON.stringify({
        texts,
        targetLang: options.targetLang || 'EN-US',
        sourceLang: options.sourceLang,
        compress: options.compress ?? false,
        context: options.context,
      }),
    })
  },
}

// AI 서비스 정보 API
export const aiServicesAPI = {
  list: async (params?: {
    category?: 'IMAGE' | 'VIDEO'
    status?: 'PUBLIC' | 'GATED' | 'UNKNOWN'
  }) => {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value))
        }
      })
    }
    return apiRequest<{ success: boolean; data: any[]; count: number }>(
      `/api/ai-services?${queryParams.toString()}`
    )
  },

  get: async (id: string) => {
    return apiRequest<{ success: boolean; data: any }>(`/api/ai-services/${id}`)
  },

  getByCategory: async (category: 'IMAGE' | 'VIDEO') => {
    return apiRequest<{ success: boolean; data: any[]; count: number }>(
      `/api/ai-services/category/${category}`
    )
  },
}
