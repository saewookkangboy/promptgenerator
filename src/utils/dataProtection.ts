// 데이터 보호 유틸리티

/**
 * 민감한 정보 마스킹
 */
export function maskSensitiveData(text: string, type: 'email' | 'phone' | 'creditCard' = 'email'): string {
  if (!text) return ''
  
  switch (type) {
    case 'email':
      const [local, domain] = text.split('@')
      if (!domain) return text
      const maskedLocal = local.length > 2 
        ? `${local.substring(0, 2)}${'*'.repeat(Math.min(local.length - 2, 4))}`
        : '**'
      return `${maskedLocal}@${domain}`
    
    case 'phone':
      const digits = text.replace(/\D/g, '')
      if (digits.length < 4) return text
      return `${digits.substring(0, 3)}-****-${digits.substring(digits.length - 4)}`
    
    case 'creditCard':
      const cardDigits = text.replace(/\D/g, '')
      if (cardDigits.length < 4) return text
      return `****-****-****-${cardDigits.substring(cardDigits.length - 4)}`
    
    default:
      return text
  }
}

/**
 * 프롬프트 내용에서 민감한 정보 제거
 */
export function sanitizePromptContent(content: string): string {
  if (!content) return ''
  
  // 이메일 패턴 제거 또는 마스킹
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
  let sanitized = content.replace(emailRegex, (email) => maskSensitiveData(email, 'email'))
  
  // 전화번호 패턴 제거 또는 마스킹
  const phoneRegex = /\b\d{2,3}[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g
  sanitized = sanitized.replace(phoneRegex, (phone) => maskSensitiveData(phone, 'phone'))
  
  // 신용카드 번호 패턴 제거 또는 마스킹
  const cardRegex = /\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g
  sanitized = sanitized.replace(cardRegex, (card) => maskSensitiveData(card, 'creditCard'))
  
  return sanitized
}

/**
 * 로그에 기록할 때 민감한 정보 제거
 */
export function sanitizeForLogging(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return typeof data === 'string' ? sanitizePromptContent(data) : data
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForLogging(item))
  }
  
  const sanitized: any = {}
  const sensitiveFields = ['password', 'passwordHash', 'token', 'accessToken', 'refreshToken', 'apiKey', 'secret']
  
  for (const [key, value] of Object.entries(data)) {
    if (sensitiveFields.includes(key.toLowerCase())) {
      sanitized[key] = '***REDACTED***'
    } else if (key.toLowerCase().includes('email')) {
      sanitized[key] = typeof value === 'string' ? maskSensitiveData(value, 'email') : value
    } else {
      sanitized[key] = sanitizeForLogging(value)
    }
  }
  
  return sanitized
}
