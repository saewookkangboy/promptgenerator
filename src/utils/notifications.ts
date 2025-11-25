// 알림 유틸리티 (향후 토스트 알림으로 확장 가능)

export function showSuccess(message: string) {
  // 현재는 alert 사용, 향후 토스트 알림으로 교체 가능
  // eslint-disable-next-line no-alert
  alert(`✅ ${message}`)
}

export function showError(message: string) {
  // eslint-disable-next-line no-alert
  alert(`❌ ${message}`)
}

export function showInfo(message: string) {
  // eslint-disable-next-line no-alert
  alert(`ℹ️ ${message}`)
}

// 통합 함수
export function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
  if (type === 'success') {
    showSuccess(message)
  } else if (type === 'error') {
    showError(message)
  } else {
    showInfo(message)
  }
}

