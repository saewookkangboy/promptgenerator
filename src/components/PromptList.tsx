// 사용자별 프롬프트 목록 컴포넌트
import { useState, useEffect, useCallback } from 'react'
import { promptAPI } from '../utils/api'
import { showNotification } from '../utils/notifications'
import LoadingSpinner from './LoadingSpinner'
import ErrorMessage from './ErrorMessage'
import PromptVersions from './PromptVersions'
import './PromptList.css'

interface Prompt {
  id: string
  title: string
  content: string
  category: string
  model?: string
  createdAt: string
  updatedAt: string
  isFavorite?: boolean
}

function PromptList() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'ENGINEERING'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null)
  const [showVersions, setShowVersions] = useState(false)
  const [versionsPromptId, setVersionsPromptId] = useState<string | null>(null)

  const loadPrompts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // 로그인 없이도 사용 가능하도록 API 호출 시도
      try {
        const response = await promptAPI.list({
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          search: searchQuery || undefined,
          page,
          limit: 20,
        })

        setPrompts(response.prompts || [])
        setTotalPages(response.pagination?.totalPages || 1)
      } catch (apiError) {
        // API 서버가 없거나 인증이 필요한 경우 빈 배열로 처리
        setPrompts([])
        setTotalPages(1)
      }
    } catch (err: any) {
      console.error('프롬프트 로드 실패:', err)
      // API 서버가 없으면 빈 배열로 처리
      if (err.message && err.message.includes('서버에 연결할 수 없습니다')) {
        setPrompts([])
        setError('API 서버에 연결할 수 없습니다. 프롬프트를 생성하면 여기에 표시됩니다.')
      } else {
        setError(err.message || '프롬프트를 불러오는데 실패했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, searchQuery, page])

  useEffect(() => {
    loadPrompts()
  }, [loadPrompts])

  const handleDelete = async (id: string) => {
    if (!confirm('이 프롬프트를 삭제하시겠습니까?')) {
      return
    }

    try {
      await promptAPI.delete(id)
      showNotification('프롬프트가 삭제되었습니다.', 'success')
      loadPrompts()
    } catch (err: any) {
      showNotification(err.message || '삭제에 실패했습니다.', 'error')
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

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      TEXT: '텍스트',
      IMAGE: '이미지',
      VIDEO: '동영상',
      ENGINEERING: '엔지니어링',
    }
    return labels[category] || category
  }

  const filteredPrompts = prompts.filter(prompt => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        prompt.title?.toLowerCase().includes(query) ||
        prompt.content?.toLowerCase().includes(query)
      )
    }
    return true
  })

  return (
    <div className="prompt-list-container">
      <div className="prompt-list-header">
        <h2>내 프롬프트</h2>
        <p className="subtitle">생성한 프롬프트를 관리하고 조회하세요</p>
      </div>

      <div className="prompt-list-filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="프롬프트 검색..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setPage(1)
            }}
            className="search-input"
          />
        </div>

        <div className="category-filters">
          <button
            className={`filter-button ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => {
              setSelectedCategory('all')
              setPage(1)
            }}
          >
            전체
          </button>
          <button
            className={`filter-button ${selectedCategory === 'TEXT' ? 'active' : ''}`}
            onClick={() => {
              setSelectedCategory('TEXT')
              setPage(1)
            }}
          >
            텍스트
          </button>
          <button
            className={`filter-button ${selectedCategory === 'IMAGE' ? 'active' : ''}`}
            onClick={() => {
              setSelectedCategory('IMAGE')
              setPage(1)
            }}
          >
            이미지
          </button>
          <button
            className={`filter-button ${selectedCategory === 'VIDEO' ? 'active' : ''}`}
            onClick={() => {
              setSelectedCategory('VIDEO')
              setPage(1)
            }}
          >
            동영상
          </button>
          <button
            className={`filter-button ${selectedCategory === 'ENGINEERING' ? 'active' : ''}`}
            onClick={() => {
              setSelectedCategory('ENGINEERING')
              setPage(1)
            }}
          >
            엔지니어링
          </button>
        </div>
      </div>

      {loading && <LoadingSpinner />}
      {error && !loading && <ErrorMessage message={error} />}

      {!loading && !error && (
        <>
          {filteredPrompts.length === 0 ? (
            <div className="empty-state">
              <p>프롬프트가 없습니다.</p>
              <p className="empty-hint">프롬프트를 생성하면 여기에 표시됩니다.</p>
            </div>
          ) : (
            <div className="prompt-list-grid">
              {filteredPrompts.map((prompt) => (
                <div key={prompt.id} className="prompt-card">
                  <div className="prompt-card-header">
                    <div className="prompt-card-title-section">
                      <h3 className="prompt-title">{prompt.title || '제목 없음'}</h3>
                      <span className={`category-badge category-${prompt.category.toLowerCase()}`}>
                        {getCategoryLabel(prompt.category)}
                      </span>
                    </div>
                    {prompt.model && (
                      <span className="model-badge">{prompt.model}</span>
                    )}
                  </div>

                  <div className="prompt-card-content">
                    <p className="prompt-preview">
                      {prompt.content.length > 150
                        ? `${prompt.content.substring(0, 150)}...`
                        : prompt.content}
                    </p>
                  </div>

                  <div className="prompt-card-footer">
                    <span className="prompt-date">{formatDate(prompt.createdAt)}</span>
                    <div className="prompt-actions">
                      <button
                        className="action-button view-button"
                        onClick={() => setSelectedPrompt(prompt)}
                      >
                        상세보기
                      </button>
                      <button
                        className="action-button versions-button"
                        onClick={() => {
                          setVersionsPromptId(prompt.id)
                          setShowVersions(true)
                        }}
                      >
                        버전
                      </button>
                      <button
                        className="action-button copy-button"
                        onClick={() => handleCopy(prompt.content)}
                      >
                        복사
                      </button>
                      <button
                        className="action-button delete-button"
                        onClick={() => handleDelete(prompt.id)}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="pagination-button"
              >
                이전
              </button>
              <span className="pagination-info">
                페이지 {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="pagination-button"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}

      {selectedPrompt && (
        <div className="prompt-modal-overlay" onClick={() => setSelectedPrompt(null)}>
          <div className="prompt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="prompt-modal-header">
              <h3>{selectedPrompt.title || '제목 없음'}</h3>
              <button
                className="modal-close-button"
                onClick={() => setSelectedPrompt(null)}
              >
                ×
              </button>
            </div>
            <div className="prompt-modal-content">
              <div className="prompt-modal-meta">
                <span className={`category-badge category-${selectedPrompt.category.toLowerCase()}`}>
                  {getCategoryLabel(selectedPrompt.category)}
                </span>
                {selectedPrompt.model && (
                  <span className="model-badge">{selectedPrompt.model}</span>
                )}
                <span className="prompt-date">{formatDate(selectedPrompt.createdAt)}</span>
              </div>
              <div className="prompt-modal-body">
                <pre className="prompt-content-full">{selectedPrompt.content}</pre>
              </div>
            </div>
            <div className="prompt-modal-footer">
              <button
                className="action-button copy-button"
                onClick={() => {
                  handleCopy(selectedPrompt.content)
                  setSelectedPrompt(null)
                }}
              >
                복사
              </button>
              <button
                className="action-button delete-button"
                onClick={() => {
                  handleDelete(selectedPrompt.id)
                  setSelectedPrompt(null)
                }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {showVersions && versionsPromptId && (
        <PromptVersions
          promptId={versionsPromptId}
          onClose={() => {
            setShowVersions(false)
            setVersionsPromptId(null)
          }}
        />
      )}
    </div>
  )
}

export default PromptList

