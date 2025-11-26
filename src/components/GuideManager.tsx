import { useState, useEffect, useCallback } from 'react'
import {
  GuideUpdateResult,
  ModelName,
  PromptGuide,
  GuideHistoryEntry,
} from '../types/prompt-guide.types'
import { guideAPI, API_BASE_URL } from '../utils/api'
import { upsertGuide } from '../utils/prompt-guide-storage'
import './GuideManager.css'

interface CollectionProgress {
  total: number
  completed: number
  current: string | null
  percentage: number
}

const toTimestamp = (value?: string | number): number => {
  if (!value && value !== 0) return Date.now()
  if (typeof value === 'number') return value
  return Number(new Date(value).getTime())
}

const normalizeGuide = (guide: any): PromptGuide => {
  const collectedAt =
    guide?.metadata?.collectedAt ??
    toTimestamp(guide?.updatedAt) ??
    Date.now()

  return {
    ...(guide as PromptGuide),
    category: (guide?.category || 'llm').toLowerCase() as any,
    version: guide?.version ?? '1.0.0',
    lastUpdated: collectedAt,
    source: guide?.sourcePrimary || guide?.source || '',
    metadata: {
      ...guide?.metadata,
      collectedAt,
      collectedBy: guide?.metadata?.collectedBy || 'scraper',
      confidence: guide?.metadata?.confidence ?? guide?.confidence ?? 0.5,
    },
  }
}

function GuideManager() {
  const [latestGuides, setLatestGuides] = useState<Map<ModelName, PromptGuide>>(new Map())
  const [scheduleStatus, setScheduleStatus] = useState({
    nextCollection: 0,
    daysUntilNext: 0,
    isOverdue: false,
  })
  const [isCollecting, setIsCollecting] = useState(false)
  const [collectionResults, setCollectionResults] = useState<GuideUpdateResult[]>([])
  const [collectionHistories, setCollectionHistories] = useState<GuideHistoryEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [, setCurrentJobId] = useState<string | null>(null)
  const [collectionProgress, setCollectionProgress] = useState<CollectionProgress | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)

  const applyRealtimeGuides = useCallback((results: any[] | null | undefined) => {
    if (!Array.isArray(results) || results.length === 0) return
    setLatestGuides((prev) => {
      const updated = new Map(prev)
      results.forEach((result) => {
        if (result?.success && result?.guide && result?.modelName) {
          const normalized = normalizeGuide(result.guide)
          const modelName = result.modelName as ModelName
          updated.set(modelName, normalized)
          try {
            upsertGuide(normalized)
          } catch (error) {
            console.warn('[GuideManager] 로컬 가이드 저장 실패:', error)
          }
        }
      })
      return updated
    })
  }, [])

  const loadLatestGuides = useCallback(async () => {
    try {
      const response = await guideAPI.getLatest()
      const map = new Map<ModelName, PromptGuide>()
      response.guides.forEach((guide: PromptGuide) => {
        const normalized = normalizeGuide(guide)
        map.set(normalized.modelName as ModelName, normalized)
        try {
          upsertGuide(normalized)
        } catch (error) {
          console.warn('[GuideManager] 로컬 캐시 업데이트 실패:', error)
        }
      })
      setLatestGuides(map)
    } catch (error) {
      console.error('최신 가이드 조회 실패:', error)
    }
  }, [])

  const loadHistories = useCallback(async () => {
    try {
      const response = await guideAPI.getHistory({ limit: 60 })
      setCollectionHistories(response.history || [])
    } catch (error) {
      console.error('가이드 히스토리 조회 실패:', error)
    }
  }, [])

  const loadStatus = useCallback(async () => {
    try {
      const status = await guideAPI.getStatus()
      setScheduleStatus(status)
      setStatusError(null)
    } catch (error: any) {
      setStatusError(error.message || '스케줄 상태를 불러오지 못했습니다.')
    }
  }, [])

  const loadAllData = useCallback(() => {
    loadLatestGuides()
    loadHistories()
    loadStatus()
  }, [loadLatestGuides, loadHistories, loadStatus])

  useEffect(() => {
    loadAllData()
    const interval = setInterval(() => {
      loadLatestGuides()
      loadHistories()
    }, 60000)
    return () => clearInterval(interval)
  }, [loadAllData, loadLatestGuides, loadHistories])

  const persistResults = (resultsArray: any[]) => {
    if (!Array.isArray(resultsArray)) return []
    const mapped: GuideUpdateResult[] = resultsArray.map((r: any) => ({
      success: !!r?.success,
      modelName: r?.modelName as ModelName,
      guidesAdded: r?.guide ? 1 : 0,
      guidesUpdated: 0,
      errors: r?.error ? [r.error] : [],
    }))
    setCollectionResults(mapped)
    return mapped
  }

  const finalizeJob = (status: string, jobResults: any) => {
    try {
      if (status === 'completed' && jobResults) {
        let resultsArray: any[] = []
        const primary = jobResults?.results ?? jobResults
        if (Array.isArray(primary)) {
          resultsArray = primary
        } else if (Array.isArray(primary?.results)) {
          resultsArray = primary.results
        }

        if (Array.isArray(resultsArray) && resultsArray.length > 0) {
          persistResults(resultsArray)
          loadAllData()
        } else {
          setCollectionResults([
            {
              success: false,
              modelName: 'all' as ModelName,
              guidesAdded: 0,
              guidesUpdated: 0,
              errors: ['수집이 완료되었지만 결과를 받지 못했습니다. 서버 로그를 확인하세요.'],
            },
          ])
        }
      } else if (status === 'failed') {
        setCollectionResults([
          {
            success: false,
            modelName: 'all' as ModelName,
            guidesAdded: 0,
            guidesUpdated: 0,
            errors: [jobResults?.error || '수집 중 오류가 발생했습니다'],
          },
        ])
      }
    } finally {
      setIsCollecting(false)
      setCurrentJobId(null)
      setCollectionProgress(null)
    }
  }

  const handleManualCollection = useCallback(async () => {
    setIsCollecting(true)
    setCollectionResults([])
    setCollectionProgress(null)
    let pollTimer: ReturnType<typeof setInterval> | null = null
    
    try {
      let response: Response
      try {
        response = await fetch(`${API_BASE_URL}/api/guides/collect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
      } catch (fetchError: any) {
        throw new Error(
          fetchError.message?.includes('Failed to fetch') || fetchError.message?.includes('NetworkError')
            ? `서버에 연결할 수 없습니다. API 서버(${API_BASE_URL})가 실행 중인지 확인해주세요.`
            : `네트워크 오류: ${fetchError.message}`,
        )
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
        throw new Error(errorData.error || `수집 작업 시작 실패 (${response.status})`)
      }
      
      const data = await response.json()
      
      if (!data.jobId) {
        throw new Error('작업 ID를 받지 못했습니다')
      }
      
      const jobId = data.jobId
      setCurrentJobId(jobId)
      const jobStatusUrl = `${API_BASE_URL}/api/guides/jobs/${jobId}`
      
      let eventSource: EventSource | null = null
      const stopPolling = () => {
        if (pollTimer) {
          clearInterval(pollTimer)
          pollTimer = null
        }
      }

      pollTimer = setInterval(async () => {
        try {
          const res = await fetch(jobStatusUrl)
          if (!res.ok) return
          const jobData = await res.json()
          const job = jobData.job
          if (job?.status === 'completed' || job?.status === 'failed') {
            stopPolling()
            applyRealtimeGuides(job.results?.results ?? job.results)
            finalizeJob(job.status, job.results)
          }
        } catch (pollErr) {
          console.warn('[GuideManager] 폴링 실패:', pollErr)
        }
      }, 2000)
      
      try {
        eventSource = new EventSource(`${API_BASE_URL}/api/guides/jobs/${jobId}/progress`)
      } catch (sseError: any) {
        throw new Error(`진행 상황 스트림 연결 실패: ${sseError.message}`)
      }
      
      eventSource.onmessage = (event) => {
        try {
          const progress = JSON.parse(event.data)
          
          if (progress.error) {
            eventSource?.close()
            throw new Error(progress.error)
          }
          
          if (progress.progress) {
            const percentage = progress.progress.total > 0
              ? Math.round((progress.progress.completed / progress.progress.total) * 100)
              : 0
            
            setCollectionProgress({
              total: progress.progress.total,
              completed: progress.progress.completed,
              current: progress.progress.current,
              percentage,
            })

            applyRealtimeGuides(progress.progress.results)
          }
          
          if (progress.status === 'completed' || progress.status === 'failed') {
            eventSource?.close()
            stopPolling()
            applyRealtimeGuides(progress.results?.results ?? progress.results)
            finalizeJob(progress.status, progress.results)
          }
        } catch (parseError) {
          console.error('진행 상황 파싱 오류:', parseError)
        }
      }
      
      eventSource.onerror = (error) => {
        console.error('[GuideManager] EventSource 오류:', error)
        eventSource?.close()
        stopPolling()
        
        fetch(jobStatusUrl)
          .then(res => res.json())
          .then(jobData => {
            if (jobData.job) {
              const job = jobData.job
              if (job.status === 'completed' || job.status === 'failed') {
                applyRealtimeGuides(job.results?.results ?? job.results)
                finalizeJob(job.status, job.results)
              }
            }
          })
          .catch((err) => {
            console.error('[GuideManager] 작업 상태 확인 실패:', err)
            stopPolling()
            setIsCollecting(false)
            setCurrentJobId(null)
            setCollectionProgress(null)
          })
      }
    } catch (error: any) {
      console.error('수집 실패:', error)
      const errorMessage = error.message || '수집 중 오류가 발생했습니다'
      
      setCollectionResults([
        {
          success: false,
          modelName: 'all' as ModelName,
          guidesAdded: 0,
          guidesUpdated: 0,
          errors: [errorMessage],
        },
      ])
      setIsCollecting(false)
      setCurrentJobId(null)
      setCollectionProgress(null)
    }
  }, [applyRealtimeGuides, loadAllData])

  const formatDate = (timestamp?: number | string | null) => {
    if (!timestamp && timestamp !== 0) return '-'
    const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp)
    return date.toLocaleString('ko-KR')
  }

  return (
    <div className="guide-manager">
      <div className="guide-manager-header">
        <h2>프롬프트 가이드 관리</h2>
        <div className="schedule-status">
          <div className="status-item">
            <span className="status-label">다음 수집 일정:</span>
            <span className="status-value">
              {scheduleStatus.nextCollection > 0
                ? formatDate(scheduleStatus.nextCollection)
                : '미설정'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">남은 일수:</span>
            <span className="status-value">
              {scheduleStatus.daysUntilNext > 0
                ? `${scheduleStatus.daysUntilNext}일`
                : scheduleStatus.isOverdue
                  ? '지연됨'
                  : '-'}
            </span>
          </div>
        </div>
      </div>

      {statusError && (
        <div className="admin-warning-card" style={{ marginBottom: '16px' }}>
          {statusError}
        </div>
      )}

      <div className="guide-manager-actions">
        <button
          onClick={handleManualCollection}
          disabled={isCollecting}
          className="collect-button"
        >
          {isCollecting ? '수집 중...' : '수동 수집 실행'}
        </button>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="history-button"
        >
          {showHistory ? '이력 숨기기' : '수집 이력 보기'}
        </button>
      </div>

      {collectionProgress && (
        <div className="collection-progress">
          <div className="progress-header">
            <span>수집 진행 중...</span>
            <span>
              {collectionProgress.completed}/{collectionProgress.total} (
              {collectionProgress.percentage}%)
            </span>
          </div>
          <div className="progress-bar-container">
            <div
              className="progress-bar"
              style={{ width: `${collectionProgress.percentage}%` }}
            />
          </div>
          {collectionProgress.current && (
            <div className="progress-current">
              현재 수집 중: <strong>{collectionProgress.current}</strong>
            </div>
          )}
        </div>
      )}

      {collectionResults.length > 0 && (
        <div className="collection-results">
          <h3>수집 결과</h3>
          {collectionResults.map((result, index) => (
            <div
              key={index}
              className={`result-item ${result.success ? 'success' : 'error'}`}
            >
              <div className="result-header">
                <strong>{result.modelName}</strong>
                <span className={`result-status ${result.success ? 'success' : 'error'}`}>
                  {result.success ? '성공' : '실패'}
                </span>
              </div>
              <div className="result-details">
                <span>추가: {result.guidesAdded}</span>
                <span>업데이트: {result.guidesUpdated}</span>
              </div>
              {result.errors && result.errors.length > 0 && (
                <div className="result-errors">
                  {result.errors.map((error, i) => (
                    <div key={i} className="error-message">
                      {error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showHistory && (
        <div className="collection-history">
          <h3>수집 이력 ({collectionHistories.length}건)</h3>
          {collectionHistories.length === 0 ? (
            <p className="no-history">수집 이력이 없습니다.</p>
          ) : (
            <div className="history-list">
              {collectionHistories.map((history) => (
                <div
                  key={history.id}
                  className={`history-item ${history.success ? 'success' : 'error'}`}
                >
                  <div className="history-header">
                    <div className="history-info">
                      <strong>{history.modelName}</strong>
                      <span className={`history-status ${history.success ? 'success' : 'error'}`}>
                        {history.success ? '성공' : '실패'}
                      </span>
                      {history.job?.triggerType && (
                        <span className="history-type">
                          {history.job.triggerType === 'auto' ? '자동' : '수동'}
                        </span>
                      )}
                    </div>
                    <div className="history-date">
                      {new Date(history.completedAt).toLocaleString('ko-KR')}
                    </div>
                  </div>
                  <div className="history-details">
                    {history.guide ? (
                      <>
                        <span>버전: v{history.guide.version}</span>
                        <span>
                          신뢰도:{' '}
                          {Math.round(
                            (history.guide.confidence ?? history.guide.metadata?.confidence ?? 0.5) *
                              100,
                          )}
                          %
                        </span>
                      </>
                    ) : (
                      <span>가이드 없음</span>
                    )}
                  </div>
                  {history.errorMessage && (
                    <div className="history-errors">
                      <div className="error-message">{history.errorMessage}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="guides-list">
        <h3>최신 가이드 ({latestGuides.size}개 모델)</h3>
        <div className="guides-grid">
          {Array.from(latestGuides.entries()).map(([modelName, guide]) => (
            <div key={`${guide.id}-${modelName}`} className="guide-card">
              <div className="guide-header">
                <h4>{modelName}</h4>
                <span className="guide-version">v{guide.version}</span>
              </div>
              <div className="guide-meta">
                <div className="meta-item">
                  <span className="meta-label">업데이트:</span>
                  <span className="meta-value">
                    {guide.lastUpdated ? formatDate(guide.lastUpdated) : '-'}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">신뢰도:</span>
                  <span className="meta-value">
                    {((guide.metadata.confidence ?? guide.confidence ?? 0.5) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">출처:</span>
                  <span className="meta-value">
                    {guide.metadata.collectedBy === 'manual' ? '수동' : '자동'}
                  </span>
                </div>
              </div>
              {guide.content.bestPractices && guide.content.bestPractices.length > 0 && (
                <div className="guide-content">
                  <strong>모범 사례:</strong>
                  <ul>
                    {guide.content.bestPractices.slice(0, 3).map((practice, i) => (
                      <li key={i}>{practice}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default GuideManager

