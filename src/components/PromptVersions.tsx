// 프롬프트 버전 관리 컴포넌트
import { useState, useEffect } from 'react'
import { promptAPI } from '../utils/api'
import { showNotification } from '../utils/notifications'
import LoadingSpinner from './LoadingSpinner'
import ErrorMessage from './ErrorMessage'
import './PromptVersions.css'

interface PromptVersion {
  id: string
  versionNumber: number
  content: string
  options: any
  score?: number
  tokenEstimate?: number
  costEstimate?: number
  changeSummary?: string
  createdAt: string
}

interface PromptVersionsProps {
  promptId: string
  onClose: () => void
}

function PromptVersions({ promptId, onClose }: PromptVersionsProps) {
  const [versions, setVersions] = useState<PromptVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<PromptVersion | null>(null)
  const [compareVersions, setCompareVersions] = useState<[string | null, string | null]>([null, null])

  useEffect(() => {
    loadVersions()
  }, [promptId])

  const loadVersions = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await promptAPI.getVersions(promptId)
      setVersions(response || [])
      if (response && response.length > 0) {
        setSelectedVersion(response[0])
      }
    } catch (err: any) {
      console.error('버전 로드 실패:', err)
      if (err.message && err.message.includes('서버에 연결할 수 없습니다')) {
        setError('API 서버에 연결할 수 없습니다.')
      } else {
        setError(err.message || '버전을 불러오는데 실패했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (versionId: string) => {
    if (!confirm('이 버전으로 복원하시겠습니까?')) {
      return
    }

    try {
      const version = versions.find(v => v.id === versionId)
      if (!version) return

      // 현재 프롬프트를 이 버전으로 업데이트
      await promptAPI.update(promptId, {
        content: version.content,
        options: version.options,
      })

      showNotification('프롬프트가 복원되었습니다.', 'success')
      onClose()
    } catch (err: any) {
      showNotification(err.message || '복원에 실패했습니다.', 'error')
    }
  }

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
    showNotification('프롬프트가 클립보드에 복사되었습니다.', 'success')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getVersionDiff = (v1: PromptVersion, v2: PromptVersion) => {
    // 간단한 차이점 표시 (실제로는 더 정교한 diff 알고리즘 사용 가능)
    const lines1 = v1.content.split('\n')
    const lines2 = v2.content.split('\n')
    
    return {
      added: Math.max(0, lines2.length - lines1.length),
      removed: Math.max(0, lines1.length - lines2.length),
      changed: Math.abs(lines1.length - lines2.length),
    }
  }

  return (
    <div className="prompt-versions-overlay" onClick={onClose}>
      <div className="prompt-versions-modal" onClick={(e) => e.stopPropagation()}>
        <div className="prompt-versions-header">
          <h2>프롬프트 버전 관리</h2>
          <button className="modal-close-button" onClick={onClose}>
            ×
          </button>
        </div>

        {loading && <LoadingSpinner />}
        {error && !loading && <ErrorMessage message={error} />}

        {!loading && !error && (
          <div className="prompt-versions-content">
            {versions.length === 0 ? (
              <div className="empty-state">
                <p>버전 기록이 없습니다.</p>
              </div>
            ) : (
              <>
                <div className="versions-list">
                  <h3>버전 목록</h3>
                  <div className="versions-grid">
                    {versions.map((version) => (
                      <div
                        key={version.id}
                        className={`version-card ${selectedVersion?.id === version.id ? 'selected' : ''}`}
                        onClick={() => setSelectedVersion(version)}
                      >
                        <div className="version-header">
                          <span className="version-number">v{version.versionNumber}</span>
                          {version.score && (
                            <span className="version-score">점수: {version.score}</span>
                          )}
                        </div>
                        <div className="version-meta">
                          <span className="version-date">{formatDate(version.createdAt)}</span>
                          {version.tokenEstimate && (
                            <span className="version-tokens">{version.tokenEstimate} tokens</span>
                          )}
                        </div>
                        {version.changeSummary && (
                          <p className="version-summary">{version.changeSummary}</p>
                        )}
                        <div className="version-actions">
                          <button
                            className="action-button restore-button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRestore(version.id)
                            }}
                          >
                            복원
                          </button>
                          <button
                            className="action-button copy-button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopy(version.content)
                            }}
                          >
                            복사
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedVersion && (
                  <div className="version-detail">
                    <h3>버전 v{selectedVersion.versionNumber} 상세</h3>
                    <div className="version-detail-meta">
                      <span>생성일: {formatDate(selectedVersion.createdAt)}</span>
                      {selectedVersion.tokenEstimate && (
                        <span>토큰 수: {selectedVersion.tokenEstimate}</span>
                      )}
                      {selectedVersion.costEstimate && (
                        <span>예상 비용: ${selectedVersion.costEstimate}</span>
                      )}
                    </div>
                    <div className="version-content">
                      <pre className="version-content-text">{selectedVersion.content}</pre>
                    </div>
                    {selectedVersion.options && Object.keys(selectedVersion.options).length > 0 && (
                      <div className="version-options">
                        <h4>옵션</h4>
                        <pre>{JSON.stringify(selectedVersion.options, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}

                {versions.length > 1 && (
                  <div className="version-compare">
                    <h3>버전 비교</h3>
                    <div className="compare-selectors">
                      <select
                        value={compareVersions[0] || ''}
                        onChange={(e) => setCompareVersions([e.target.value || null, compareVersions[1]])}
                        className="compare-select"
                      >
                        <option value="">버전 선택</option>
                        {versions.map((v) => (
                          <option key={v.id} value={v.id}>
                            v{v.versionNumber}
                          </option>
                        ))}
                      </select>
                      <span className="compare-vs">vs</span>
                      <select
                        value={compareVersions[1] || ''}
                        onChange={(e) => setCompareVersions([compareVersions[0], e.target.value || null])}
                        className="compare-select"
                      >
                        <option value="">버전 선택</option>
                        {versions.map((v) => (
                          <option key={v.id} value={v.id}>
                            v{v.versionNumber}
                          </option>
                        ))}
                      </select>
                    </div>
                    {compareVersions[0] && compareVersions[1] && (
                      <div className="compare-result">
                        {(() => {
                          const v1 = versions.find(v => v.id === compareVersions[0])
                          const v2 = versions.find(v => v.id === compareVersions[1])
                          if (!v1 || !v2) return null
                          const diff = getVersionDiff(v1, v2)
                          return (
                            <div className="diff-summary">
                              <p>차이점 요약:</p>
                              <ul>
                                <li>추가된 줄: {diff.added}</li>
                                <li>제거된 줄: {diff.removed}</li>
                                <li>변경된 줄: {diff.changed}</li>
                              </ul>
                              <div className="diff-content">
                                <div className="diff-side">
                                  <h4>v{v1.versionNumber}</h4>
                                  <pre>{v1.content}</pre>
                                </div>
                                <div className="diff-side">
                                  <h4>v{v2.versionNumber}</h4>
                                  <pre>{v2.content}</pre>
                                </div>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default PromptVersions

