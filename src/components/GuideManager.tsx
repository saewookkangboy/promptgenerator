import { useState, useEffect, useCallback } from 'react'
import { getAllLatestGuides, upsertGuide } from '../utils/prompt-guide-storage'
import { getCollectionStatus as getScheduleStatus } from '../utils/prompt-guide-scheduler'
import { GuideUpdateResult, ModelName } from '../types/prompt-guide.types'
import { saveGuideCollectionHistory, getGuideCollectionHistories, updateGuideCollectionHistory, GuideCollectionHistory } from '../utils/storage'
import { API_BASE_URL } from '../utils/api'
import './GuideManager.css'

function GuideManager() {
  const [latestGuides, setLatestGuides] = useState(getAllLatestGuides())
  const [scheduleStatus, setScheduleStatus] = useState(getScheduleStatus())
  const [isCollecting, setIsCollecting] = useState(false)
  const [collectionResults, setCollectionResults] = useState<GuideUpdateResult[]>([])
  const [collectionHistories, setCollectionHistories] = useState<GuideCollectionHistory[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [, setCurrentJobId] = useState<string | null>(null) // 작업 취소 기능을 위해 추후 사용 예정
  const [collectionProgress, setCollectionProgress] = useState<{
    total: number
    completed: number
    current: string | null
    percentage: number
  } | null>(null)
  const [, setRealtimeApplied] = useState<Set<ModelName>>(new Set())

  useEffect(() => {
    loadData()
    loadHistories()
    const interval = setInterval(() => {
      loadData()
      loadHistories()
    }, 60000) // 1분마다 새로고침
    return () => clearInterval(interval)
  }, [])

  const loadData = () => {
    setLatestGuides(getAllLatestGuides())
    setScheduleStatus(getScheduleStatus())
  }

  const loadHistories = () => {
    const histories = getGuideCollectionHistories()
    // 최신 순으로 정렬 (timestamp 내림차순)
    const sortedHistories = [...histories].sort((a, b) => b.timestamp - a.timestamp)
    setCollectionHistories(sortedHistories)
    setLatestGuides(getAllLatestGuides())
  }

  const applyRealtimeGuides = useCallback((results: any[] | null | undefined) => {
    if (!Array.isArray(results) || results.length === 0) return

    const newGuides: Array<{ modelName: ModelName; guide: any }> = []

    setRealtimeApplied((prev) => {
      const next = new Set(prev)
      results.forEach((result) => {
        if (result?.success && result?.guide && result?.modelName) {
          const modelName = result.modelName as ModelName
          if (!next.has(modelName)) {
            next.add(modelName)
            newGuides.push({ modelName, guide: result.guide })
          }
        }
      })
      return next
    })

    if (newGuides.length === 0) return

    newGuides.forEach(({ guide }) => {
      try {
        upsertGuide(guide)
      } catch (error) {
        console.error('[GuideManager] 실시간 가이드 저장 실패:', error)
      }
    })

    setLatestGuides((prev) => {
      const updated = new Map(prev)
      newGuides.forEach(({ modelName, guide }) => {
        updated.set(modelName, guide)
      })
      return updated
    })
  }, [])

  const persistResults = (resultsArray: any[]) => {
    if (!Array.isArray(resultsArray)) {
      return []
    }

    // 수집된 가이드 로컬 저장 + 결과 객체 변환
    let guidesSaved = 0
    const mapped: GuideUpdateResult[] = resultsArray.map((r: any) => {
      if (r?.success && r?.guide) {
        try {
          upsertGuide(r.guide)
          guidesSaved++
          console.log(`[GuideManager] 가이드 저장됨: ${r.modelName}`)
        } catch (error) {
          console.error(`[GuideManager] 가이드 저장 실패 (${r.modelName}):`, error)
        }
      }

      return {
        success: !!r?.success,
        modelName: r?.modelName as ModelName,
        guidesAdded: r?.guide ? 1 : 0,
        guidesUpdated: 0,
        errors: r?.error ? [r.error] : [],
      }
    })

    console.log(`[GuideManager] 총 ${guidesSaved}개 가이드 저장 완료`)
    setCollectionResults(mapped)
    loadData()

    mapped.forEach((result) => {
      saveGuideCollectionHistory({
        success: result.success,
        modelName: result.modelName,
        guidesAdded: result.guidesAdded,
        guidesUpdated: result.guidesUpdated,
        errors: result.errors,
        appliedToService: result.success && (result.guidesAdded > 0 || result.guidesUpdated > 0),
        collectionType: 'manual',
      })
    })

    loadHistories()
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
        console.log('[GuideManager] 결과 배열(정상 흐름):', Array.isArray(resultsArray) ? resultsArray.length : 0, '개')
        if (Array.isArray(resultsArray) && resultsArray.length > 0) {
          persistResults(resultsArray)
        } else {
          // 결과가 비어있으면 실패로 기록
          const fallback: GuideUpdateResult = {
            success: false,
            modelName: 'all' as ModelName,
            guidesAdded: 0,
            guidesUpdated: 0,
            errors: ['수집이 완료되었지만 결과를 받지 못했습니다. 서버 로그를 확인하세요.'],
          }
          setCollectionResults([fallback])
        }
      } else if (status === 'failed') {
        const errorResult: GuideUpdateResult = {
          success: false,
          modelName: 'all' as ModelName,
          guidesAdded: 0,
          guidesUpdated: 0,
          errors: [jobResults?.error || '수집 중 오류가 발생했습니다'],
        }
        setCollectionResults([errorResult])
        saveGuideCollectionHistory({
          success: false,
          modelName: 'all',
          guidesAdded: 0,
          guidesUpdated: 0,
          errors: errorResult.errors,
          appliedToService: false,
          collectionType: 'manual',
        })
        loadHistories()
      }
    } finally {
      setIsCollecting(false)
      setCurrentJobId(null)
      setCollectionProgress(null)
      setRealtimeApplied(new Set())
    }
  }

  const handleManualCollection = async () => {
    setIsCollecting(true)
    setCollectionResults([])
    setCollectionProgress(null)
    setRealtimeApplied(new Set())
    let pollTimer: ReturnType<typeof setInterval> | null = null
    
    try {
      // 백그라운드 작업 시작
      let response: Response
      try {
        response = await fetch(`${API_BASE_URL}/api/guides/collect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
      } catch (fetchError: any) {
        // 네트워크 오류 처리
        throw new Error(
          fetchError.message?.includes('Failed to fetch') || fetchError.message?.includes('NetworkError')
            ? `서버에 연결할 수 없습니다. API 서버(${API_BASE_URL})가 실행 중인지 확인해주세요.`
            : `네트워크 오류: ${fetchError.message}`
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
      
      // 실시간 진행 상황 수신 (Server-Sent Events)
      let eventSource: EventSource | null = null
      const stopPolling = () => {
        if (pollTimer) {
          clearInterval(pollTimer)
          pollTimer = null
        }
      }

      // 상태 폴링 (SSE 차단 시 보강)
      pollTimer = setInterval(async () => {
        try {
          const res = await fetch(jobStatusUrl)
          if (!res.ok) return
          const jobData = await res.json()
          const job = jobData.job
          if (job?.status === 'completed' || job?.status === 'failed') {
            console.log('[GuideManager] 폴링으로 완료 상태 확인:', {
              status: job.status,
              hasResults: !!job.results,
            })
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
          console.log('[GuideManager] 진행 상황 업데이트:', {
            status: progress.status,
            hasResults: !!progress.results,
            resultsType: progress.results ? typeof progress.results : 'none',
            resultsKeys: progress.results ? Object.keys(progress.results) : [],
          })
          
          if (progress.error) {
            eventSource?.close()
            throw new Error(progress.error)
          }
          
          // 진행 상황 업데이트
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
          
          // 작업 완료 확인
          if (progress.status === 'completed' || progress.status === 'failed') {
            console.log('[GuideManager] 작업 완료:', {
              status: progress.status,
              hasResults: !!progress.results,
              results: progress.results,
            })
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
        
        // 연결 오류인 경우 작업 상태를 직접 확인
        console.log('[GuideManager] 작업 상태 직접 확인:', jobId)
        fetch(jobStatusUrl)
          .then(res => res.json())
          .then(jobData => {
            console.log('[GuideManager] 작업 상태 응답:', jobData)
            if (jobData.job) {
              const job = jobData.job
              if (job.status === 'completed' || job.status === 'failed') {
                console.log('[GuideManager] 작업 완료 상태 확인:', {
                  status: job.status,
                  hasResults: !!job.results,
                  results: job.results,
                })
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
      
      // 더 명확한 오류 메시지
      let errorMessage = error.message || '수집 중 오류가 발생했습니다'
      
      // 네트워크 오류인 경우 추가 안내
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001'
        errorMessage = `서버에 연결할 수 없습니다. API 서버(${API_BASE_URL})가 실행 중인지 확인해주세요.`
      }
      
      const errorResult: GuideUpdateResult = {
        success: false,
        modelName: 'all' as ModelName,
        guidesAdded: 0,
        guidesUpdated: 0,
        errors: [errorMessage],
      }
      setCollectionResults([errorResult])
      
      saveGuideCollectionHistory({
        success: false,
        modelName: 'all',
        guidesAdded: 0,
        guidesUpdated: 0,
        errors: errorResult.errors,
        appliedToService: false,
        collectionType: 'manual',
      })
      loadHistories()
      setIsCollecting(false)
      setCurrentJobId(null)
      setCollectionProgress(null)
      setRealtimeApplied(new Set())
    }
  }

  const handleToggleApplied = (historyId: string, applied: boolean) => {
    updateGuideCollectionHistory(historyId, { appliedToService: applied })
    loadHistories()
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ko-KR')
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
            <span>{collectionProgress.completed}/{collectionProgress.total} ({collectionProgress.percentage}%)</span>
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
                    <div key={i} className="error-message">{error}</div>
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
                      <span className="history-type">
                        {history.collectionType === 'manual' ? '수동' : '자동'}
                      </span>
                    </div>
                    <div className="history-date">
                      {formatDate(history.timestamp)}
                    </div>
                  </div>
                  <div className="history-details">
                    <span>추가: {history.guidesAdded}</span>
                    <span>업데이트: {history.guidesUpdated}</span>
                    <label className="applied-toggle">
                      <input
                        type="checkbox"
                        checked={history.appliedToService}
                        onChange={(e) => handleToggleApplied(history.id, e.target.checked)}
                      />
                      <span>서비스 적용됨</span>
                    </label>
                  </div>
                  {history.errors && history.errors.length > 0 && (
                    <div className="history-errors">
                      {history.errors.map((error, i) => (
                        <div key={i} className="error-message">{error}</div>
                      ))}
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
            <div key={guide.id} className="guide-card">
              <div className="guide-header">
                <h4>{modelName}</h4>
                <span className="guide-version">v{guide.version}</span>
              </div>
              <div className="guide-meta">
                <div className="meta-item">
                  <span className="meta-label">업데이트:</span>
                  <span className="meta-value">{formatDate(guide.lastUpdated)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">신뢰도:</span>
                  <span className="meta-value">
                    {(guide.metadata.confidence * 100).toFixed(0)}%
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
