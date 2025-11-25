"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 사용자 관리 API 라우트
const express_1 = require("express");
const prisma_1 = require("../db/prisma");
const auth_1 = require("../middleware/auth");
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
// 사용자 계정 삭제
router.delete('/profile', async (req, res) => {
    try {
        await prisma_1.prisma.user.delete({
            where: { id: req.user.id },
        });
        res.json({ message: '계정이 삭제되었습니다' });
    }
    catch (error) {
        console.error('계정 삭제 오류:', error);
        if (error.code === 'P2025') {
            res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
            return;
        }
        res.status(500).json({ error: '계정 삭제에 실패했습니다' });
    }
});
// 사용자 개요 및 프롬프트 이력
router.get('/overview', async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                name: true,
                tier: true,
                subscriptionStatus: true,
                createdAt: true,
            },
        });
        if (!user) {
            res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
            return;
        }
        const [promptCount, workspaceCount, recentPrompts] = await Promise.all([
            prisma_1.prisma.prompt.count({
                where: { userId: req.user.id, deletedAt: null },
            }),
            prisma_1.prisma.workspace.count({
                where: { ownerId: req.user.id },
            }),
            prisma_1.prisma.prompt.findMany({
                where: { userId: req.user.id, deletedAt: null },
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: {
                    id: true,
                    title: true,
                    category: true,
                    createdAt: true,
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
            recentPrompts,
        });
    }
    catch (error) {
        console.error('사용자 개요 조회 오류:', error);
        res.status(500).json({ error: '사용자 개요를 가져오는데 실패했습니다' });
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
        // API 키 생성 (간단한 랜덤 문자열)
        const apiKey = `pk_${Buffer.from(`${req.user.id}-${Date.now()}`).toString('base64').replace(/[^a-zA-Z0-9]/g, '')}`;
        await prisma_1.prisma.user.update({
            where: { id: req.user.id },
            data: { apiKey },
        });
        res.json({
            message: 'API 키가 생성되었습니다',
            apiKey,
            warning: '이 키는 한 번만 표시됩니다. 안전한 곳에 저장하세요.',
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
        res.json({ message: 'API 키가 삭제되었습니다' });
    }
    catch (error) {
        console.error('API 키 삭제 오류:', error);
        res.status(500).json({ error: 'API 키 삭제에 실패했습니다' });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map