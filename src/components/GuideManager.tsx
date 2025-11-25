import { useState, useEffect } from 'react'
import { getAllLatestGuides } from '../utils/prompt-guide-storage'
import { triggerManualCollection, getCollectionStatus as getScheduleStatus } from '../utils/prompt-guide-scheduler'
import { GuideUpdateResult } from '../types/prompt-guide.types'
import './GuideManager.css'

function GuideManager() {
  const [latestGuides, setLatestGuides] = useState(getAllLatestGuides())
  const [scheduleStatus, setScheduleStatus] = useState(getScheduleStatus())
  const [isCollecting, setIsCollecting] = useState(false)
  const [collectionResults, setCollectionResults] = useState<GuideUpdateResult[]>([])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 60000) // 1분마다 새로고침
    return () => clearInterval(interval)
  }, [])

  const loadData = () => {
    setLatestGuides(getAllLatestGuides())
    setScheduleStatus(getScheduleStatus())
  }

  const handleManualCollection = async () => {
    setIsCollecting(true)
    setCollectionResults([])
    
    try {
      const results = await triggerManualCollection()
      setCollectionResults(results)
      loadData()
    } catch (error: any) {
      console.error('수집 실패:', error)
    } finally {
      setIsCollecting(false)
    }
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
      </div>

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

