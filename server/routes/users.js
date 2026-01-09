"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// 사용자 관리 API 라우트
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../db/prisma");
const auth_1 = require("../middleware/auth");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
// 모든 라우트는 인증 필요
router.use(auth_1.authenticateToken);
// 사용자 프로필 조회
router.get('/profile', async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                name: true,
                tier: true,
                subscriptionStatus: true,
                subscriptionStartedAt: true,
                subscriptionEndsAt: true,
                createdAt: true,
                lastLoginAt: true,
            },
        });
        if (!user) {
            res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
            return;
        }
        // 통계 정보 추가
        const [promptCount, workspaceCount] = await Promise.all([
            prisma_1.prisma.prompt.count({
                where: {
                    userId: req.user.id,
                    deletedAt: null,
                },
            }),
            prisma_1.prisma.workspace.count({
                where: {
                    ownerId: req.user.id,
                },
            }),
        ]);
        res.json({
            user: {
                ...user,
                stats: {
                    promptCount,
                    workspaceCount,
                },
            },
        });
    }
    catch (error) {
        console.error('프로필 조회 오류:', error);
        res.status(500).json({ error: '프로필을 가져오는데 실패했습니다' });
    }
});
// 사용자 프로필 수정
router.patch('/profile', async (req, res) => {
    try {
        const { name } = req.body;
        const user = await prisma_1.prisma.user.update({
            where: { id: req.user.id },
            data: {
                name: name || undefined,
            },
            select: {
                id: true,
                email: true,
                name: true,
                tier: true,
                updatedAt: true,
            },
        });
        res.json({
            message: '프로필이 업데이트되었습니다',
            user,
        });
    }
    catch (error) {
        console.error('프로필 수정 오류:', error);
        res.status(500).json({ error: '프로필 수정에 실패했습니다' });
    }
});
// API 키 생성/조회
router.get('/api-key', async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                apiKey: true,
                tier: true,
            },
        });
        if (!user) {
            res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
            return;
        }
        // BASIC 이상만 API 키 사용 가능
        if (user.tier === 'FREE') {
            res.status(403).json({
                error: 'API 키는 BASIC 이상 Tier에서 사용할 수 있습니다',
                requiredTier: 'BASIC',
            });
            return;
        }
        res.json({
            apiKey: user.apiKey || null,
            hasApiKey: !!user.apiKey,
        });
    }
    catch (error) {
        console.error('API 키 조회 오류:', error);
        res.status(500).json({ error: 'API 키를 가져오는데 실패했습니다' });
    }
});
// API 키 생성
router.post('/api-key', (0, auth_1.requireTier)('BASIC', 'PROFESSIONAL', 'ENTERPRISE'), async (req, res) => {
    try {
        // 강력한 API 키 생성 (64자 랜덤 문자열)
        const randomBytes = crypto_1.default.randomBytes(32);
        const apiKey = `pk_${randomBytes.toString('base64url')}`;
        // API 키 해시 생성 (검증용)
        const apiKeyHash = await bcryptjs_1.default.hash(apiKey, 12);
        // 기존 API 키가 있으면 삭제 (하나만 유지)
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: { apiKey: true },
        });
        // API 키 저장 (해시 저장 - 향후 검증 시 사용)
        // 현재는 원본도 저장하지만, 향후 마이그레이션으로 해시만 저장하도록 개선 가능
        await prisma_1.prisma.user.update({
            where: { id: req.user.id },
            data: {
                apiKey, // 현재는 원본 저장 (향후 해시로 변경)
                // apiKeyHash: apiKeyHash, // 스키마에 필드 추가 필요
            },
        });
        // 보안 이벤트: API 키 생성
        logger_1.log.security('api_key_created', {
            userId: req.user.id,
            email: req.user.email,
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });
        res.json({
            message: 'API 키가 생성되었습니다',
            apiKey,
            warning: '이 키는 한 번만 표시됩니다. 안전한 곳에 저장하세요.',
            expiresAt: null, // 향후 만료 정책 추가 가능
        });
    }
    catch (error) {
        console.error('API 키 생성 오류:', error);
        res.status(500).json({ error: 'API 키 생성에 실패했습니다' });
    }
});
// API 키 삭제
router.delete('/api-key', (0, auth_1.requireTier)('BASIC', 'PROFESSIONAL', 'ENTERPRISE'), async (req, res) => {
    try {
        await prisma_1.prisma.user.update({
            where: { id: req.user.id },
            data: { apiKey: null },
        });
        // 보안 이벤트: API 키 삭제
        logger_1.log.security('api_key_deleted', {
            userId: req.user.id,
            email: req.user.email,
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });
        res.json({ message: 'API 키가 삭제되었습니다' });
    }
    catch (error) {
        console.error('API 키 삭제 오류:', error);
        res.status(500).json({ error: 'API 키 삭제에 실패했습니다' });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map