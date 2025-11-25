// 토스트 알림 유틸리티 (alert 대신 비차단 UI 사용)

type NotificationType = 'success' | 'error' | 'info' | 'warning'

const CONTAINER_ID = 'app-toast-container'

const TYPE_STYLES: Record<NotificationType, { background: string }> = {
  success: { background: '#1f8b4c' },
  error: { background: '#c62828' },
  info: { background: '#1565c0' },
  warning: { background: '#d57c1d' },
}

function ensureContainer(): HTMLDivElement | null {
  if (typeof document === 'undefined') return null

  let container = document.getElementById(CONTAINER_ID) as HTMLDivElement | null
  if (!container) {
    container = document.createElement('div')
    container.id = CONTAINER_ID
    Object.assign(container.style, {
      position: 'fixed',
      top: '16px',
      right: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      zIndex: 9999,
      pointerEvents: 'none',
    })
    document.body.appendChild(container)
  }
  return container
}

function createToast(message: string, type: NotificationType): HTMLDivElement {
  const toast = document.createElement('div')
  toast.textContent = message
  Object.assign(toast.style, {
    minWidth: '240px',
    maxWidth: '360px',
    padding: '12px 16px',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '0.9rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    opacity: '0',
    transform: 'translateY(-8px)',
    transition: 'opacity 0.25s ease, transform 0.25s ease',
    pointerEvents: 'auto',
    background: TYPE_STYLES[type].background,
  })
  return toast
}

export function showNotification(message: string, type: NotificationType = 'info') {
  if (typeof window === 'undefined') {
    if (type === 'error') {
      console.error(message)
    } else {
      console.log(message)
    }
    return
  }

  const container = ensureContainer()
  if (!container) return

  const toast = createToast(message, type)
  container.appendChild(toast)

  requestAnimationFrame(() => {
    toast.style.opacity = '1'
    toast.style.transform = 'translateY(0)'
  })

  const hide = () => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateY(-8px)'
    setTimeout(() => {
      toast.remove()
      if (container.childElementCount === 0) {
        container.remove()
      }
    }, 250)
  }

  setTimeout(hide, 3200)
}

export const showSuccess = (message: string) => showNotification(message, 'success')
export const showError = (message: string) => showNotification(message, 'error')
export const showInfo = (message: string) => showNotification(message, 'info')
export const showWarning = (message: string) => showNotification(message, 'warning')

