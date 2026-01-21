// 향상된 프롬프트 히스토리 관리 컴포넌트
import { useState, useEffect, useMemo, useCallback } from 'react'
import { 
  getPromptRecords, 
  toggleFavorite, 
  isFavorite,
  getAllTags,
  addTagsToPrompt,
  removeTagFromPrompt,
  updatePromptRecord,
  searchPromptRecords,
  PromptRecord
} from '../utils/storage'
import { showNotification } from '../utils/notifications'
import './PromptHistoryManager.css'

interface PromptHistoryManagerProps {
  onSelectPrompt?: (prompt: PromptRecord) => void
  onClose?: () => void
}

function PromptHistoryManager({ onSelectPrompt, onClose }: PromptHistoryManagerProps) {
  const [records, setRecords] = useState<PromptRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'all' | PromptRecord['category']>('all')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<PromptRecord | null>(null)
  const [showTagInput, setShowTagInput] = useState<string | null>(null)
  const [newTag, setNewTag] = useState('')

  const allTags = useMemo(() => getAllTags(), [records])

  const loadRecords = useCallback(() => {
    const allRecords = getPromptRecords()
    setRecords(allRecords)
  }, [])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  const filteredRecords = useMemo(() => {
    return searchPromptRecords(searchQuery, {
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      favoritesOnly,
    })
  }, [searchQuery, selectedCategory, selectedTags, favoritesOnly])

  const handleToggleFavorite = useCallback((promptId: string) => {
    const wasAdded = toggleFavorite(promptId)
    showNotification(
      wasAdded ? '즐겨찾기에 추가되었습니다.' : '즐겨찾기에서 제거되었습니다.',
      'success'
    )
    loadRecords()
  }, [loadRecords])

  const handleAddTag = useCallback((promptId: string, tag: string) => {
    if (!tag.trim()) return
    
    addTagsToPrompt(promptId, [tag.trim()])
    showNotification('태그가 추가되었습니다.', 'success')
    setNewTag('')
    setShowTagInput(null)
    loadRecords()
  }, [loadRecords])

  const handleRemoveTag = useCallback((promptId: string, tag: string) => {
    removeTagFromPrompt(promptId, tag)
    showNotification('태그가 제거되었습니다.', 'success')
    loadRecords()
  }, [loadRecords])

  const handleUpdatePrompt = useCallback((promptId: string, updates: Partial<PromptRecord>) => {
    updatePromptRecord(promptId, updates)
    showNotification('프롬프트가 업데이트되었습니다.', 'success')
    setEditingPrompt(null)
    loadRecords()
  }, [loadRecords])

  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content)
    showNotification('클립보드에 복사되었습니다.', 'success')
  }, [])

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getCategoryLabel = (category: PromptRecord['category']) => {
    const labels: Record<PromptRecord['category'], string> = {
      text: '텍스트',
      image: '이미지',
      video: '동영상',
      engineering: '엔지니어링',
    }
    return labels[category] || category
  }

  return (
    <div className="prompt-history-manager">
      <div className="prompt-history-header">
        <h2>프롬프트 히스토리</h2>
        {onClose && (
          <button className="close-button" onClick={onClose}>×</button>
        )}
      </div>

      <div className="prompt-history-filters">
        <div className="search-section">
          <input
            type="text"
            placeholder="프롬프트 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-section">
          <div className="category-filters">
            <button
              className={`filter-button ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              전체
            </button>
            {(['text', 'image', 'video', 'engineering'] as const).map(cat => (
              <button
                key={cat}
                className={`filter-button ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {getCategoryLabel(cat)}
              </button>
            ))}
          </div>

          <div className="tag-filters">
            {allTags.map(tag => (
              <button
                key={tag}
                className={`tag-filter ${selectedTags.includes(tag) ? 'active' : ''}`}
                onClick={() => {
                  setSelectedTags(prev => 
                    prev.includes(tag) 
                      ? prev.filter(t => t !== tag)
                      : [...prev, tag]
                  )
                }}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="favorites-filter">
            <label>
              <input
                type="checkbox"
                checked={favoritesOnly}
                onChange={(e) => setFavoritesOnly(e.target.checked)}
              />
              즐겨찾기만 보기
            </label>
          </div>
        </div>
      </div>

      <div className="prompt-history-stats">
        <span>총 {filteredRecords.length}개</span>
      </div>

      <div className="prompt-history-list">
        {filteredRecords.length === 0 ? (
          <div className="empty-state">
            <p>프롬프트가 없습니다.</p>
            <p className="empty-hint">프롬프트를 생성하면 여기에 표시됩니다.</p>
          </div>
        ) : (
          filteredRecords.map((record) => (
            <div key={record.id} className="prompt-history-card">
              <div className="prompt-card-header">
                <div className="prompt-title-section">
                  {editingPrompt?.id === record.id ? (
                    <input
                      type="text"
                      value={editingPrompt.title || ''}
                      onChange={(e) => setEditingPrompt({ ...editingPrompt, title: e.target.value })}
                      className="title-input"
                      placeholder="제목 입력..."
                    />
                  ) : (
                    <h3 className="prompt-title">
                      {record.title || `${getCategoryLabel(record.category)} 프롬프트`}
                    </h3>
                  )}
                  <span className={`category-badge category-${record.category}`}>
                    {getCategoryLabel(record.category)}
                  </span>
                </div>
                <div className="prompt-actions">
                  <button
                    className={`action-button favorite-button ${isFavorite(record.id) ? 'active' : ''}`}
                    onClick={() => handleToggleFavorite(record.id)}
                    title={isFavorite(record.id) ? '즐겨찾기 제거' : '즐겨찾기 추가'}
                  >
                    {isFavorite(record.id) ? '★' : '☆'}
                  </button>
                  <button
                    className="action-button edit-button"
                    onClick={() => setEditingPrompt(record)}
                    title="편집"
                  >
                    ✏️
                  </button>
                  <button
                    className="action-button copy-button"
                    onClick={() => handleCopy(record.content || record.metaPrompt || record.userInput)}
                    title="복사"
                  >
                    📋
                  </button>
                  {onSelectPrompt && (
                    <button
                      className="action-button select-button"
                      onClick={() => onSelectPrompt(record)}
                      title="선택"
                    >
                      선택
                    </button>
                  )}
                </div>
              </div>

              <div className="prompt-card-content">
                <p className="prompt-preview">
                  {record.content || record.metaPrompt || record.userInput}
                </p>
              </div>

              <div className="prompt-card-tags">
                {record.tags && record.tags.length > 0 && (
                  <div className="tags-list">
                    {record.tags.map(tag => (
                      <span key={tag} className="tag">
                        {tag}
                        <button
                          className="tag-remove"
                          onClick={() => handleRemoveTag(record.id, tag)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {showTagInput === record.id ? (
                  <div className="tag-input-container">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddTag(record.id, newTag)
                        }
                      }}
                      placeholder="태그 입력..."
                      className="tag-input"
                      autoFocus
                    />
                    <button onClick={() => handleAddTag(record.id, newTag)}>추가</button>
                    <button onClick={() => {
                      setShowTagInput(null)
                      setNewTag('')
                    }}>취소</button>
                  </div>
                ) : (
                  <button
                    className="add-tag-button"
                    onClick={() => setShowTagInput(record.id)}
                  >
                    + 태그 추가
                  </button>
                )}
              </div>

              {editingPrompt?.id === record.id && (
                <div className="prompt-edit-panel">
                  <textarea
                    value={editingPrompt.notes || ''}
                    onChange={(e) => setEditingPrompt({ ...editingPrompt, notes: e.target.value })}
                    placeholder="메모 입력..."
                    className="notes-input"
                  />
                  <div className="edit-actions">
                    <button
                      onClick={() => handleUpdatePrompt(record.id, {
                        title: editingPrompt.title,
                        notes: editingPrompt.notes,
                      })}
                    >
                      저장
                    </button>
                    <button onClick={() => setEditingPrompt(null)}>취소</button>
                  </div>
                </div>
              )}

              <div className="prompt-card-footer">
                <span className="prompt-date">{formatDate(record.timestamp)}</span>
                {record.model && (
                  <span className="model-badge">{record.model}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default PromptHistoryManager
