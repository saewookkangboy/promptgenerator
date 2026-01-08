// 입력 검증 및 Sanitization 미들웨어
import { Request, Response, NextFunction } from 'express'
import validator from 'validator'

/**
 * 표준 에러 응답 형식
 */
export interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
}

/**
 * 입력 검증 에러 클래스
 */
export class ValidationError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * 이메일 검증
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }
  return validator.isEmail(email.trim())
}

/**
 * 비밀번호 검증
 * - 최소 8자 이상
 * - 최소 1개의 숫자, 대문자, 소문자 포함 (선택)
 */
export function validatePassword(password: string, strict: boolean = false): { valid: boolean; message?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: '비밀번호는 필수입니다' }
  }

  if (password.length < 8) {
    return { valid: false, message: '비밀번호는 최소 8자 이상이어야 합니다' }
  }

  if (strict) {
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: '비밀번호는 최소 1개의 대문자를 포함해야 합니다' }
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: '비밀번호는 최소 1개의 소문자를 포함해야 합니다' }
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: '비밀번호는 최소 1개의 숫자를 포함해야 합니다' }
    }
  }

  return { valid: true }
}

/**
 * 문자열 Sanitization (XSS 방지)
 */
export function sanitizeString(input: string, options: { maxLength?: number; allowHtml?: boolean } = {}): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  let sanitized = input.trim()

  // HTML 태그 제거 (allowHtml가 false인 경우)
  if (!options.allowHtml) {
    sanitized = validator.escape(sanitized)
  }

  // 최대 길이 제한
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength)
  }

  return sanitized
}

/**
 * 프롬프트 내용 검증
 */
export function validatePromptContent(content: string, maxLength: number = 10000): { valid: boolean; message?: string; sanitized?: string } {
  if (!content || typeof content !== 'string') {
    return { valid: false, message: '프롬프트 내용은 필수입니다' }
  }

  if (content.trim().length === 0) {
    return { valid: false, message: '프롬프트 내용이 비어있습니다' }
  }

  if (content.length > maxLength) {
    return { valid: false, message: `프롬프트 내용은 ${maxLength}자를 초과할 수 없습니다` }
  }

  // XSS 방지를 위한 sanitization
  const sanitized = sanitizeString(content, { maxLength, allowHtml: false })

  return { valid: true, sanitized }
}

/**
 * 회원가입 입력 검증 미들웨어
 */
export function validateRegisterInput(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, name } = req.body

    // 이메일 검증
    if (!email || !validateEmail(email)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: '유효한 이메일 주소를 입력해주세요'
        }
      } as ErrorResponse)
    }

    // 비밀번호 검증
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: passwordValidation.message || '비밀번호가 유효하지 않습니다'
        }
      } as ErrorResponse)
    }

    // 이름 검증 (선택)
    if (name && typeof name === 'string') {
      const sanitizedName = sanitizeString(name, { maxLength: 100 })
      req.body.name = sanitizedName
    }

    // 이메일 sanitization
    req.body.email = validator.normalizeEmail(email.trim().toLowerCase())

    next()
  } catch (error) {
    next(error)
  }
}

/**
 * 로그인 입력 검증 미들웨어
 */
export function validateLoginInput(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CREDENTIALS',
          message: '이메일과 비밀번호는 필수입니다'
        }
      } as ErrorResponse)
    }

    // 이메일 정규화
    req.body.email = validator.normalizeEmail(email.trim().toLowerCase())

    next()
  } catch (error) {
    next(error)
  }
}

/**
 * 프롬프트 생성 입력 검증 미들웨어
 */
export function validatePromptInput(req: Request, res: Response, next: NextFunction) {
  try {
    const { content, category, title } = req.body

    // 카테고리 검증
    const validCategories = ['text', 'image', 'video', 'engineering']
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CATEGORY',
          message: `유효하지 않은 카테고리입니다. 허용된 값: ${validCategories.join(', ')}`
        }
      } as ErrorResponse)
    }

    // 프롬프트 내용 검증
    if (content) {
      const contentValidation = validatePromptContent(content, 10000)
      if (!contentValidation.valid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PROMPT_CONTENT',
            message: contentValidation.message || '프롬프트 내용이 유효하지 않습니다'
          }
        } as ErrorResponse)
      }
      // Sanitized 값으로 교체
      req.body.content = contentValidation.sanitized
    }

    // 제목 검증 (선택)
    if (title && typeof title === 'string') {
      const sanitizedTitle = sanitizeString(title, { maxLength: 200 })
      req.body.title = sanitizedTitle
    }

    next()
  } catch (error) {
    next(error)
  }
}

/**
 * 템플릿 생성 입력 검증 미들웨어
 */
export function validateTemplateInput(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, content, category } = req.body

    // 이름 검증
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TEMPLATE_NAME',
          message: '템플릿 이름은 필수입니다'
        }
      } as ErrorResponse)
    }

    const sanitizedName = sanitizeString(name, { maxLength: 200 })
    req.body.name = sanitizedName

    // 내용 검증
    if (content) {
      const contentValidation = validatePromptContent(content, 5000)
      if (!contentValidation.valid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TEMPLATE_CONTENT',
            message: contentValidation.message || '템플릿 내용이 유효하지 않습니다'
          }
        } as ErrorResponse)
      }
      req.body.content = contentValidation.sanitized
    }

    // 카테고리 검증
    if (category) {
      const validCategories = ['text', 'image', 'video', 'engineering']
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CATEGORY',
            message: `유효하지 않은 카테고리입니다. 허용된 값: ${validCategories.join(', ')}`
          }
        } as ErrorResponse)
      }
    }

    next()
  } catch (error) {
    next(error)
  }
}

/**
 * 일반적인 문자열 입력 검증 미들웨어
 */
export function validateStringInput(fieldName: string, options: { required?: boolean; maxLength?: number } = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const value = req.body[fieldName]

      if (options.required && (!value || typeof value !== 'string' || value.trim().length === 0)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FIELD',
            message: `${fieldName}은(는) 필수입니다`
          }
        } as ErrorResponse)
      }

      if (value && typeof value === 'string') {
        const sanitized = sanitizeString(value, { maxLength: options.maxLength || 1000 })
        req.body[fieldName] = sanitized
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

