// Prisma 클라이언트 초기화
import { PrismaClient, Prisma } from '@prisma/client'
import { log } from '../utils/logger'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 데이터베이스 연결 풀 설정 (보안 및 성능 최적화)
const prismaOptions: Prisma.PrismaClientOptions = {
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(prismaOptions)

// 데이터베이스 연결 이벤트 로깅
prisma.$connect()
  .then(() => {
    log.info({ type: 'database', event: 'connected' }, '데이터베이스 연결 성공')
  })
  .catch((error) => {
    log.error({ 
      type: 'database', 
      event: 'connection_failed',
      error: {
        name: error.name,
        message: error.message,
      }
    }, '데이터베이스 연결 실패')
  })

// 데이터베이스 연결 종료 시 정리 (Graceful shutdown)
async function gracefulShutdown(signal: string): Promise<void> {
  log.info({ type: 'database', event: 'disconnecting', signal }, '데이터베이스 연결 종료 시작')
  try {
    await prisma.$disconnect()
    log.info({ type: 'database', event: 'disconnected' }, '데이터베이스 연결 종료 완료')
    process.exit(0)
  } catch (error: any) {
    log.error({ type: 'database', event: 'disconnect_error', error }, '데이터베이스 연결 종료 실패')
    process.exit(1)
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma

