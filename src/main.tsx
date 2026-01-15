import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { Analytics } from '@vercel/analytics/react'
import { initSentry } from './utils/sentry'

// Sentry 초기화 (에러 추적)
initSentry()

// 항상 라이트 모드로 고정
if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('data-theme', 'light')
  document.documentElement.classList.add('light')
  document.documentElement.classList.remove('dark')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <App />
        <SpeedInsights />
        <Analytics />
      </AuthProvider>
    </LanguageProvider>
  </StrictMode>,
)

