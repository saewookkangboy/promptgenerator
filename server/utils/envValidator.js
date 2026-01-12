// 환경 변수 검증 유틸리티
// 서버 시작 시 필수 환경 변수를 검증

require('dotenv').config()

/**
 * 환경 변수 검증 결과
 */
class EnvValidationResult {
  constructor() {
    this.errors = []
    this.warnings = []
    this.isValid = true
  }

  addError(message) {
    this.errors.push(message)
    this.isValid = false
  }

  addWarning(message) {
    this.warnings.push(message)
  }
}

/**
 * 필수 환경 변수 검증
 */
function validateRequiredEnvVars() {
  const result = new EnvValidationResult()
  
  const requiredVars = {
    DATABASE_URL: {
      validate: (value) => {
        if (!value) return '설정되지 않음'
        if (!value.startsWith('postgresql://') && !value.startsWith('postgres://')) {
          return '잘못된 형식 (postgresql:// 또는 postgres://로 시작해야 함)'
        }
        return null
      }
    },
    JWT_SECRET: {
      validate: (value) => {
        if (!value) return '설정되지 않음'
        if (value.length < 32) {
          result.addWarning('JWT_SECRET은 32자 이상 권장 (현재: ' + value.length + '자)')
        }
        return null
      }
    },
    ADMIN_EMAIL: {
      validate: (value) => {
        if (!value) return '설정되지 않음'
        const emails = value.split(',').map(e => e.trim())
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        const invalidEmails = emails.filter(email => !emailRegex.test(email))
        if (invalidEmails.length > 0) {
          return '잘못된 이메일 형식: ' + invalidEmails.join(', ')
        }
        return null
      }
    },
    PORT: {
      validate: (value) => {
        if (!value) return '설정되지 않음'
        const port = parseInt(value, 10)
        if (isNaN(port) || port < 1 || port > 65535) {
          return '유효한 포트 번호가 아님 (1-65535)'
        }
        return null
      }
    },
    GEMINI_API_KEY: {
      validate: (value) => {
        if (!value) return '설정되지 않음'
        return null
      }
    }
  }

  // 필수 변수 검증
  for (const [varName, config] of Object.entries(requiredVars)) {
    const value = process.env[varName]
    const error = config.validate(value)
    if (error) {
      result.addError(`${varName}: ${error}`)
    }
  }

  return result
}

/**
 * 환경 변수 검증 실행
 * @param {boolean} exitOnError - 에러 발생 시 프로세스 종료 여부
 * @returns {EnvValidationResult}
 */
function validateEnvironment(exitOnError = true) {
  const result = validateRequiredEnvVars()

  if (result.errors.length > 0) {
    console.error('\n❌ 환경 변수 검증 실패:')
    result.errors.forEach(error => {
      console.error(`  - ${error}`)
    })
    console.error('\n필수 환경 변수를 설정한 후 다시 시도하세요.')
    console.error('참고: .env.example 파일을 참고하여 .env 파일을 생성하세요.\n')
    
    if (exitOnError) {
      process.exit(1)
    }
  }

  if (result.warnings.length > 0) {
    console.warn('\n⚠️  환경 변수 경고:')
    result.warnings.forEach(warning => {
      console.warn(`  - ${warning}`)
    })
    console.warn('')
  }

  if (result.isValid && result.warnings.length === 0) {
    console.log('✅ 환경 변수 검증 완료\n')
  }

  return result
}

module.exports = {
  validateEnvironment,
  validateRequiredEnvVars,
  EnvValidationResult
}

