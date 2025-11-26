// API 클라이언트 유틸리티

const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001'

// Admin 모드 확인 (순환 참조 방지를 위해 직접 확인)
function isAdminMode(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const adminAuth = localStorage.getItem('admin_auth')
    return adminAuth === 'true'
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
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '알 수 없는 오류가 발생했습니다' }))
      
      // 401 Unauthorized - 토큰 만료 또는 무효
      if (response.status === 401) {
        removeToken()
        // Admin 모드에서는 리다이렉트하지 않음 (서버 연결 실패 시에도 Admin 페이지 유지)
        if (!isAdminMode()) {
          window.location.href = '/login'
        }
        throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.')
      }

      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  } catch (error: any) {
    // 네트워크 오류 처리
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('서버에 연결할 수 없습니다. API 서버가 실행 중인지 확인해주세요.')
    }
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

// Admin API
export const adminAPI = {
  getStats: async () => {
    return apiRequest<any>('/api/admin/stats')
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

