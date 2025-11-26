import './LoadingSpinner.css'

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  message?: string
}

function LoadingSpinner({ size = 'medium', message }: LoadingSpinnerProps) {
  return (
    <div className="loading-container" role="status" aria-live="polite" aria-busy="true">
      <div className={`spinner spinner-${size}`} aria-label="로딩 중" aria-hidden="false">
        <div className="spinner-inner"></div>
      </div>
      {message && <p className="loading-message" aria-live="polite">{message}</p>}
    </div>
  )
}

export default LoadingSpinner

