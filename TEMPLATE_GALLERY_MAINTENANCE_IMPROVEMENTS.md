# 템플릿 갤러리 유지보수 개선 제안서

## 개요
현재 템플릿 갤러리 시스템의 코드를 분석하여 유지보수성, 확장성, 성능 측면에서 개선할 수 있는 요소들을 제안합니다.

---

## 1. 코드 구조 및 아키텍처 개선

### 1.1 타입 정의 중앙화
**현재 문제점:**
- `TemplateGallery.tsx`에서 `Template` 인터페이스가 로컬에 정의됨
- `TemplateManager.tsx`에서 `TemplatePreset` 타입이 별도로 정의됨
- 타입 불일치로 인한 런타임 오류 가능성

**개선 방안:**
```typescript
// src/types/template.types.ts (새 파일 생성)
export interface Template {
  id: string
  name: string
  description?: string | null
  category: string
  isPremium: boolean
  isTop5?: boolean
  isAI?: boolean
  usageCount: number
  rating: number
  content: PromptTemplate
  variables: string[]
  tierRequired?: string
  isPublic?: boolean
  version?: number
  createdAt?: string
  updatedAt?: string
}

export interface TemplateListResponse {
  templates: Template[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
```

**이점:**
- 타입 일관성 보장
- 재사용성 향상
- 타입 변경 시 한 곳만 수정

---

### 1.2 API 클라이언트 분리
**현재 문제점:**
- `templateAPI`가 `api.ts`에 혼재되어 있음
- 템플릿 관련 로직이 분산됨

**개선 방안:**
```typescript
// src/services/templateService.ts (새 파일 생성)
import { apiRequest } from '../utils/api'
import { Template, TemplateListResponse } from '../types/template.types'

export const templateService = {
  async getPublic(params: { page?: number; limit?: number; category?: string; search?: string }): Promise<TemplateListResponse> {
    const queryParams = new URLSearchParams()
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.limit) queryParams.append('limit', params.limit.toString())
    if (params.category) queryParams.append('category', params.category)
    if (params.search) queryParams.append('search', params.search)
    
    return apiRequest<TemplateListResponse>(`/api/templates/public?${queryParams}`)
  },

  async getById(id: string): Promise<Template> {
    return apiRequest<Template>(`/api/templates/${id}`)
  },

  async apply(id: string, variables: Record<string, string>): Promise<{ prompt: string }> {
    return apiRequest<{ prompt: string }>(`/api/templates/${id}/apply`, {
      method: 'POST',
      body: JSON.stringify({ variables }),
    })
  },

  async recordUsage(id: string, data: { variables: Record<string, string> }): Promise<void> {
    return apiRequest<void>(`/api/templates/${id}/usage`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}
```

**이점:**
- 관심사 분리
- 테스트 용이성 향상
- API 변경 시 영향 범위 최소화

---

### 1.3 커스텀 훅으로 로직 분리
**현재 문제점:**
- `TemplateGallery.tsx`에 비즈니스 로직이 과도하게 포함됨
- 컴포넌트가 320줄로 과도하게 길어짐

**개선 방안:**
```typescript
// src/hooks/useTemplateGallery.ts (새 파일 생성)
import { useState, useEffect, useMemo } from 'react'
import { templateService } from '../services/templateService'
import { Template } from '../types/template.types'

export function useTemplateGallery() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const loadTemplates = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await templateService.getPublic({
        page: 1,
        limit: 100,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: searchQuery || undefined,
      })
      setTemplates(data.templates || [])
    } catch (err: any) {
      setError(err?.message || '템플릿을 불러오는데 실패했습니다.')
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [selectedCategory, searchQuery])

  const filteredTemplates = useMemo(() => {
    let filtered = [...templates]

    // 정렬: Top 5 > AI 추천 > 사용 횟수
    filtered.sort((a, b) => {
      if (a.isTop5 && !b.isTop5) return -1
      if (!a.isTop5 && b.isTop5) return 1
      if (a.isAI && !b.isAI) return -1
      if (!a.isAI && b.isAI) return 1
      return (b.usageCount || 0) - (a.usageCount || 0)
    })

    return filtered
  }, [templates])

  return {
    templates: filteredTemplates,
    loading,
    error,
    selectedCategory,
    searchQuery,
    setSelectedCategory,
    setSearchQuery,
    reload: loadTemplates,
  }
}
```

**이점:**
- 컴포넌트 단순화
- 로직 재사용 가능
- 테스트 용이성 향상

---

## 2. 에러 처리 개선

### 2.1 통합 에러 핸들링
**현재 문제점:**
- 각 컴포넌트에서 에러 처리가 중복됨
- 에러 메시지가 일관성 없음
- 네트워크 에러와 비즈니스 로직 에러 구분이 불명확

**개선 방안:**
```typescript
// src/utils/errorHandler.ts (새 파일 생성)
export class TemplateError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'TemplateError'
  }
}

export function handleTemplateError(error: unknown): string {
  if (error instanceof TemplateError) {
    return error.message
  }
  
  if (error instanceof Error) {
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return '서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.'
    }
    if (error.message.includes('401') || error.message.includes('인증')) {
      return '인증이 필요합니다. 로그인해주세요.'
    }
    if (error.message.includes('403') || error.message.includes('권한')) {
      return '이 템플릿을 사용할 권한이 없습니다.'
    }
    if (error.message.includes('404')) {
      return '템플릿을 찾을 수 없습니다.'
    }
  }
  
  return '알 수 없는 오류가 발생했습니다.'
}
```

---

### 2.2 에러 바운더리 추가
**개선 방안:**
```typescript
// src/components/TemplateErrorBoundary.tsx (새 파일 생성)
import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class TemplateErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Template Gallery Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="template-error-boundary">
          <h3>템플릿 갤러리를 불러올 수 없습니다</h3>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            다시 시도
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
```

---

## 3. 성능 최적화

### 3.1 가상화(Virtualization) 도입
**현재 문제점:**
- 모든 템플릿을 한 번에 렌더링
- 템플릿이 많아질수록 성능 저하

**개선 방안:**
```typescript
// react-window 또는 react-virtual 라이브러리 사용
import { FixedSizeGrid } from 'react-window'

// 또는 무한 스크롤 구현
import { useInfiniteQuery } from '@tanstack/react-query'
```

---

### 3.2 메모이제이션 강화
**현재 문제점:**
- `filterTemplates`가 매번 재실행됨
- `TemplateCard` 컴포넌트가 불필요하게 리렌더링됨

**개선 방안:**
```typescript
// TemplateCard를 React.memo로 감싸기
export const TemplateCard = React.memo(({ template, onClick }: TemplateCardProps) => {
  // ...
}, (prevProps, nextProps) => {
  return prevProps.template.id === nextProps.template.id &&
         prevProps.template.usageCount === nextProps.template.usageCount
})
```

---

### 3.3 이미지/썸네일 지연 로딩
**개선 방안:**
- 템플릿에 썸네일 이미지가 추가될 경우를 대비한 지연 로딩 구현
- Intersection Observer API 활용

---

## 4. 상태 관리 개선

### 4.1 React Query 도입
**현재 문제점:**
- 수동으로 로딩/에러 상태 관리
- 캐싱 없음
- 재시도 로직 없음

**개선 방안:**
```typescript
// src/hooks/useTemplateQuery.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { templateService } from '../services/templateService'

export function useTemplateQuery(category?: string, search?: string) {
  return useQuery({
    queryKey: ['templates', 'public', category, search],
    queryFn: () => templateService.getPublic({ category, search }),
    staleTime: 5 * 60 * 1000, // 5분
    cacheTime: 10 * 60 * 1000, // 10분
    retry: 2,
  })
}

export function useApplyTemplate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, variables }: { id: string; variables: Record<string, string> }) =>
      templateService.apply(id, variables),
    onSuccess: (_, variables) => {
      // 사용 통계 업데이트
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
  })
}
```

---

## 5. 접근성(Accessibility) 개선

### 5.1 ARIA 속성 추가
**개선 방안:**
```typescript
<div 
  className="template-card" 
  role="button"
  tabIndex={0}
  aria-label={`${template.name} 템플릿 선택`}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      onClick()
    }
  }}
>
```

---

### 5.2 키보드 네비게이션
**개선 방안:**
- 화살표 키로 템플릿 간 이동
- Tab 순서 최적화
- 포커스 관리

---

## 6. 테스트 가능성 향상

### 6.1 단위 테스트 추가
**개선 방안:**
```typescript
// src/components/__tests__/TemplateGallery.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { TemplateGallery } from '../TemplateGallery'
import { templateService } from '../../services/templateService'

jest.mock('../../services/templateService')

describe('TemplateGallery', () => {
  it('템플릿 목록을 로드하고 표시한다', async () => {
    const mockTemplates = [
      { id: '1', name: 'Test Template', category: 'text', ... },
    ]
    ;(templateService.getPublic as jest.Mock).mockResolvedValue({
      templates: mockTemplates,
      pagination: { page: 1, total: 1, totalPages: 1 },
    })

    render(<TemplateGallery />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Template')).toBeInTheDocument()
    })
  })
})
```

---

## 7. 로깅 및 모니터링 개선

### 7.1 구조화된 로깅
**현재 문제점:**
- `console.log`가 과도하게 사용됨
- 프로덕션에서 불필요한 로그 출력

**개선 방안:**
```typescript
// src/utils/logger.ts
const isDevelopment = import.meta.env.DEV

export const logger = {
  debug: (...args: any[]) => {
    if (isDevelopment) console.log('[DEBUG]', ...args)
  },
  info: (...args: any[]) => {
    if (isDevelopment) console.info('[INFO]', ...args)
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args)
    // 프로덕션에서는 에러 리포팅 서비스로 전송
  },
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args)
  },
}
```

---

### 7.2 성능 모니터링
**개선 방안:**
```typescript
// 템플릿 로드 시간 측정
const startTime = performance.now()
await loadTemplates()
const loadTime = performance.now() - startTime

// Analytics에 전송
analytics.track('template_gallery_load_time', { duration: loadTime })
```

---

## 8. 코드 품질 개선

### 8.1 하드코딩된 값 상수화
**현재 문제점:**
```typescript
// TemplateGallery.tsx:51
limit: 100  // 하드코딩됨
```

**개선 방안:**
```typescript
// src/constants/template.constants.ts
export const TEMPLATE_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 100,
  MAX_PAGE_SIZE: 500,
  CACHE_DURATION: 5 * 60 * 1000, // 5분
  CATEGORIES: ['all', 'text', 'image', 'video', 'engineering'] as const,
} as const
```

---

### 8.2 매직 넘버/문자열 제거
**개선 방안:**
- `'[Top'`, `'[AI 추천]'` 같은 문자열을 상수로 추출
- 정렬 로직의 우선순위를 설정 객체로 관리

---

## 9. 문서화 개선

### 9.1 JSDoc 주석 추가
**개선 방안:**
```typescript
/**
 * 템플릿 갤러리 컴포넌트
 * 
 * 공개 템플릿 목록을 표시하고 사용자가 템플릿을 선택할 수 있게 합니다.
 * 
 * @param onSelect - 템플릿 선택 시 호출되는 콜백 (레거시 호환성, 현재 미사용)
 * @param onClose - 갤러리 닫기 콜백
 * @param showCloseButton - 닫기 버튼 표시 여부
 * 
 * @example
 * ```tsx
 * <TemplateGallery 
 *   onClose={() => setShowGallery(false)}
 *   showCloseButton={true}
 * />
 * ```
 */
export default function TemplateGallery({ ... }: TemplateGalleryProps) {
  // ...
}
```

---

### 9.2 README 업데이트
**개선 방안:**
- 템플릿 갤러리 사용 가이드 작성
- 컴포넌트 구조 다이어그램
- API 명세서 링크

---

## 10. 보안 개선

### 10.1 XSS 방지
**현재 문제점:**
- 템플릿 내용이 직접 렌더링될 수 있음

**개선 방안:**
```typescript
// DOMPurify 라이브러리 사용
import DOMPurify from 'dompurify'

const sanitizedDescription = DOMPurify.sanitize(template.description)
```

---

### 10.2 입력 검증 강화
**개선 방안:**
- 서버 사이드에서 템플릿 내용 검증
- 클라이언트 사이드에서도 기본 검증 수행

---

## 11. 국제화(i18n) 준비

### 11.1 다국어 지원 구조
**개선 방안:**
```typescript
// src/i18n/template.messages.ts
export const templateMessages = {
  ko: {
    gallery: {
      title: '프롬프트 템플릿 갤러리',
      description: '원하는 템플릿을 선택하여 빠르게 프롬프트를 생성하세요',
      // ...
    },
  },
  en: {
    gallery: {
      title: 'Prompt Template Gallery',
      description: 'Select a template to quickly generate prompts',
      // ...
    },
  },
}
```

---

## 12. 우선순위별 구현 계획

### Phase 1: 즉시 개선 (High Priority)
1. ✅ 타입 정의 중앙화
2. ✅ 에러 처리 통합
3. ✅ 하드코딩된 값 상수화
4. ✅ 로깅 개선

### Phase 2: 단기 개선 (Medium Priority)
1. ✅ 커스텀 훅으로 로직 분리
2. ✅ API 클라이언트 분리
3. ✅ 메모이제이션 강화
4. ✅ 접근성 개선

### Phase 3: 중기 개선 (Low Priority)
1. ✅ React Query 도입
2. ✅ 가상화 구현
3. ✅ 단위 테스트 추가
4. ✅ 성능 모니터링

### Phase 4: 장기 개선 (Future)
1. ✅ 국제화 지원
2. ✅ 고급 필터링 기능
3. ✅ 템플릿 추천 시스템
4. ✅ 사용자 피드백 수집

---

## 결론

템플릿 갤러리 시스템을 유지보수하기 쉽고 확장 가능한 구조로 개선하기 위해 위의 항목들을 단계적으로 적용하는 것을 권장합니다. 특히 타입 안정성, 에러 처리, 코드 구조화는 즉시 개선할 수 있는 항목이며, 큰 효과를 볼 수 있습니다.
