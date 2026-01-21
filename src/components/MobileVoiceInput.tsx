// 모바일 음성 입력 컴포넌트
import { useMobileVoiceInput } from '../hooks/useMobileVoiceInput'
import './MobileVoiceInput.css'

interface MobileVoiceInputProps {
  onTranscript: (text: string) => void
  disabled?: boolean
}

function MobileVoiceInput({ onTranscript, disabled }: MobileVoiceInputProps) {
  const { isListening, startListening, stopListening } = useMobileVoiceInput({
    onTranscript,
    onError: (error) => {
      console.error('음성 인식 오류:', error)
    },
  })

  // 모바일에서만 표시
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

  if (!isMobile) {
    return null
  }

  return (
    <button
      type="button"
      className={`mobile-voice-input-button ${isListening ? 'listening' : ''}`}
      onClick={isListening ? stopListening : startListening}
      disabled={disabled}
      aria-label={isListening ? '음성 입력 중지' : '음성 입력 시작'}
    >
      {isListening ? (
        <>
          <span className="voice-icon listening">🎤</span>
          <span>입력 중...</span>
        </>
      ) : (
        <>
          <span className="voice-icon">🎤</span>
          <span>음성 입력</span>
        </>
      )}
    </button>
  )
}

export default MobileVoiceInput
