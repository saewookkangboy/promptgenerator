import './LoadingSpinner.css'

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  message?: string
}

function LoadingSpinner({ size = 'medium', message }: LoadingSpinnerProps) {
  return (
    <div className="loading-container">
      <div className={`spinner spinner-${size}`} aria-label="로딩 중">
        <div className="spinner-inner"></div>
      </div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  )
}

export default LoadingSpinner

