"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Admin 관리 API 라우트
const express_1 = require("express");
const prisma_1 = require("../db/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// 모든 라우트는 Admin 권한 필요
router.use(auth_1.authenticateToken);
router.use(auth_1.requireAdmin);
// 감사 로그 기록 헬퍼
async function logAdminAction(adminUserId, action, resourceType, resourceId, details, req) {
    try {
        await prisma_1.prisma.adminAuditLog.create({
            data: {
                adminUserId,
                action,
                resourceType,
                resourceId,
                details,
                ipAddress: req.ip || req.socket.remoteAddress || null,
                userAgent: req.headers['user-agent'] || null,
            },
        });
    }
    catch (error) {
        console.error('감사 로그 기록 실패:', error);
    }
}
// 전체 통계 조회
router.get('/stats', async (req, res) => {
    try {
        const [totalUsers, activeUsers, totalPrompts, totalWorkspaces, tierDistribution, recentUsers,] = await Promise.all([
            prisma_1.prisma.user.count(),
            prisma_1.prisma.user.count({
                where: {
                    subscriptionStatus: 'ACTIVE',
                },
            }),
            prisma_1.prisma.prompt.count({
                where: { deletedAt: null },
            }),
            prisma_1.prisma.workspace.count(),
            prisma_1.prisma.user.groupBy({
                by: ['tier'],
                _count: {
                    id: true,
                },
            }),
            prisma_1.prisma.user.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    tier: true,
                    createdAt: true,
                },
            }),
        ]);
        await logAdminAction(req.user.id, 'VIEW_STATS', null, null, {}, req);
        res.json({
            overview: {
                totalUsers,
                activeUsers,
                totalPrompts,
                totalWorkspaces,
            },
            tierDistribution: tierDistribution.map((t) => ({
                tier: t.tier,
                count: t._count.id,
            })),
            recentUsers,
        });
    }
    catch (error) {
        console.error('통계 조회 오류:', error);
        res.status(500).json({ error: '통계를 가져오는데 실패했습니다' });
    }
});
// 사용자 목록 조회
router.get('/users', async (req, res) => {
    try {
        const { page = '1', limit = '20', tier, status, search } = req.query;
        const where = {};
        if (tier) {
            where.tier = tier;
        }
        if (status) {
            where.subscriptionStatus = status;
        }
        if (search) {
            where.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
            ];
        }
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [users, total] = await Promise.all([
            prisma_1.prisma.user.findMany({
                where,
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' },
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
            }),
            prisma_1.prisma.user.count({ where }),
        ]);
        await logAdminAction(req.user.id, 'VIEW_USERS', null, null, { filters: { tier, status, search } }, req);
        res.json({
            users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit)),
            },
        });
    }
    catch (error) {
        console.error('사용자 목록 조회 오류:', error);
        res.status(500).json({ error: '사용자 목록을 가져오는데 실패했습니다' });
    }
});
// 사용자 상세 조회
router.get('/users/:id', async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.params.id },
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
        // 사용자 통계
        const [promptCount, workspaceCount] = await Promise.all([
            prisma_1.prisma.prompt.count({
                where: {
                    userId: user.id,
                    deletedAt: null,
                },
            }),
            prisma_1.prisma.workspace.count({
                where: {
                    ownerId: user.id,
                },
            }),
        ]);
        await logAdminAction(req.user.id, 'VIEW_USER', 'USER', user.id, {}, req);
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
        console.error('사용자 상세 조회 오류:', error);
        res.status(500).json({ error: '사용자 정보를 가져오는데 실패했습니다' });
    }
});
// 사용자 Tier 변경
router.patch('/users/:id/tier', async (req, res) => {
    try {
        const { tier } = req.body;
        if (!tier || !['FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE'].includes(tier)) {
            res.status(400).json({ error: '유효한 Tier를 입력해주세요' });
            return;
        }
        const user = await prisma_1.prisma.user.update({
            where: { id: req.params.id },
            data: { tier },
            select: {
                id: true,
                email: true,
                tier: true,
            },
        });
        await logAdminAction(req.user.id, 'UPDATE_USER_TIER', 'USER', user.id, { oldTier: 'unknown', newTier: tier }, req);
        res.json({
            message: '사용자 Tier가 변경되었습니다',
            user,
        });
    }
    catch (error) {
        console.error('Tier 변경 오류:', error);
        res.status(500).json({ error: 'Tier 변경에 실패했습니다' });
    }
});
// 사용자 구독 상태 변경
router.patch('/users/:id/subscription', async (req, res) => {
    try {
        const { status, endsAt } = req.body;
        if (!status || !['ACTIVE', 'CANCELLED', 'EXPIRED', 'TRIAL'].includes(status)) {
            res.status(400).json({ error: '유효한 구독 상태를 입력해주세요' });
            return;
        }
        const updateData = {
            subscriptionStatus: status,
        };
        if (endsAt) {
            updateData.subscriptionEndsAt = new Date(endsAt);
        }
        const user = await prisma_1.prisma.user.update({
            where: { id: req.params.id },
            data: updateData,
            select: {
                id: true,
                email: true,
                subscriptionStatus: true,
                subscriptionEndsAt: true,
            },
        });
        await logAdminAction(req.user.id, 'UPDATE_USER_SUBSCRIPTION', 'USER', user.id, { status, endsAt }, req);
        res.json({
            message: '구독 상태가 변경되었습니다',
            user,
        });
    }
    catch (error) {
        console.error('구독 상태 변경 오류:', error);
        res.status(500).json({ error: '구독 상태 변경에 실패했습니다' });
    }
});
// 프롬프트 목록 조회 (Admin)
router.get('/prompts', async (req, res) => {
    try {
        const { page = '1', limit = '20', category, userId, search } = req.query;
        const where = {
            deletedAt: null,
        };
        if (category) {
            where.category = category;
        }
        if (userId) {
            where.userId = userId;
        }
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { content: { contains: search, mode: 'insensitive' } },
            ];
        }
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [prompts, total] = await Promise.all([
            prisma_1.prisma.prompt.findMany({
                where,
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                        },
                    },
                    folder: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            }),
            prisma_1.prisma.prompt.count({ where }),
        ]);
        await logAdminAction(req.user.id, 'VIEW_PROMPTS', null, null, { filters: { category, userId, search } }, req);
        res.json({
            prompts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit)),
            },
        });
    }
    catch (error) {
        console.error('프롬프트 목록 조회 오류:', error);
        res.status(500).json({ error: '프롬프트 목록을 가져오는데 실패했습니다' });
    }
});
// 감사 로그 조회
router.get('/audit-logs', async (req, res) => {
    try {
        const { page = '1', limit = '50', action, resourceType } = req.query;
        const where = {};
        if (action) {
            where.action = action;
        }
        if (resourceType) {
            where.resourceType = resourceType;
        }
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [logs, total] = await Promise.all([
            prisma_1.prisma.adminAuditLog.findMany({
                where,
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' },
                include: {
                    adminUser: {
                        select: {
                            id: true,
                            email: true,
                        },
                    },
                },
            }),
            prisma_1.prisma.adminAuditLog.count({ where }),
        ]);
        res.json({
            logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit)),
            },
        });
    }
    catch (error) {
        console.error('감사 로그 조회 오류:', error);
        res.status(500).json({ error: '감사 로그를 가져오는데 실패했습니다' });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map