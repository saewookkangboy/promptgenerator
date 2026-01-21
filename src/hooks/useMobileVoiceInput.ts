// 모바일 음성 입력 훅
import { useState, useCallback } from 'react'

interface VoiceInputOptions {
  onTranscript?: (text: string) => void
  onError?: (error: Error) => void
  language?: string
}

export function useMobileVoiceInput(options: VoiceInputOptions = {}) {
  const { onTranscript, onError, language = 'ko-KR' } = options
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useState<SpeechRecognition | null>(null)

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      const error = new Error('음성 인식이 지원되지 않는 브라우저입니다.')
      onError?.(error)
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = language

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('')
      
      setTranscript(transcript)
      onTranscript?.(transcript)
    }

    recognition.onerror = (event: any) => {
      setIsListening(false)
      const error = new Error(`음성 인식 오류: ${event.error}`)
      onError?.(error)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
    recognitionRef[0] = recognition
  }, [language, onTranscript, onError])

  const stopListening = useCallback(() => {
    if (recognitionRef[0]) {
      recognitionRef[0].stop()
      setIsListening(false)
    }
  }, [])

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
  }
}
