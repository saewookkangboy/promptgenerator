// 프롬프트 댓글 컴포넌트
import { useState, useEffect } from 'react'
import { commentAPI } from '../utils/api'
import { showNotification } from '../utils/notifications'
import './PromptComments.css'

interface Comment {
  id: string
  userId: string
  userName?: string
  userEmail?: string
  content: string
  parentCommentId?: string
  createdAt: string
  updatedAt: string
  replies?: Comment[]
}

interface PromptCommentsProps {
  promptId: string
  onCommentCountChange?: (count: number) => void
}

function PromptComments({ promptId, onCommentCountChange }: PromptCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadComments()
  }, [promptId])

  const loadComments = async () => {
    try {
      // TODO: commentAPI.list 구현 필요
      // const data = await commentAPI.list(promptId)
      // const flatComments = data.comments || []
      // const nestedComments = buildCommentTree(flatComments)
      // setComments(nestedComments)
      // onCommentCountChange?.(nestedComments.length)
    } catch (error: any) {
      console.error('댓글 로드 실패:', error)
    }
  }

  const buildCommentTree = (flatComments: Comment[]): Comment[] => {
    const commentMap = new Map<string, Comment>()
    const rootComments: Comment[] = []

    flatComments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] })
    })

    flatComments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id)!
      if (comment.parentCommentId) {
        const parent = commentMap.get(comment.parentCommentId)
        if (parent) {
          parent.replies = parent.replies || []
          parent.replies.push(commentWithReplies)
        }
      } else {
        rootComments.push(commentWithReplies)
      }
    })

    return rootComments
  }

  const handleSubmitComment = async () => {
    if (!newComment.trim()) {
      showNotification('댓글을 입력해주세요', 'error')
      return
    }

    try {
      setIsLoading(true)
      // TODO: commentAPI.create 구현 필요
      // await commentAPI.create(promptId, {
      //   content: newComment,
      // })
      setNewComment('')
      showNotification('댓글이 등록되었습니다', 'success')
      loadComments()
    } catch (error: any) {
      showNotification(error.message || '댓글 등록에 실패했습니다', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!replyContent.trim()) {
      showNotification('답글을 입력해주세요', 'error')
      return
    }

    try {
      setIsLoading(true)
      // TODO: commentAPI.createReply 구현 필요
      // await commentAPI.createReply(promptId, parentCommentId, {
      //   content: replyContent,
      // })
      setReplyContent('')
      setReplyingTo(null)
      showNotification('답글이 등록되었습니다', 'success')
      loadComments()
    } catch (error: any) {
      showNotification(error.message || '답글 등록에 실패했습니다', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '방금 전'
    if (minutes < 60) return `${minutes}분 전`
    if (hours < 24) return `${hours}시간 전`
    if (days < 7) return `${days}일 전`
    return date.toLocaleDateString('ko-KR')
  }

  return (
    <div className="prompt-comments">
      <h3 className="comments-title">댓글</h3>

      <div className="comment-form">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="댓글을 입력하세요..."
          rows={3}
        />
        <button
          onClick={handleSubmitComment}
          disabled={isLoading || !newComment.trim()}
          className="submit-comment-button"
        >
          등록
        </button>
      </div>

      <div className="comments-list">
        {comments.length === 0 ? (
          <p className="no-comments">아직 댓글이 없습니다</p>
        ) : (
          comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              replyingTo={replyingTo}
              replyContent={replyContent}
              onReplyChange={setReplyContent}
              onStartReply={() => setReplyingTo(comment.id)}
              onCancelReply={() => {
                setReplyingTo(null)
                setReplyContent('')
              }}
              onSubmitReply={() => handleSubmitReply(comment.id)}
              formatDate={formatDate}
            />
          ))
        )}
      </div>
    </div>
  )
}

interface CommentItemProps {
  comment: Comment
  replyingTo: string | null
  replyContent: string
  onReplyChange: (content: string) => void
  onStartReply: () => void
  onCancelReply: () => void
  onSubmitReply: () => void
  formatDate: (date: string) => string
}

function CommentItem({
  comment,
  replyingTo,
  replyContent,
  onReplyChange,
  onStartReply,
  onCancelReply,
  onSubmitReply,
  formatDate,
}: CommentItemProps) {
  return (
    <div className="comment-item">
      <div className="comment-header">
        <span className="comment-author">{comment.userName || comment.userEmail || '익명'}</span>
        <span className="comment-date">{formatDate(comment.createdAt)}</span>
      </div>
      <div className="comment-content">{comment.content}</div>
      <button className="reply-button" onClick={onStartReply}>
        답글
      </button>

      {replyingTo === comment.id && (
        <div className="reply-form">
          <textarea
            value={replyContent}
            onChange={(e) => onReplyChange(e.target.value)}
            placeholder="답글을 입력하세요..."
            rows={2}
          />
          <div className="reply-actions">
            <button onClick={onCancelReply}>취소</button>
            <button onClick={onSubmitReply} disabled={!replyContent.trim()}>
              등록
            </button>
          </div>
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="comment-replies">
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              replyingTo={replyingTo}
              replyContent={replyContent}
              onReplyChange={onReplyChange}
              onStartReply={onStartReply}
              onCancelReply={onCancelReply}
              onSubmitReply={onSubmitReply}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default PromptComments
