// 전역 에러 핸들러 미들웨어
import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { ValidationError } from './validation'

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
 * 에러 코드 상수
 */
export const ERROR_CODES = {
  // 인증/권한 에러
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  
  // 검증 에러
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // 리소스 에러
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  
  // 데이터베이스 에러
  DATABASE_ERROR: 'DATABASE_ERROR',
  UNIQUE_CONSTRAINT: 'UNIQUE_CONSTRAINT',
  
  // 서버 에러
  INTERNAL_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const

/**
 * Prisma 에러를 표준 에러 형식으로 변환
 */
function handlePrismaError(error: any): { code: string; message: string; statusCode: number } {
  // Prisma Client 에러
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return {
          code: ERROR_CODES.UNIQUE_CONSTRAINT,
          message: '이미 존재하는 데이터입니다',
          statusCode: 409,
        }
      case 'P2025':
        return {
          code: ERROR_CODES.NOT_FOUND,
          message: '요청한 리소스를 찾을 수 없습니다',
          statusCode: 404,
        }
      case 'P2003':
        return {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: '관련된 데이터가 존재하지 않습니다',
          statusCode: 400,
        }
      default:
        return {
          code: ERROR_CODES.DATABASE_ERROR,
          message: '데이터베이스 오류가 발생했습니다',
          statusCode: 500,
        }
    }
  }

  // Prisma Validation 에러
  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: '입력 데이터가 유효하지 않습니다',
      statusCode: 400,
    }
  }

  // Prisma 초기화 에러
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      code: ERROR_CODES.DATABASE_ERROR,
      message: '데이터베이스 연결에 실패했습니다',
      statusCode: 503,
    }
  }

  return {
    code: ERROR_CODES.DATABASE_ERROR,
    message: '데이터베이스 오류가 발생했습니다',
    statusCode: 500,
  }
}

/**
 * JWT 에러 처리
 */
function handleJWTError(error: any): { code: string; message: string; statusCode: number } {
  if (error.name === 'JsonWebTokenError') {
    return {
      code: ERROR_CODES.UNAUTHORIZED,
      message: '유효하지 않은 토큰입니다',
      statusCode: 401,
    }
  }

  if (error.name === 'TokenExpiredError') {
    return {
      code: ERROR_CODES.UNAUTHORIZED,
      message: '토큰이 만료되었습니다',
      statusCode: 401,
    }
  }

  return {
    code: ERROR_CODES.UNAUTHORIZED,
    message: '인증에 실패했습니다',
    statusCode: 401,
  }
}

/**
 * 에러 로깅
 */
function logError(error: any, req: Request) {
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  const errorInfo = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    error: {
      name: error.name,
      message: error.message,
      stack: isDevelopment ? error.stack : undefined,
    },
  }

  // 개발 환경에서는 콘솔에 상세 정보 출력
  if (isDevelopment) {
    console.error('❌ 에러 발생:', errorInfo)
  } else {
    // 프로덕션 환경에서는 간단한 로그만 출력
    console.error(`[${errorInfo.timestamp}] ${errorInfo.method} ${errorInfo.path} - ${error.message}`)
  }

  // TODO: 외부 로깅 서비스 (Sentry 등)에 전송
  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(error, {
  //     extra: errorInfo
  //   })
  // }
}

/**
 * 전역 에러 핸들러 미들웨어
 */
export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // 이미 응답이 전송된 경우 Express 기본 에러 핸들러에 위임
  if (res.headersSent) {
    return next(error)
  }

  // 에러 로깅
  logError(error, req)

  const isDevelopment = process.env.NODE_ENV === 'development'

  // ValidationError 처리
  if (error instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: isDevelopment ? error.details : undefined,
      },
    } as ErrorResponse)
  }

  // Prisma 에러 처리
  if (error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientValidationError ||
      error instanceof Prisma.PrismaClientInitializationError) {
    const prismaError = handlePrismaError(error)
    return res.status(prismaError.statusCode).json({
      success: false,
      error: {
        code: prismaError.code,
        message: prismaError.message,
        details: isDevelopment ? { prismaCode: (error as any).code } : undefined,
      },
    } as ErrorResponse)
  }

  // JWT 에러 처리
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    const jwtError = handleJWTError(error)
    return res.status(jwtError.statusCode).json({
      success: false,
      error: {
        code: jwtError.code,
        message: jwtError.message,
      },
    } as ErrorResponse)
  }

  // HTTP 상태 코드가 있는 에러 (이미 처리된 에러)
  if (error.statusCode || error.status) {
    const statusCode = error.statusCode || error.status
    return res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || ERROR_CODES.INTERNAL_ERROR,
        message: error.message || '요청 처리 중 오류가 발생했습니다',
        details: isDevelopment ? error.details : undefined,
      },
    } as ErrorResponse)
  }

  // 알 수 없는 에러 (프로덕션에서는 상세 정보 숨김)
  const statusCode = 500
  const message = isDevelopment
    ? error.message || '내부 서버 오류가 발생했습니다'
    : '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'

  return res.status(statusCode).json({
    success: false,
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message,
      details: isDevelopment
        ? {
            stack: error.stack,
            name: error.name,
          }
        : undefined,
    },
  } as ErrorResponse)
}

/**
 * 404 에러 핸들러 (라우트를 찾을 수 없을 때)
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  res.status(404).json({
    success: false,
    error: {
      code: ERROR_CODES.NOT_FOUND,
      message: `요청한 경로를 찾을 수 없습니다: ${req.method} ${req.path}`,
    },
  } as ErrorResponse)
}

