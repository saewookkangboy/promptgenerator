/**
 * 프론트엔드 보안 유틸리티
 * 
 * XSS 방지, 입력 검증, CSRF 토큰 관리 등을 제공합니다.
 */

/**
 * XSS 방지를 위한 HTML 이스케이프
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

/**
 * HTML 태그 제거
 */
export function stripHtml(html: string): string {
  const tmp = document.createElement('DIV')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

/**
 * 안전한 HTML 삽입 (DOMPurify 사용 권장)
 */
export function sanitizeHtml(html: string): string {
  // 기본적인 XSS 방지 (프로덕션에서는 DOMPurify 라이브러리 사용 권장)
  // 참고: DOMPurify 사용 시 allowedTags와 allowedAttributes 옵션 활용 가능
  
  // 간단한 태그 제거 (실제로는 DOMPurify 같은 라이브러리 사용)
  const div = document.createElement('div')
  div.innerHTML = html
  
  // 스크립트 태그 제거
  const scripts = div.querySelectorAll('script')
  scripts.forEach(script => script.remove())
  
  // 이벤트 핸들러 제거
  const elements = div.querySelectorAll('*')
  elements.forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name)
      }
    })
  })
  
  return div.innerHTML
}

/**
 * URL 검증
 */
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    // 허용된 프로토콜만
    return ['http:', 'https:'].includes(urlObj.protocol)
  } catch {
    return false
  }
}

/**
 * 안전한 URL 생성
 */
export function createSafeUrl(url: string, base?: string): string | null {
  try {
    const urlObj = new URL(url, base || window.location.origin)
    // 허용된 프로토콜만
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return null
    }
    return urlObj.toString()
  } catch {
    return null
  }
}

/**
 * 입력 길이 검증
 */
export function validateLength(
  value: string,
  min: number = 0,
  max: number = Infinity
): { valid: boolean; message?: string } {
  if (value.length < min) {
    return {
      valid: false,
      message: `최소 ${min}자 이상 입력해주세요`,
    }
  }
  if (value.length > max) {
    return {
      valid: false,
      message: `최대 ${max}자까지 입력 가능합니다`,
    }
  }
  return { valid: true }
}

/**
 * 이메일 검증
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 비밀번호 강도 검증
 */
export function validatePasswordStrength(password: string): {
  valid: boolean
  score: number // 0-4
  message: string
  requirements: {
    length: boolean
    uppercase: boolean
    lowercase: boolean
    number: boolean
    special: boolean
  }
} {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[@$!%*?&]/.test(password),
  }

  const score = Object.values(requirements).filter(Boolean).length
  const valid = score >= 4

  let message = ''
  if (!valid) {
    const missing = []
    if (!requirements.length) missing.push('최소 8자')
    if (!requirements.uppercase) missing.push('대문자')
    if (!requirements.lowercase) missing.push('소문자')
    if (!requirements.number) missing.push('숫자')
    if (!requirements.special) missing.push('특수문자')
    message = `비밀번호는 ${missing.join(', ')}를 포함해야 합니다`
  } else {
    message = '강력한 비밀번호입니다'
  }

  return {
    valid,
    score,
    message,
    requirements,
  }
}

/**
 * CSRF 토큰 가져오기
 */
export async function getCSRFToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/csrf-token', {
      method: 'GET',
      credentials: 'include',
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.csrfToken || null
  } catch (error) {
    console.error('CSRF 토큰 가져오기 실패:', error)
    return null
  }
}

/**
 * CSRF 토큰을 헤더에 추가한 fetch 래퍼
 */
export async function secureFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // CSRF 토큰 가져오기
  const csrfToken = await getCSRFToken()

  // 헤더 설정
  const headers = new Headers(options.headers)
  if (csrfToken) {
    headers.set('X-CSRF-Token', csrfToken)
  }

  // 요청 옵션 업데이트
  const secureOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // 쿠키 포함
  }

  return fetch(url, secureOptions)
}

/**
 * 입력 값 정규화 (앞뒤 공백 제거, 특수 문자 정리)
 */
export function normalizeInput(input: string): string {
  return input.trim().replace(/\s+/g, ' ')
}

/**
 * SQL Injection 패턴 검사
 */
export function containsSQLInjection(input: string): boolean {
  const patterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION)\b)/i,
    /(--|\#|\/\*|\*\/|;|'|"|`)/,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
  ]

  return patterns.some(pattern => pattern.test(input))
}

/**
 * XSS 패턴 검사
 */
export function containsXSS(input: string): boolean {
  const patterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
  ]

  return patterns.some(pattern => pattern.test(input))
}

/**
 * 안전한 입력 검증
 */
export function validateSafeInput(
  input: string,
  options: {
    maxLength?: number
    allowHtml?: boolean
    checkSQL?: boolean
    checkXSS?: boolean
  } = {}
): {
  valid: boolean
  message?: string
  sanitized?: string
} {
  const {
    maxLength = 10000,
    allowHtml = false,
    checkSQL = true,
    checkXSS = true,
  } = options

  // 길이 검증
  if (input.length > maxLength) {
    return {
      valid: false,
      message: `입력 길이는 ${maxLength}자를 초과할 수 없습니다`,
    }
  }

  // SQL Injection 검사
  if (checkSQL && containsSQLInjection(input)) {
    return {
      valid: false,
      message: '입력에 유효하지 않은 문자가 포함되어 있습니다',
    }
  }

  // XSS 검사
  if (checkXSS && !allowHtml && containsXSS(input)) {
    return {
      valid: false,
      message: '입력에 유효하지 않은 HTML이 포함되어 있습니다',
    }
  }

  // Sanitization
  let sanitized = input
  if (!allowHtml) {
    sanitized = escapeHtml(sanitized)
  }

  return {
    valid: true,
    sanitized,
  }
}

/**
 * Content Security Policy 헤더 확인
 */
export function checkCSP(): boolean {
  // CSP가 제대로 설정되었는지 확인
  const metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
  return !!metaCSP
}

/**
 * 보안 헤더 확인
 */
export async function checkSecurityHeaders(): Promise<{
  csp: boolean
  hsts: boolean
  xFrameOptions: boolean
}> {
  try {
    const response = await fetch('/api/health', {
      method: 'HEAD',
    })

    const headers = response.headers
    return {
      csp: headers.has('content-security-policy'),
      hsts: headers.has('strict-transport-security'),
      xFrameOptions: headers.has('x-frame-options'),
    }
  } catch {
    return {
      csp: false,
      hsts: false,
      xFrameOptions: false,
    }
  }
}

/**
 * 안전한 JSON 파싱
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T
  } catch {
    return defaultValue
  }
}

/**
 * 안전한 localStorage 사용
 */
export class SecureStorage {
  private prefix: string

  constructor(prefix: string = 'app_') {
    this.prefix = prefix
  }

  set(key: string, value: any): void {
    try {
      const serialized = JSON.stringify(value)
      localStorage.setItem(`${this.prefix}${key}`, serialized)
    } catch (error) {
      console.error('localStorage 저장 실패:', error)
    }
  }

  get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(`${this.prefix}${key}`)
      if (item === null) {
        return defaultValue
      }
      return JSON.parse(item) as T
    } catch {
      return defaultValue
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(`${this.prefix}${key}`)
    } catch (error) {
      console.error('localStorage 삭제 실패:', error)
    }
  }

  clear(): void {
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.error('localStorage 초기화 실패:', error)
    }
  }
}

export const secureStorage = new SecureStorage()
