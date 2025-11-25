import { useState } from 'react'
import PromptGenerator from './components/PromptGenerator'
import ImagePromptGenerator from './components/ImagePromptGenerator'
import VideoPromptGenerator from './components/VideoPromptGenerator'
import EngineeringPromptGenerator from './components/EngineeringPromptGenerator'
import './App.css'

type TabType = 'text' | 'image' | 'video' | 'engineering'

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('text')

  return (
    <div className="app">
      <header className="app-header">
        <h1>프롬프트 생성기</h1>
        <p>텍스트, 이미지, 동영상 생성용 프롬프트를 생성합니다</p>
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
