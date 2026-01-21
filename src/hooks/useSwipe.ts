// 스와이프 제스처 훅
import { useEffect, useRef, useState } from 'react'

interface SwipeHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number // 최소 스와이프 거리 (px)
  velocity?: number // 최소 스와이프 속도 (px/ms)
}

export function useSwipe(handlers: SwipeHandlers) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    velocity = 0.3,
  } = handlers

  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number; time: number } | null>(null)
  const elementRef = useRef<HTMLElement | null>(null)

  const minSwipeDistance = threshold

  const onTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0]
    setTouchEnd(null)
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    })
  }

  const onTouchMove = (e: TouchEvent) => {
    const touch = e.touches[0]
    setTouchEnd({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    })
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distanceX = touchStart.x - touchEnd.x
    const distanceY = touchStart.y - touchEnd.y
    const distance = Math.abs(distanceX) > Math.abs(distanceY) ? distanceX : distanceY
    const time = touchEnd.time - touchStart.time
    const speed = Math.abs(distance) / time

    const isLeftSwipe = distanceX > minSwipeDistance
    const isRightSwipe = distanceX < -minSwipeDistance
    const isUpSwipe = distanceY > minSwipeDistance
    const isDownSwipe = distanceY < -minSwipeDistance

    if (speed > velocity) {
      if (isLeftSwipe && onSwipeLeft) {
        onSwipeLeft()
      }
      if (isRightSwipe && onSwipeRight) {
        onSwipeRight()
      }
      if (isUpSwipe && onSwipeUp) {
        onSwipeUp()
      }
      if (isDownSwipe && onSwipeDown) {
        onSwipeDown()
      }
    }

    setTouchStart(null)
    setTouchEnd(null)
  }

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    element.addEventListener('touchstart', onTouchStart as EventListener)
    element.addEventListener('touchmove', onTouchMove as EventListener)
    element.addEventListener('touchend', onTouchEnd)

    return () => {
      element.removeEventListener('touchstart', onTouchStart as EventListener)
      element.removeEventListener('touchmove', onTouchMove as EventListener)
      element.removeEventListener('touchend', onTouchEnd)
    }
  }, [touchStart, touchEnd, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown])

  return elementRef
}
