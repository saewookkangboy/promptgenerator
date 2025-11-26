import { useState, useEffect } from 'react'
import PromptGenerator from './components/PromptGenerator'
import ImagePromptGenerator from './components/ImagePromptGenerator'
import VideoPromptGenerator from './components/VideoPromptGenerator'
import EngineeringPromptGenerator from './components/EngineeringPromptGenerator'
import AdminLogin from './components/AdminLogin'
import AdminDashboard from './components/AdminDashboard'
import { getAdminAuth, incrementVisitCount } from './utils/storage'
import { initializeScheduler } from './utils/prompt-guide-scheduler'
import './App.css'

type TabType = 'text' | 'image' | 'video' | 'engineering'

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

  // isAdmin 상태 변경 시 인증 상태 확인
  useEffect(() => {
    if (isAdmin) {
      // Admin 모드가 활성화되면 인증 상태 확인
      const adminAuth = getAdminAuth()
      console.log('[Admin] 모드 활성화, 인증 상태:', adminAuth)
      setIsAdminAuthenticated(adminAuth)
    } else {
      console.log('[Admin] 모드 비활성화')
      setIsAdminAuthenticated(false)
    }
  }, [isAdmin])

  const handleAdminLogin = () => {
    console.log('[Admin] 로그인 성공')
    setIsAdminAuthenticated(true)
  }

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false)
    setIsAdmin(false) // 로그아웃 시 메인 페이지로 돌아감
  }

  // Admin 모드 - 별도 페이지로 이동
  if (isAdmin) {
    if (!isAdminAuthenticated) {
      return (
        <div className="app">
          <AdminLogin 
            onLogin={handleAdminLogin}
            onBack={() => setIsAdmin(false)}
          />
        </div>
      )
    }
    return (
      <div className="app">
        <AdminDashboard 
          onLogout={handleAdminLogout}
          onBackToMain={() => setIsAdmin(false)}
        />
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ flex: 1 }}>
            <h1>프롬프트 메이커</h1>
            <p>텍스트, 이미지, 동영상 생성용 프롬프트를 생성합니다</p>
          </div>
          <div className="header-actions">
            <button
              onClick={(e) => {
                e.preventDefault()
                setIsAdmin(true)
              }}
              className="admin-toggle-button"
              title="관리자 페이지로 이동"
            >
              Admin
            </button>
            <a
              href="https://github.com/saewookkangboy/promptgenerator"
              target="_blank"
              rel="noopener noreferrer"
              className="github-link"
              title="GitHub 저장소"
            >
              <svg
                className="github-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
            </a>
          </div>
        </div>
      </header>
      
      <div className="tabs">
        <button
          className={`tab-button ${activeTab === 'text' ? 'active' : ''}`}
          onClick={() => setActiveTab('text')}
        >
          텍스트 콘텐츠
        </button>
        <button
          className={`tab-button ${activeTab === 'image' ? 'active' : ''}`}
          onClick={() => setActiveTab('image')}
        >
          이미지 생성
        </button>
        <button
          className={`tab-button ${activeTab === 'video' ? 'active' : ''}`}
          onClick={() => setActiveTab('video')}
        >
          동영상 생성
        </button>
        <button
          className={`tab-button ${activeTab === 'engineering' ? 'active' : ''}`}
          onClick={() => setActiveTab('engineering')}
        >
          프롬프트 엔지니어링
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'text' && <PromptGenerator />}
        {activeTab === 'image' && <ImagePromptGenerator />}
        {activeTab === 'video' && <VideoPromptGenerator />}
        {activeTab === 'engineering' && <EngineeringPromptGenerator />}
      </div>

      <footer className="app-footer">
        <p>
          © 2025 chunghyo park. Built to move the market. All rights reserved. |{' '}
          <a href="mailto:chunghyo@troe.kr" className="footer-link">chunghyo@troe.kr</a>
        </p>
      </footer>
    </div>
  )
}

export default App
