import { useEffect } from 'react'
import './AboutPage.css'

function AboutPage() {
  useEffect(() => {
    // 스크롤 애니메이션을 위한 Intersection Observer 설정
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
        }
      })
    }, observerOptions)

    // DOM이 완전히 렌더링된 후 요소들을 관찰 시작
    const timeoutId = setTimeout(() => {
      const elements = document.querySelectorAll('.fade-in-section')
      elements.forEach((el) => observer.observe(el))
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      const elements = document.querySelectorAll('.fade-in-section')
      elements.forEach((el) => observer.unobserve(el))
    }
  }, [])

  const features = [
    {
      title: '텍스트 콘텐츠 생성',
      description: '블로그, 소셜 미디어(LinkedIn, Facebook, Instagram), YouTube용 텍스트 프롬프트 생성. SEO, GEO, AEO 최적화 및 타겟 독자 맞춤형 콘텐츠 제공.',
      icon: '▤',
    },
    {
      title: '이미지 생성',
      description: 'Midjourney, DALL-E, Stable Diffusion 등 다양한 AI 이미지 생성 모델 지원. 구도, 조명, 색상 등 상세한 스타일 설정 가능.',
      icon: '▦',
    },
    {
      title: '동영상 생성',
      description: 'Sora, Veo, Runway 등 동영상 생성 AI 모델 지원. 스토리보드 기능으로 여러 장면을 구성하고 카메라 움직임, 샷 타입 설정 가능.',
      icon: '▶',
    },
    {
      title: '프롬프트 엔지니어링',
      description: 'Zero-shot, Chain of Thought, Few-shot Learning, Role-based Prompting 등 고급 프롬프트 기법 지원. 자동 최적화 및 점수화 기능 제공.',
      icon: '◉',
    },
    {
      title: 'Native English 변환',
      description: '모든 프롬프트에 대해 자연스러운 영어 버전 자동 생성. AI 모델에 최적화된 표현으로 변환하여 글로벌 사용자 지원.',
      icon: '◯',
    },
    {
      title: '템플릿 갤러리',
      description: '다양한 프롬프트 템플릿을 카테고리별로 탐색하고 재사용 가능. 마케팅, 커머스 등 다양한 분야별 최적화된 템플릿 제공.',
      icon: '▣',
    },
  ]

  const targetUsers = [
    {
      title: '콘텐츠 크리에이터',
      description: '블로그, 소셜 미디어, YouTube 등 다양한 플랫폼에서 고품질 콘텐츠를 만들고 싶은 크리에이터',
    },
    {
      title: '마케터',
      description: '브랜드 메시지를 효과적으로 전달하고, 타겟 고객에게 최적화된 콘텐츠를 만들고 싶은 마케팅 전문가',
    },
    {
      title: '디자이너',
      description: 'AI 이미지 생성 도구를 활용하여 창의적인 시각 콘텐츠를 빠르게 제작하고 싶은 디자이너',
    },
    {
      title: '동영상 제작자',
      description: 'AI 동영상 생성 기술을 활용하여 스토리텔링이 있는 영상을 만들고 싶은 제작자',
    },
    {
      title: '개발자/프롬프트 엔지니어',
      description: '프롬프트 최적화 기법을 학습하고, AI 모델과의 상호작용을 개선하고 싶은 기술 전문가',
    },
    {
      title: '기업/팀',
      description: '워크스페이스 기능을 활용하여 팀 내 프롬프트를 공유하고 협업하고 싶은 조직',
    },
  ]

  return (
    <div className="about-page">
      {/* Hero Section */}
      <section className="about-hero fade-in-section">
        <h1 className="hero-title">자연어 텍스트를 입력하면 텍스트, 이미지, 동영상 생성용 프롬프트를 생성하는 통합 웹 애플리케이션입니다.</h1>
      </section>

      {/* 주요 기능 Section */}
      <section className="about-section fade-in-section">
        <h2 className="section-title">주요 기능</h2>
        <p className="section-description">
          프롬프트 메이커는 4가지 핵심 카테고리와 다양한 고급 기능을 제공하여, 
          누구나 쉽고 빠르게 최적화된 프롬프트를 생성할 수 있도록 지원합니다.
        </p>
        <div className="cards-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="card-icon">{feature.icon}</div>
              <h3 className="card-title">{feature.title}</h3>
              <p className="card-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 타겟 사용자 Section */}
      <section className="about-section fade-in-section">
        <h2 className="section-title">누구를 위한 서비스인가요?</h2>
        <p className="section-description">
          프롬프트 메이커는 다양한 분야의 전문가와 창작자들을 지원합니다.
        </p>
        <div className="cards-grid">
          {targetUsers.map((user, index) => (
            <div key={index} className="target-card">
              <h3 className="card-title">{user.title}</h3>
              <p className="card-description">{user.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 핵심 가치 Section */}
      <section className="about-section fade-in-section">
        <h2 className="section-title">핵심 가치</h2>
        <div className="values-grid">
          <div className="value-item">
            <h3 className="value-title">간편함</h3>
            <p className="value-description">
              복잡한 설정 없이 자연어만 입력하면 최적화된 프롬프트를 자동 생성합니다.
            </p>
          </div>
          <div className="value-item">
            <h3 className="value-title">정확성</h3>
            <p className="value-description">
              각 AI 모델의 특성에 맞춘 전문적인 프롬프트로 더 나은 결과를 얻을 수 있습니다.
            </p>
          </div>
          <div className="value-item">
            <h3 className="value-title">다양성</h3>
            <p className="value-description">
              텍스트, 이미지, 동영상 등 다양한 콘텐츠 타입과 AI 모델을 한 곳에서 지원합니다.
            </p>
          </div>
          <div className="value-item">
            <h3 className="value-title">확장성</h3>
            <p className="value-description">
              워크스페이스, 버전 관리, A/B 테스트 등 고급 기능으로 팀 협업을 지원합니다.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="about-cta fade-in-section">
        <h2 className="cta-title">지금 바로 시작해보세요</h2>
        <p className="cta-description">
          프롬프트 메이커와 함께 더 나은 콘텐츠를 만들어보세요.
        </p>
      </section>
    </div>
  )
}

export default AboutPage
