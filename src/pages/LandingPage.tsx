import { useState } from 'react'
import './LandingPage.css'

interface Feature {
  icon: string
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: '📝',
    title: '텍스트 콘텐츠 생성',
    description: '블로그, 소셜 미디어, 마케팅 콘텐츠를 위한 최적화된 프롬프트 생성',
  },
  {
    icon: '🎨',
    title: '이미지 생성',
    description: 'AI 이미지 생성 모델에 최적화된 상세한 프롬프트 생성',
  },
  {
    icon: '🎬',
    title: '동영상 생성',
    description: '동영상 생성 AI를 위한 시나리오 및 스토리보드 프롬프트',
  },
  {
    icon: '⚙️',
    title: '프롬프트 엔지니어링',
    description: '고급 기법을 활용한 프롬프트 최적화 및 개선',
  },
]

const steps = [
  {
    number: 1,
    title: '목표 선택',
    description: '생성하고자 하는 콘텐츠의 목적과 채널을 선택하세요',
  },
  {
    number: 2,
    title: '타겟 설정',
    description: '타겟 독자와 톤앤매너를 설정하세요',
  },
  {
    number: 3,
    title: '프롬프트 입력',
    description: '자연어로 원하는 내용을 자유롭게 작성하세요',
  },
  {
    number: 4,
    title: '결과 확인',
    description: '최적화된 프롬프트를 확인하고 사용하세요',
  },
]

export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0)

  const handleGetStarted = () => {
    // 메인 앱으로 이동 (라우터가 있다면)
    if (window.location.pathname === '/') {
      // 현재 경로가 루트면 App 컴포넌트로 전환
      window.location.hash = '#app'
    }
  }

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            프롬프트 메이커
          </h1>
          <p className="hero-subtitle">
            AI를 위한 최적화된 프롬프트를 쉽고 빠르게 생성하세요
          </p>
          <p className="hero-description">
            2026년 최신 컨텍스트 엔지니어링 기법을 적용한 프롬프트 생성 도구입니다.
            텍스트, 이미지, 동영상 생성에 필요한 모든 프롬프트를 한 곳에서 관리하세요.
          </p>
          <div className="hero-actions">
            <button className="cta-button primary" onClick={handleGetStarted}>
              시작하기
            </button>
            <button className="cta-button secondary" onClick={() => {
              document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
            }}>
              더 알아보기
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-container">
          <h2 className="section-title">주요 기능</h2>
          <p className="section-subtitle">
            4가지 강력한 프롬프트 생성 도구를 제공합니다
          </p>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`feature-card ${activeFeature === index ? 'active' : ''}`}
                onMouseEnter={() => setActiveFeature(index)}
              >
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="section-container">
          <h2 className="section-title">사용 방법</h2>
          <p className="section-subtitle">
             4단계로 간단하게 프롬프트를 생성하세요
          </p>
          <div className="steps-container">
            {steps.map((step, index) => (
              <div key={index} className="step-card">
                <div className="step-number">{step.number}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-description">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="use-cases-section">
        <div className="section-container">
          <h2 className="section-title">사용 사례</h2>
          <div className="use-cases-grid">
            <div className="use-case-card">
              <h3>콘텐츠 마케터</h3>
              <p>소셜 미디어 게시물, 블로그 포스트, 이메일 캠페인을 위한 프롬프트 생성</p>
            </div>
            <div className="use-case-card">
              <h3>디자이너</h3>
              <p>이미지 생성 AI를 위한 상세하고 정확한 프롬프트 작성</p>
            </div>
            <div className="use-case-card">
              <h3>개발자</h3>
              <p>코드 생성, 문서화, 기술 블로그 작성을 위한 프롬프트 최적화</p>
            </div>
            <div className="use-case-card">
              <h3>교육자</h3>
              <p>교육 자료, 강의 노트, 학습 가이드 생성을 위한 프롬프트 활용</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section">
        <div className="section-container">
          <h2 className="section-title">자주 묻는 질문</h2>
          <div className="faq-list">
            <div className="faq-item">
              <h3 className="faq-question">프롬프트 메이커는 무료인가요?</h3>
              <p className="faq-answer">
                네, 기본 기능은 무료로 사용할 수 있습니다. 고급 기능은 프리미엄 플랜에서 제공됩니다.
              </p>
            </div>
            <div className="faq-item">
              <h3 className="faq-question">어떤 AI 모델을 지원하나요?</h3>
              <p className="faq-answer">
                GPT-4, Claude, Gemini, Llama 등 주요 AI 모델에 최적화된 프롬프트를 생성합니다.
              </p>
            </div>
            <div className="faq-item">
              <h3 className="faq-question">생성된 프롬프트를 저장할 수 있나요?</h3>
              <p className="faq-answer">
                네, 로그인 후 생성한 프롬프트를 저장하고 관리할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="section-container">
          <h2 className="cta-title">지금 시작하세요</h2>
          <p className="cta-description">
            AI를 더 효과적으로 활용하기 위한 첫 걸음을 내딛어보세요
          </p>
          <button className="cta-button primary large" onClick={handleGetStarted}>
            무료로 시작하기
          </button>
        </div>
      </section>
    </div>
  )
}
