// Jest 설정 파일
// 테스트 환경 전역 설정

// 환경 변수 모킹
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'

// 콘솔 에러 억제 (선택적)
// global.console = {
//   ...console,
//   error: jest.fn(),
//   warn: jest.fn(),
// }
