// 구독 관리 컴포넌트
import { useState, useEffect } from 'react'
// import { userAPI } from '../utils/api' // 사용하지 않음
import { showNotification } from '../utils/notifications'
import './SubscriptionManager.css'

interface SubscriptionPlan {
  id: string
  name: string
  tier: 'FREE' | 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE'
  price: number
  currency: string
  features: string[]
  limits: {
    promptsPerMonth: number | 'unlimited'
    apiRequestsPerMinute: number
    workspaces: number | 'unlimited'
    teamMembers: number | 'unlimited'
  }
}

interface UserSubscription {
  tier: string
  status: string
  currentPeriodStart?: string
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
}

const PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: '무료',
    tier: 'FREE',
    price: 0,
    currency: 'KRW',
    features: [
      '기본 프롬프트 생성',
      '월 50개 프롬프트',
      '분당 10회 API 요청',
      '1개 워크스페이스',
      '기본 지원',
    ],
    limits: {
      promptsPerMonth: 50,
      apiRequestsPerMinute: 10,
      workspaces: 1,
      teamMembers: 1,
    },
  },
  {
    id: 'basic',
    name: '베이직',
    tier: 'BASIC',
    price: 9900,
    currency: 'KRW',
    features: [
      '무제한 프롬프트 생성',
      '분당 50회 API 요청',
      '3개 워크스페이스',
      '5명 팀 멤버',
      '우선 지원',
      '고급 템플릿',
    ],
    limits: {
      promptsPerMonth: 'unlimited',
      apiRequestsPerMinute: 50,
      workspaces: 3,
      teamMembers: 5,
    },
  },
  {
    id: 'professional',
    name: '프로페셔널',
    tier: 'PROFESSIONAL',
    price: 29900,
    currency: 'KRW',
    features: [
      '무제한 프롬프트 생성',
      '분당 200회 API 요청',
      '무제한 워크스페이스',
      '무제한 팀 멤버',
      '우선 지원',
      '모든 템플릿',
      '고급 분석',
      'API 접근',
    ],
    limits: {
      promptsPerMonth: 'unlimited',
      apiRequestsPerMinute: 200,
      workspaces: 'unlimited',
      teamMembers: 'unlimited',
    },
  },
  {
    id: 'enterprise',
    name: '엔터프라이즈',
    tier: 'ENTERPRISE',
    price: 0, // 맞춤 가격
    currency: 'KRW',
    features: [
      '무제한 프롬프트 생성',
      '분당 1000회 API 요청',
      '무제한 워크스페이스',
      '무제한 팀 멤버',
      '전담 지원',
      '모든 템플릿',
      '고급 분석',
      'API 접근',
      '맞춤 통합',
      'SLA 보장',
    ],
    limits: {
      promptsPerMonth: 'unlimited',
      apiRequestsPerMinute: 1000,
      workspaces: 'unlimited',
      teamMembers: 'unlimited',
    },
  },
]

function SubscriptionManager() {
  const [currentSubscription, _setCurrentSubscription] = useState<UserSubscription | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [_selectedPlan, _setSelectedPlan] = useState<string | null>(null)

  useEffect(() => {
    loadSubscription()
  }, [])

  const loadSubscription = async () => {
    try {
      // TODO: userAPI.getSubscription 구현 필요
      // const data = await userAPI.getSubscription()
      // setCurrentSubscription(data)
    } catch (error: any) {
      console.error('구독 정보 로드 실패:', error)
    }
  }

  const handleUpgrade = async (planId: string) => {
    _setSelectedPlan(planId)
    // TODO: 결제 프로세스 시작
    showNotification('결제 프로세스를 시작합니다...', 'info')
  }

  const handleCancel = async () => {
    if (!confirm('구독을 취소하시겠습니까? 현재 기간이 끝날 때까지 계속 사용할 수 있습니다.')) {
      return
    }

    try {
      setIsLoading(true)
      // TODO: userAPI.cancelSubscription 구현 필요
      // await userAPI.cancelSubscription()
      showNotification('구독이 취소되었습니다', 'success')
      loadSubscription()
    } catch (error: any) {
      showNotification(error.message || '구독 취소에 실패했습니다', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    if (price === 0) return '무료'
    return `₩${price.toLocaleString()}/월`
  }

  const currentPlan = PLANS.find(p => p.tier === currentSubscription?.tier)

  return (
    <div className="subscription-manager">
      <div className="subscription-header">
        <h2>구독 관리</h2>
        {currentSubscription && (
          <div className="current-subscription">
            <span className="current-tier">{currentPlan?.name || currentSubscription.tier}</span>
            <span className="subscription-status">{currentSubscription.status}</span>
          </div>
        )}
      </div>

      {currentSubscription && currentPlan && (
        <div className="current-plan-info">
          <h3>현재 플랜</h3>
          <div className="plan-details">
            <div className="plan-features">
              <h4>포함된 기능:</h4>
              <ul>
                {currentPlan.features.map((feature, idx) => (
                  <li key={idx}>{feature}</li>
                ))}
              </ul>
            </div>
            <div className="plan-limits">
              <h4>제한사항:</h4>
              <ul>
                <li>월 프롬프트: {currentPlan.limits.promptsPerMonth === 'unlimited' ? '무제한' : currentPlan.limits.promptsPerMonth}</li>
                <li>API 요청: 분당 {currentPlan.limits.apiRequestsPerMinute}회</li>
                <li>워크스페이스: {currentPlan.limits.workspaces === 'unlimited' ? '무제한' : currentPlan.limits.workspaces}</li>
                <li>팀 멤버: {currentPlan.limits.teamMembers === 'unlimited' ? '무제한' : currentPlan.limits.teamMembers}</li>
              </ul>
            </div>
          </div>
          {currentSubscription.currentPeriodEnd && (
            <div className="subscription-period">
              <p>
                현재 기간: {new Date(currentSubscription.currentPeriodStart || '').toLocaleDateString('ko-KR')} ~{' '}
                {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString('ko-KR')}
              </p>
            </div>
          )}
          {currentSubscription.status === 'ACTIVE' && (
            <button className="cancel-button" onClick={handleCancel} disabled={isLoading}>
              구독 취소
            </button>
          )}
        </div>
      )}

      <div className="plans-section">
        <h3>플랜 선택</h3>
        <div className="plans-grid">
          {PLANS.map(plan => {
            const isCurrentPlan = currentPlan?.id === plan.id
            const isUpgrade = currentPlan && ['FREE', 'BASIC', 'PROFESSIONAL'].includes(currentPlan.tier) && 
                              ['BASIC', 'PROFESSIONAL', 'ENTERPRISE'].includes(plan.tier)

            return (
              <div
                key={plan.id}
                className={`plan-card ${isCurrentPlan ? 'current' : ''} ${plan.tier === 'PROFESSIONAL' ? 'popular' : ''}`}
              >
                {plan.tier === 'PROFESSIONAL' && (
                  <div className="popular-badge">인기</div>
                )}
                <h4>{plan.name}</h4>
                <div className="plan-price">
                  {formatPrice(plan.price)}
                  {plan.price > 0 && <span className="price-period">/월</span>}
                </div>
                <ul className="plan-features-list">
                  {plan.features.map((feature, idx) => (
                    <li key={idx}>{feature}</li>
                  ))}
                </ul>
                <button
                  className={`plan-button ${isCurrentPlan ? 'current' : ''}`}
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isCurrentPlan}
                >
                  {isCurrentPlan ? '현재 플랜' : isUpgrade ? '업그레이드' : plan.price === 0 ? '문의하기' : '시작하기'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default SubscriptionManager
