// Swagger/OpenAPI 설정
const swaggerJsdoc = require('swagger-jsdoc')

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '프롬프트 생성기 API',
      version: '1.0.0',
      description: '텍스트, 이미지, 동영상 프롬프트 생성 및 프롬프트 엔지니어링을 위한 RESTful API',
      contact: {
        name: 'API Support',
        email: 'support@allrounder.im',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3001',
        description: '개발 서버',
      },
      {
        url: 'https://api.allrounder.im',
        description: '프로덕션 서버',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT 토큰을 사용한 인증. 형식: Bearer {token}',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'UNAUTHORIZED',
                },
                message: {
                  type: 'string',
                  example: '인증이 필요합니다',
                },
                details: {
                  type: 'object',
                  description: '개발 환경에서만 포함되는 상세 정보',
                },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            name: {
              type: 'string',
              nullable: true,
              example: '홍길동',
            },
            tier: {
              type: 'string',
              enum: ['FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE'],
              example: 'FREE',
            },
            subscriptionStatus: {
              type: 'string',
              enum: ['ACTIVE', 'INACTIVE', 'CANCELLED'],
              example: 'ACTIVE',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Prompt: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            title: {
              type: 'string',
              nullable: true,
            },
            content: {
              type: 'string',
            },
            category: {
              type: 'string',
              enum: ['text', 'image', 'video', 'engineering'],
            },
            model: {
              type: 'string',
              nullable: true,
            },
            userId: {
              type: 'string',
              format: 'uuid',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Auth',
        description: '인증 관련 API',
      },
      {
        name: 'Users',
        description: '사용자 관리 API',
      },
      {
        name: 'Prompts',
        description: '프롬프트 관리 API',
      },
      {
        name: 'Templates',
        description: '템플릿 관리 API',
      },
      {
        name: 'Admin',
        description: '관리자 API',
      },
      {
        name: 'Guides',
        description: '프롬프트 가이드 API',
      },
      {
        name: 'AI Services',
        description: 'AI 서비스 정보 API',
      },
    ],
  },
  apis: [
    './server/routes/*.ts',
    './server/routes/*.js',
    './server/index.js',
  ],
}

const swaggerSpec = swaggerJsdoc(options)

module.exports = swaggerSpec
