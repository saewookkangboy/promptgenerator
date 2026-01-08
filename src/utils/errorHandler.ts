/**
 * 템플릿 관련 에러 처리 유틸리티
 */

/**
 * 템플릿 전용 에러 클래스
 */
export class TemplateError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'TemplateError'
    Object.setPrototypeOf(this, TemplateError.prototype)
  }
}

/**
 * 네트워크 에러인지 확인
 */
function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('서버에 연결') ||
      message.includes('failed to fetch') ||
      message.includes('networkerror')
    )
  }
  return false
}

/**
 * 인증 에러인지 확인
 */
function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('401') ||
      message.includes('인증') ||
      message.includes('로그인') ||
      message.includes('unauthorized') ||
      message.includes('authentication')
    )
  }
  return false
}

/**
 * 권한 에러인지 확인
 */
function isPermissionError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('403') ||
      message.includes('권한') ||
      message.includes('forbidden') ||
      message.includes('permission')
    )
  }
  return false
}

/**
 * 찾을 수 없음 에러인지 확인
 */
function isNotFoundError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('404') ||
      message.includes('찾을 수 없') ||
      message.includes('not found')
    )
  }
  return false
}

/**
 * 템플릿 에러를 사용자 친화적인 메시지로 변환
 */
export function handleTemplateError(error: unknown): string {
  // TemplateError인 경우 직접 메시지 반환
  if (error instanceof TemplateError) {
    return error.message
  }
  
  // 네트워크 에러
  if (isNetworkError(error)) {
    return '서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.'
  }
  
  // 인증 에러
  if (isAuthError(error)) {
    return '인증이 필요합니다. 로그인해주세요.'
  }
  
  // 권한 에러
  if (isPermissionError(error)) {
    return '이 템플릿을 사용할 권한이 없습니다.'
  }
  
  // 찾을 수 없음 에러
  if (isNotFoundError(error)) {
    return '템플릿을 찾을 수 없습니다.'
  }
  
  // 일반 에러
  if (error instanceof Error) {
    return error.message || '알 수 없는 오류가 발생했습니다.'
  }
  
  // 알 수 없는 에러
  return '알 수 없는 오류가 발생했습니다.'
}

/**
 * 에러 코드 추출
 */
export function getErrorCode(error: unknown): string {
  if (error instanceof TemplateError) {
    return error.code
  }
  
  if (isNetworkError(error)) {
    return 'NETWORK_ERROR'
  }
  
  if (isAuthError(error)) {
    return 'AUTH_ERROR'
  }
  
  if (isPermissionError(error)) {
    return 'PERMISSION_ERROR'
  }
  
  if (isNotFoundError(error)) {
    return 'NOT_FOUND'
  }
  
  return 'UNKNOWN_ERROR'
}

/**
 * HTTP 상태 코드에서 에러 생성
 */
export function createErrorFromStatusCode(
  statusCode: number,
  message?: string
): TemplateError {
  const defaultMessages: Record<number, string> = {
    400: '잘못된 요청입니다.',
    401: '인증이 필요합니다.',
    403: '권한이 없습니다.',
    404: '템플릿을 찾을 수 없습니다.',
    500: '서버 오류가 발생했습니다.',
    503: '서비스를 일시적으로 사용할 수 없습니다.',
  }
  
  return new TemplateError(
    message || defaultMessages[statusCode] || '알 수 없는 오류가 발생했습니다.',
    `HTTP_${statusCode}`,
    statusCode
  )
}
