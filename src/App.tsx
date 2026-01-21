import { useState, useEffect, lazy, Suspense } from 'react'
import LoadingSpinner from './components/LoadingSpinner'
import LanguageToggle from './components/LanguageToggle'
import Onboarding from './components/Onboarding'
import { getAdminAuth, incrementVisitCount, getUserPreferences } from './utils/storage'
import { initializeScheduler } from './utils/prompt-guide-scheduler'
import { templateAPI } from './utils/api'
import { useLanguage } from './contexts/LanguageContext'
import { useSwipe } from './hooks/useSwipe'
import './App.css'

// 코드 스플리팅: 컴포넌트를 지연 로딩
const PromptGenerator = lazy(() => import('./components/PromptGenerator'))
const ImagePromptGenerator = lazy(() => import('./components/ImagePromptGenerator'))
const VideoPromptGenerator = lazy(() => import('./components/VideoPromptGenerator'))
const EngineeringPromptGenerator = lazy(() => import('./components/EngineeringPromptGenerator'))
const TemplateGallery = lazy(() => import('./components/TemplateGallery'))
const AboutPage = lazy(() => import('./components/AboutPage'))
const AdminLogin = lazy(() => import('./components/AdminLogin'))
const AdminDashboard = lazy(() => import('./components/AdminDashboard'))

type TabType = 'text' | 'image' | 'video' | 'engineering' | 'templates' | 'about'

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('text')
  // 서비스 시작 시 항상 일반 모드로 시작 (Admin 모드는 명시적으로 진입)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    // 방문수 증가
    incrementVisitCount()
    
    // Admin 인증 상태 확인
    const adminAuth = getAdminAuth()
    setIsAdminAuthenticated(adminAuth)
    
    // 온보딩 확인 (첫 방문자)
    const prefs = getUserPreferences()
    const isFirstVisit = !prefs.preferredContentTypes || prefs.preferredContentTypes.length === 0
    if (isFirstVisit) {
      setShowOnboarding(true)
    }
    
    // 프롬프트 가이드 스케줄러 초기화
    initializeScheduler()
    
    // 템플릿 갤러리 데이터 백그라운드 prefetch (캐시 확인 후 필요시만)
    const prefetchTemplates = async () => {
      try {
        const CACHE_KEY = 'template_gallery_cache'
        const CACHE_EXPIRY_MS = 30 * 60 * 1000 // 30분
        
        // 캐시 확인
        const cached = localStorage.getItem(CACHE_KEY)
        if (cached) {
          try {
            const data = JSON.parse(cached)
            const cacheAge = Date.now() - (data.timestamp || 0)
            // 캐시가 신선하면 prefetch 불필요
            if (cacheAge < CACHE_EXPIRY_MS) {
              return
            }
          } catch {
            // 캐시 파싱 실패 시 prefetch 진행
          }
        }
        
        // 캐시가 없거나 오래되었으면 백그라운드에서 prefetch
        const result = await templateAPI.getPublic({ page: 1, limit: 100 })
        if (result?.templates) {
          const cacheData = {
            templates: result.templates,
            timestamp: Date.now(),
          }
          localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
        }
      } catch (error) {
        // prefetch 실패는 무시 (사용자 경험에 영향 없음)
        console.debug('[App] 템플릿 prefetch 실패 (무시됨):', error)
      }
    }
    
    // 지연된 prefetch (메인 스레드 블로킹 방지)
    setTimeout(prefetchTemplates, 1000)
    
    // Chrome 확장 프로그램의 Firebase 오류 무시 (개발 환경에서만)
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      const originalError = console.error
      console.error = (...args: any[]) => {
        // Firebase 관련 오류는 무시
        if (args.some(arg => 
          typeof arg === 'string' && 
          (arg.includes('@firebase/auth') || arg.includes('INTERNAL ASSERTION'))
        )) {
          return
        }
        originalError.apply(console, args)
      }
    }
  }, [])

  // isAdmin 상태 변경 시 인증 상태 확인 및 admin_mode 설정
  useEffect(() => {
    if (isAdmin) {
      // Admin 모드가 활성화되면 인증 상태 확인
      const adminAuth = getAdminAuth()
      console.log('[Admin] 모드 활성화, 인증 상태:', adminAuth)
      setIsAdminAuthenticated(adminAuth)
      
      // Admin 모드임을 localStorage에 저장 (리다이렉트 방지)
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_mode', 'true')
      }
    } else {
      console.log('[Admin] 모드 비활성화')
      setIsAdminAuthenticated(false)
      
      // Admin 모드 해제 시 localStorage에서 제거
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_mode')
      }
    }
  }, [isAdmin])

  // Admin 인증 상태 변경 감지 (다른 탭에서 로그아웃 등)
  useEffect(() => {
    const checkAdminAuth = () => {
      const adminAuth = getAdminAuth()
      if (isAdmin && !adminAuth) {
        // Admin 모드인데 인증이 해제된 경우
        setIsAdminAuthenticated(false)
      } else if (isAdmin && adminAuth) {
        setIsAdminAuthenticated(true)
      }
    }
    
    // 주기적으로 인증 상태 확인 (5초마다)
    const interval = setInterval(checkAdminAuth, 5000)
    
    // storage 이벤트 리스너 (다른 탭에서 변경 감지)
    window.addEventListener('storage', checkAdminAuth)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', checkAdminAuth)
    }
  }, [isAdmin])

  const handleAdminLogin = () => {
    console.log('[Admin] 로그인 성공')
    setIsAdminAuthenticated(true)
    // Admin 인증 상태가 이미 setAdminAuth로 저장되었으므로 추가 작업 불필요
  }

  const handleAdminLogout = () => {
    console.log('[Admin] 로그아웃')
    setIsAdminAuthenticated(false)
    setIsAdmin(false) // 로그아웃 시 메인 페이지로 돌아감
    // clearAdminAuth는 AdminDashboard에서 호출됨
  }

  // Admin 모드 - 별도 페이지로 이동
  if (isAdmin) {
    if (!isAdminAuthenticated) {
      return (
        <div className="app">
          <Suspense fallback={<LoadingSpinner message="로딩 중..." />}>
            <AdminLogin 
              onLogin={handleAdminLogin}
              onBack={() => {
                setIsAdmin(false)
              }}
            />
          </Suspense>
        </div>
      )
    }
    return (
      <div className="app">
        <Suspense fallback={<LoadingSpinner message="로딩 중..." />}>
          <AdminDashboard 
            onLogout={handleAdminLogout}
            onBackToMain={() => {
              setIsAdmin(false)
            }}
          />
        </Suspense>
      </div>
    )
  }

  return (
    <>
      {showOnboarding && (
        <Onboarding
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      )}
      <AppContent 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setIsAdmin={setIsAdmin}
      />
    </>
  )
}

function AppContent({
  activeTab,
  setActiveTab,
  setIsAdmin,
}: {
  activeTab: TabType
  setActiveTab: (tab: TabType) => void
  setIsAdmin: (admin: boolean) => void
}) {
  const { t } = useLanguage()
  
  const tabs: TabType[] = ['text', 'image', 'video', 'engineering', 'templates', 'about']
  const currentIndex = tabs.indexOf(activeTab)

  // 스와이프 제스처로 탭 전환
  const swipeRef = useSwipe({
    onSwipeLeft: () => {
      if (currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1])
      }
    },
    onSwipeRight: () => {
      if (currentIndex > 0) {
        setActiveTab(tabs[currentIndex - 1])
      }
    },
    threshold: 50,
    velocity: 0.3,
  })

  return (
    <div className="app" ref={swipeRef as any}>
      <header className="app-header">
        <div className="app-header-content">
          <div className="app-header-text">
            <h1>{t('app.title')}</h1>
            <p>{t('app.subtitle')}</p>
          </div>
          <div className="header-actions">
            <div className="header-controls">
              <LanguageToggle />
            </div>
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('[Admin] Admin 버튼 클릭, Admin 모드 활성화')
                setIsAdmin(true)
              }}
              className="admin-toggle-button"
              title={t('app.adminTitle')}
            >
              {t('app.admin')}
            </button>
          </div>
        </div>
      </header>
      
      <div className="tabs">
        <button
          className={`tab-button ${activeTab === 'text' ? 'active' : ''}`}
          onClick={() => setActiveTab('text')}
        >
          {t('app.tab.text')}
        </button>
        <button
          className={`tab-button ${activeTab === 'image' ? 'active' : ''}`}
          onClick={() => setActiveTab('image')}
        >
          {t('app.tab.image')}
        </button>
        <button
          className={`tab-button ${activeTab === 'video' ? 'active' : ''}`}
          onClick={() => setActiveTab('video')}
        >
          {t('app.tab.video')}
        </button>
        <button
          className={`tab-button ${activeTab === 'engineering' ? 'active' : ''}`}
          onClick={() => setActiveTab('engineering')}
        >
          {t('app.tab.engineering')}
        </button>
        <button
          className={`tab-button ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          {t('app.tab.templates')}
        </button>
        <button
          className={`tab-button ${activeTab === 'about' ? 'active' : ''}`}
          onClick={() => setActiveTab('about')}
        >
          {t('app.tab.about')}
        </button>
      </div>

      <div className="tab-content">
        <Suspense fallback={<LoadingSpinner message="로딩 중..." />}>
          {activeTab === 'text' && <PromptGenerator />}
          {activeTab === 'image' && <ImagePromptGenerator />}
          {activeTab === 'video' && <VideoPromptGenerator />}
          {activeTab === 'engineering' && <EngineeringPromptGenerator />}
          {activeTab === 'templates' && (
            <TemplateGalleryWrapper />
          )}
          {activeTab === 'about' && <AboutPage />}
        </Suspense>
      </div>

      <footer className="app-footer">
        <div className="footer-content">
          <p>
            {t('app.footer.copyright')} |{' '}
            <a href="mailto:chunghyo@troe.kr" className="footer-link">chunghyo@troe.kr</a>
          </p>
          <div className="footer-links">
            <a
              href="https://www.linkedin.com/in/chunghyopark/"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-link linkedin-link"
              aria-label="LinkedIn"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="footer-icon"
              >
                <path
                  d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
                  fill="currentColor"
                />
              </svg>
              <span>LinkedIn</span>
            </a>
            <a
              href="https://park.allrounder.im/"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-link portfolio-link"
              aria-label="Portfolio"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="footer-icon"
              >
                <path
                  d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Portfolio</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

// 템플릿 갤러리 래퍼 컴포넌트
function TemplateGalleryWrapper() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
      <TemplateGallery />
    </div>
  )
}

export default App
