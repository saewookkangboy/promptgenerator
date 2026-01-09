// 데이터 암호화 유틸리티
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16

/**
 * 암호화 키 생성 (환경 변수에서 가져옴)
 * 프로덕션 환경에서는 반드시 환경 변수로 설정해야 함
 * 데이터 손실을 방지하기 위해 런타임 키 생성은 지원하지 않음
 */
function getEncryptionKey(): Buffer {
  // 환경 변수에서 키를 가져옴
  const keyString = process.env.ENCRYPTION_KEY
  
  if (!keyString) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY 환경 변수가 설정되지 않았습니다. 프로덕션 환경에서는 필수입니다.')
    }
    // 개발 환경에서도 환경 변수 필수로 강제 (데이터 손실 방지)
    throw new Error('ENCRYPTION_KEY 환경 변수가 설정되지 않았습니다. 개발 환경에서도 반드시 설정해야 합니다.')
  }
  
  // hex 형식의 키를 Buffer로 변환
  try {
    return Buffer.from(keyString, 'hex')
  } catch (error) {
    throw new Error('ENCRYPTION_KEY가 올바른 hex 형식이 아닙니다.')
  }
}

/**
 * 데이터 암호화
 */
export function encrypt(text: string): string {
  try {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const tag = cipher.getAuthTag()

    // IV + Tag + 암호화된 데이터를 결합
    return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted
  } catch (error) {
    console.error('암호화 오류:', error)
    throw new Error('데이터 암호화에 실패했습니다')
  }
}

/**
 * 데이터 복호화
 */
export function decrypt(encryptedText: string): string {
  try {
    const key = getEncryptionKey()
    const parts = encryptedText.split(':')
    
    if (parts.length !== 3) {
      throw new Error('잘못된 암호화 형식입니다')
    }

    const iv = Buffer.from(parts[0], 'hex')
    const tag = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    console.error('복호화 오류:', error)
    throw new Error('데이터 복호화에 실패했습니다')
  }
}

/**
 * 해시 생성 (비밀번호 등에 사용)
 */
export function hash(text: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(SALT_LENGTH).toString('hex')
  const hash = crypto.pbkdf2Sync(text, generatedSalt, 10000, 64, 'sha512').toString('hex')
  return { hash, salt: generatedSalt }
}

/**
 * 해시 검증
 */
export function verifyHash(text: string, hash: string, salt: string): boolean {
  const newHash = crypto.pbkdf2Sync(text, salt, 10000, 64, 'sha512').toString('hex')
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(newHash))
}

/**
 * 안전한 랜덤 문자열 생성
 */
export function generateSecureRandom(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url')
}
