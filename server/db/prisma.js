"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
// Prisma 클라이언트 초기화
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const globalForPrisma = globalThis;
// 데이터베이스 연결 풀 설정 (보안 및 성능 최적화)
const prismaOptions = {
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
};
exports.prisma = globalForPrisma.prisma ??
    new client_1.PrismaClient(prismaOptions);
// 데이터베이스 연결 이벤트 로깅
exports.prisma.$connect()
    .then(() => {
    logger_1.log.info({ type: 'database', event: 'connected' }, '데이터베이스 연결 성공');
})
    .catch((error) => {
    logger_1.log.error({
        type: 'database',
        event: 'connection_failed',
        error: {
            name: error.name,
            message: error.message,
        }
    }, '데이터베이스 연결 실패');
});
// 데이터베이스 연결 종료 시 정리 (Graceful shutdown)
async function gracefulShutdown(signal) {
    logger_1.log.info({ type: 'database', event: 'disconnecting', signal }, '데이터베이스 연결 종료 시작');
    try {
        await exports.prisma.$disconnect();
        logger_1.log.info({ type: 'database', event: 'disconnected' }, '데이터베이스 연결 종료 완료');
        process.exit(0);
    }
    catch (error) {
        logger_1.log.error({ type: 'database', event: 'disconnect_error', error }, '데이터베이스 연결 종료 실패');
        process.exit(1);
    }
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = exports.prisma;
exports.default = exports.prisma;
//# sourceMappingURL=prisma.js.map