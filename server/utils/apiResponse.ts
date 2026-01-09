// 표준 API 응답 유틸리티
import { Response } from 'express'

/**
 * 성공 응답 형식
 */
export interface SuccessResponse<T = any> {
  success: true
  data: T
  message?: string
  meta?: {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
  }
}

/**
 * 에러 응답 형식
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
 * 성공 응답 전송
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): Response {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(message && { message }),
  } as SuccessResponse<T>)
}

/**
 * 페이지네이션 포함 성공 응답
 */
export function sendPaginatedSuccess<T>(
  res: Response,
  data: T[],
  meta: {
    page: number
    limit: number
    total: number
  },
  message?: string
): Response {
  const totalPages = Math.ceil(meta.total / meta.limit)
  
  return res.status(200).json({
    success: true,
    data,
    meta: {
      page: meta.page,
      limit: meta.limit,
      total: meta.total,
      totalPages,
    },
    ...(message && { message }),
  } as SuccessResponse<T[]>)
}

/**
 * 에러 응답 전송
 */
export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode: number = 400,
  details?: any
): Response {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  } as ErrorResponse)
}

/**
 * 생성 성공 응답 (201)
 */
export function sendCreated<T>(
  res: Response,
  data: T,
  message?: string
): Response {
  return sendSuccess(res, data, message, 201)
}

/**
 * 업데이트 성공 응답 (200)
 */
export function sendUpdated<T>(
  res: Response,
  data: T,
  message?: string
): Response {
  return sendSuccess(res, data, message, 200)
}

/**
 * 삭제 성공 응답 (200)
 */
export function sendDeleted(
  res: Response,
  message: string = '삭제되었습니다'
): Response {
  return res.status(200).json({
    success: true,
    message,
  })
}

/**
 * 인증 필요 응답 (401)
 */
export function sendUnauthorized(
  res: Response,
  message: string = '인증이 필요합니다'
): Response {
  return sendError(res, 'UNAUTHORIZED', message, 401)
}

/**
 * 권한 없음 응답 (403)
 */
export function sendForbidden(
  res: Response,
  message: string = '권한이 없습니다'
): Response {
  return sendError(res, 'FORBIDDEN', message, 403)
}

/**
 * 리소스 없음 응답 (404)
 */
export function sendNotFound(
  res: Response,
  message: string = '요청한 리소스를 찾을 수 없습니다'
): Response {
  return sendError(res, 'NOT_FOUND', message, 404)
}

/**
 * 검증 에러 응답 (400)
 */
export function sendValidationError(
  res: Response,
  message: string,
  details?: any
): Response {
  return sendError(res, 'VALIDATION_ERROR', message, 400, details)
}

/**
 * 충돌 에러 응답 (409)
 */
export function sendConflict(
  res: Response,
  message: string = '이미 존재하는 리소스입니다'
): Response {
  return sendError(res, 'CONFLICT', message, 409)
}

/**
 * 서버 에러 응답 (500)
 */
export function sendInternalError(
  res: Response,
  message: string = '서버 오류가 발생했습니다',
  details?: any
): Response {
  return sendError(res, 'INTERNAL_SERVER_ERROR', message, 500, details)
}
