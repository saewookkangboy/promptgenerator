import { useState, useEffect } from 'react'
import { getAllLatestGuides } from '../utils/prompt-guide-storage'
import { triggerManualCollection, getCollectionStatus as getScheduleStatus } from '../utils/prompt-guide-scheduler'
import { GuideUpdateResult, ModelName } from '../types/prompt-guide.types'
import { saveGuideCollectionHistory, getGuideCollectionHistories, updateGuideCollectionHistory, GuideCollectionHistory } from '../utils/storage'
import './GuideManager.css'

function GuideManager() {
  const [latestGuides, setLatestGuides] = useState(getAllLatestGuides())
  const [scheduleStatus, setScheduleStatus] = useState(getScheduleStatus())
  const [isCollecting, setIsCollecting] = useState(false)
  const [collectionResults, setCollectionResults] = useState<GuideUpdateResult[]>([])
  const [collectionHistories, setCollectionHistories] = useState<GuideCollectionHistory[]>([])
  const [showHistory, setShowHistory] = useState(false)

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
    setCollectionHistories(getGuideCollectionHistories())
  }

  const handleManualCollection = async () => {
    setIsCollecting(true)
    setCollectionResults([])
    
    try {
      const results = await triggerManualCollection()
      setCollectionResults(results)
      loadData()
      
      // 수집 이력 저장
      results.forEach(result => {
        saveGuideCollectionHistory({
          success: result.success,
          modelName: result.modelName,
          guidesAdded: result.guidesAdded,
          guidesUpdated: result.guidesUpdated,
          errors: result.errors,
          appliedToService: result.success && (result.guidesAdded > 0 || result.guidesUpdated > 0), // 성공하고 변경사항이 있으면 적용됨
          collectionType: 'manual',
        })
      })
      
      loadHistories()
    } catch (error: any) {
      console.error('수집 실패:', error)
      // 에러 메시지를 결과에 추가
      const errorResult: GuideUpdateResult = {
        success: false,
        modelName: 'all' as ModelName,
        guidesAdded: 0,
        guidesUpdated: 0,
        errors: [
          error.message || '수집 중 오류가 발생했습니다',
          '서버가 실행 중인지 확인해주세요 (npm run server 또는 npm run server:dev)',
        ],
      }
      setCollectionResults([errorResult])
      
      // 실패 이력도 저장
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
    } finally {
      setIsCollecting(false)
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

