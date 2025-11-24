import './ErrorMessage.css'

interface ErrorMessageProps {
  message: string
  onDismiss?: () => void
}

function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  return (
    <div className="error-message" role="alert">
      <div className="error-content">
        <span className="error-icon">⚠</span>
        <span className="error-text">{message}</span>
      </div>
      {onDismiss && (
        <button
          className="error-dismiss"
          onClick={onDismiss}
          aria-label="오류 메시지 닫기"
        >
          ×
        </button>
      )}
    </div>
  )
}

export default ErrorMessage

