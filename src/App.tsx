import { useState, useEffect } from 'react'
import PromptGenerator from './components/PromptGenerator'
import ImagePromptGenerator from './components/ImagePromptGenerator'
import VideoPromptGenerator from './components/VideoPromptGenerator'
import EngineeringPromptGenerator from './components/EngineeringPromptGenerator'
import TemplateGallery from './components/TemplateGallery'
import AboutPage from './components/AboutPage'
import AdminLogin from './components/AdminLogin'
import AdminDashboard from './components/AdminDashboard'
import ThemeToggle from './components/ThemeToggle'
import LanguageToggle from './components/LanguageToggle'
import { getAdminAuth, incrementVisitCount } from './utils/storage'
import { initializeScheduler } from './utils/prompt-guide-scheduler'
import { templateAPI } from './utils/api'
import { useLanguage } from './contexts/LanguageContext'
import './App.css'

type TabType = 'text' | 'image' | 'video' | 'engineering' | 'templates' | 'about'

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('text')
  // 서비스 시작 시 항상 일반 모드로 시작 (Admin 모드는 명시적으로 진입)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)

  useEffect(() => {
    // 방문수 증가
    incrementVisitCount()
    
    // Admin 인증 상태 확인
    const adminAuth = getAdminAuth()
    setIsAdminAuthenticated(adminAuth)
    
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
          <AdminLogin 
            onLogin={handleAdminLogin}
            onBack={() => {
              setIsAdmin(false)
            }}
          />
        </div>
      )
    }
    return (
      <div className="app">
        <AdminDashboard 
          onLogout={handleAdminLogout}
          onBackToMain={() => {
            setIsAdmin(false)
          }}
        />
      </div>
    )
  }

  return (
    <AppContent 
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      setIsAdmin={setIsAdmin}
    />
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

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-content">
          <div className="app-header-text">
            <h1>{t('app.title')}</h1>
            <p>{t('app.subtitle')}</p>
          </div>
          <div className="header-actions">
            <div className="header-controls">
              <ThemeToggle />
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
        {activeTab === 'text' && <PromptGenerator />}
        {activeTab === 'image' && <ImagePromptGenerator />}
        {activeTab === 'video' && <VideoPromptGenerator />}
        {activeTab === 'engineering' && <EngineeringPromptGenerator />}
        {activeTab === 'templates' && (
          <TemplateGalleryWrapper />
        )}
        {activeTab === 'about' && <AboutPage />}
      </div>

      <footer className="app-footer">
        <div className="footer-content">
          <p>
            {t('app.footer.copyright')} |{' '}
            <a href="mailto:chunghyo@troe.kr" className="footer-link">chunghyo@troe.kr</a>
          </p>
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
