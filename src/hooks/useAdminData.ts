import { useCallback, useEffect, useState } from 'react'
import { adminAPI } from '../utils/api'

export type ServerStatus = 'connecting' | 'online' | 'offline' | 'auth_error'

export interface AdminPromptRecord {
  id: string
  title?: string | null
  content: string
  category: string
  model?: string | null
  userId: string
  user?: {
    id: string
    email: string
    name?: string | null
  } | null
  createdAt: string
  updatedAt: string
  options?: any
}

interface PaginationInfo {
  page: number
  totalPages: number
  total: number
  limit: number
}

interface UseAdminDataOptions {
  usersPage?: number
  promptsPage?: number
  usersLimit?: number
  promptsLimit?: number
  recordsLimit?: number
  autoRefreshMs?: number
}

interface AdminDataState {
  generationStats: {
    total: number
    text: number
    image: number
    video: number
    engineering: number
  }
  statsOverview: any
  visitCount: number
  promptRecords: AdminPromptRecord[]
  users: any[]
  prompts: any[]
  pagination: {
    users: PaginationInfo
    prompts: PaginationInfo
  }
  loading: boolean
  serverStatus: ServerStatus
  errors: Record<string, string | null>
  refresh: () => Promise<void>
  lastUpdated: number | null
}

const DEFAULT_STATS = {
  total: 0,
  text: 0,
  image: 0,
  video: 0,
  engineering: 0,
}

const getErrorMessage = (reason: any): string => {
  if (!reason) return '알 수 없는 오류가 발생했습니다.'
  if (typeof reason === 'string') return reason
  if (reason?.message) return reason.message
  try {
    return JSON.stringify(reason)
  } catch {
    return '요청 처리 중 오류가 발생했습니다.'
  }
}

const mapPromptToRecord = (prompt: any): AdminPromptRecord => ({
  id: prompt.id,
  title: prompt.title,
  content: prompt.content,
  category: prompt.category,
  model: prompt.model,
  userId: prompt.userId,
  user: prompt.user,
  createdAt: prompt.createdAt,
  updatedAt: prompt.updatedAt,
  options: prompt.options,
})

export function useAdminData(options: UseAdminDataOptions = {}): AdminDataState {
  const {
    usersPage = 1,
    promptsPage = 1,
    usersLimit = 20,
    promptsLimit = 20,
    recordsLimit = 200,
    autoRefreshMs = 30000,
  } = options

  const [generationStats, setGenerationStats] = useState(DEFAULT_STATS)
  const [statsOverview, setStatsOverview] = useState<any>(null)
  const [visitCount, setVisitCount] = useState(0)
  const [promptRecords, setPromptRecords] = useState<AdminPromptRecord[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [prompts, setPrompts] = useState<any[]>([])
  const [pagination, setPagination] = useState<{
    users: PaginationInfo
    prompts: PaginationInfo
  }>({
    users: { page: usersPage, totalPages: 1, total: 0, limit: usersLimit },
    prompts: { page: promptsPage, totalPages: 1, total: 0, limit: promptsLimit },
  })
  const [loading, setLoading] = useState(true)
  const [serverStatus, setServerStatus] = useState<ServerStatus>('connecting')
  const [errors, setErrors] = useState<Record<string, string | null>>({})
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const newErrors: Record<string, string | null> = {}

    try {
      const [statsRes, usersRes, promptsRes, recordsRes] = await Promise.allSettled([
        adminAPI.getStats(),
        adminAPI.getUsers({ page: usersPage, limit: usersLimit }),
        adminAPI.getPrompts({ page: promptsPage, limit: promptsLimit }),
        adminAPI.getPrompts({ page: 1, limit: recordsLimit }),
      ])

      let successCount = 0

      if (statsRes.status === 'fulfilled') {
        successCount++
        setStatsOverview(statsRes.value)
        const statsData = statsRes.value?.stats || {}
        setGenerationStats({
          total: statsData.total || 0,
          text: statsData.text || 0,
          image: statsData.image || 0,
          video: statsData.video || 0,
          engineering: statsData.engineering || 0,
        })
        const visits =
          statsRes.value?.visitCount ??
          statsRes.value?.overview?.totalUsers ??
          statsData.total ??
          0
        setVisitCount(visits)
      } else {
        newErrors.stats = getErrorMessage(statsRes.reason)
      }

      if (usersRes.status === 'fulfilled') {
        successCount++
        setUsers(usersRes.value.users || [])
        if (usersRes.value.pagination) {
          setPagination((prev) => ({
            ...prev,
            users: {
              page: usersRes.value.pagination.page,
              totalPages: usersRes.value.pagination.totalPages,
              total: usersRes.value.pagination.total,
              limit: usersRes.value.pagination.limit || usersLimit,
            },
          }))
        }
      } else {
        newErrors.users = getErrorMessage(usersRes.reason)
      }

      if (promptsRes.status === 'fulfilled') {
        successCount++
        setPrompts(promptsRes.value.prompts || [])
        if (promptsRes.value.pagination) {
          setPagination((prev) => ({
            ...prev,
            prompts: {
              page: promptsRes.value.pagination.page,
              totalPages: promptsRes.value.pagination.totalPages,
              total: promptsRes.value.pagination.total,
              limit: promptsRes.value.pagination.limit || promptsLimit,
            },
          }))
        }
      } else {
        newErrors.prompts = getErrorMessage(promptsRes.reason)
      }

      if (recordsRes.status === 'fulfilled') {
        successCount++
        const recordList = (recordsRes.value.prompts || []).map(mapPromptToRecord)
        setPromptRecords(recordList)
      } else {
        newErrors.records = getErrorMessage(recordsRes.reason)
      }

      setErrors(newErrors)

      if (successCount > 0) {
        setServerStatus('online')
        setLastUpdated(Date.now())
      } else {
        const errorMessages = Object.values(newErrors).filter(Boolean) as string[]
        const authProblem = errorMessages.some(
          (msg) => msg.includes('인증') || msg.includes('권한')
        )
        setServerStatus(authProblem ? 'auth_error' : 'offline')
      }
    } catch (error) {
      console.error('[useAdminData] 데이터 로드 실패:', error)
      setErrors((prev) => ({
        ...prev,
        global: getErrorMessage(error),
      }))
      setServerStatus('offline')
    } finally {
      setLoading(false)
    }
  }, [usersPage, usersLimit, promptsPage, promptsLimit, recordsLimit])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!autoRefreshMs) return
    const timer = setInterval(() => {
      refresh()
    }, autoRefreshMs)
    return () => clearInterval(timer)
  }, [autoRefreshMs, refresh])

  return {
    generationStats,
    statsOverview,
    visitCount,
    promptRecords,
    users,
    prompts,
    pagination,
    loading,
    serverStatus,
    errors,
    refresh,
    lastUpdated,
  }
}


