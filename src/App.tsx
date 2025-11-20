import React, { useState } from 'react'
import PromptGenerator from './components/PromptGenerator'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>프롬프트 생성기</h1>
        <p>자연어 텍스트를 입력하면 콘텐츠 제작용 프롬프트를 생성합니다</p>
      </header>
      <PromptGenerator />
    </div>
  )
}

export default App

