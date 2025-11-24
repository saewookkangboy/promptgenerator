// 공통 React 훅

import { useState, useCallback, useEffect } from 'react'

/**
 * 복사 기능 훅
 */
export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      const timer = setTimeout(() => setCopied(false), 2000)
      return () => clearTimeout(timer)
    } catch (err) {
      throw new Error('복사에 실패했습니다.')
    }
  }, [])

  return { copied, copy }
}

/**
 * 로컬 스토리지 훅
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      return initialValue
    }
  })

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value
        setStoredValue(valueToStore)
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      } catch (error) {
        console.error('로컬 스토리지 저장 실패:', error)
      }
    },
    [key, storedValue]
  )

  return [storedValue, setValue] as const
}

/**
 * 디바운스 훅
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

