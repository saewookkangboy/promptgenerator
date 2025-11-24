// 입력 검증 유틸리티

export interface ValidationResult {
  isValid: boolean
  error?: string
}

/**
 * 프롬프트 입력 검증
 */
export function validatePrompt(prompt: string): ValidationResult {
  if (!prompt || !prompt.trim()) {
    return {
      isValid: false,
      error: '프롬프트를 입력해주세요.',
    }
  }

  if (prompt.trim().length < 3) {
    return {
      isValid: false,
      error: '프롬프트는 최소 3자 이상 입력해주세요.',
    }
  }

  if (prompt.length > 5000) {
    return {
      isValid: false,
      error: '프롬프트는 5000자 이하로 입력해주세요.',
    }
  }

  return { isValid: true }
}

/**
 * 숫자 범위 검증
 */
export function validateNumberRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): ValidationResult {
  if (value < min || value > max) {
    return {
      isValid: false,
      error: `${fieldName}은(는) ${min}부터 ${max} 사이의 값이어야 합니다.`,
    }
  }

  return { isValid: true }
}

/**
 * 필수 필드 검증
 */
export function validateRequired(
  value: string | undefined | null,
  fieldName: string
): ValidationResult {
  if (!value || !value.trim()) {
    return {
      isValid: false,
      error: `${fieldName}을(를) 입력해주세요.`,
    }
  }

  return { isValid: true }
}

