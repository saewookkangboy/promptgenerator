// 모바일 음성 입력 훅
import { useState, useCallback, useRef } from 'react'

interface VoiceInputOptions {
  onTranscript?: (text: string) => void
  onError?: (error: Error) => void
  language?: string
}

// SpeechRecognition 타입 정의
interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
  onend: ((this: SpeechRecognition, ev: Event) => any) | null
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

export function useMobileVoiceInput(options: VoiceInputOptions = {}) {
  const { onTranscript, onError, language = 'ko-KR' } = options
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)

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
      const transcript = Array.from({ length: event.results.length }, (_, i) => event.results.item(i))
        .map(result => result.item(0).transcript)
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
    recognitionRef.current = recognition
  }, [language, onTranscript, onError])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
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
