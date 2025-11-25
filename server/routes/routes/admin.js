"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// Admin 관리 API 라우트
var express_1 = require("express");
var prisma_1 = require("../db/prisma");
var auth_1 = require("../middleware/auth");
var router = (0, express_1.Router)();
// 모든 라우트는 Admin 권한 필요
router.use(auth_1.authenticateToken);
router.use(auth_1.requireAdmin);
// 감사 로그 기록 헬퍼
function logAdminAction(adminUserId, action, resourceType, resourceId, details, req) {
    return __awaiter(this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, prisma_1.prisma.adminAuditLog.create({
                            data: {
                                adminUserId: adminUserId,
                                action: action,
                                resourceType: resourceType,
                                resourceId: resourceId,
                                details: details,
                                ipAddress: req.ip || req.socket.remoteAddress || null,
                                userAgent: req.headers['user-agent'] || null,
                            },
                        })];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    console.error('감사 로그 기록 실패:', error_1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// 전체 통계 조회
router.get('/stats', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, totalUsers, activeUsers, totalPrompts, totalWorkspaces, tierDistribution, recentUsers, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                return [4 /*yield*/, Promise.all([
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
                    ])];
            case 1:
                _a = _b.sent(), totalUsers = _a[0], activeUsers = _a[1], totalPrompts = _a[2], totalWorkspaces = _a[3], tierDistribution = _a[4], recentUsers = _a[5];
                return [4 /*yield*/, logAdminAction(req.user.id, 'VIEW_STATS', null, null, {}, req)];
            case 2:
                _b.sent();
                res.json({
                    overview: {
                        totalUsers: totalUsers,
                        activeUsers: activeUsers,
                        totalPrompts: totalPrompts,
                        totalWorkspaces: totalWorkspaces,
                    },
                    tierDistribution: tierDistribution.map(function (t) { return ({
                        tier: t.tier,
                        count: t._count.id,
                    }); }),
                    recentUsers: recentUsers,
                });
                return [3 /*break*/, 4];
            case 3:
                error_2 = _b.sent();
                console.error('통계 조회 오류:', error_2);
                res.status(500).json({ error: '통계를 가져오는데 실패했습니다' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 사용자 목록 조회
router.get('/users', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, page, _c, limit, tier, status_1, search, where, skip, _d, users, total, error_3;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 3, , 4]);
                _a = req.query, _b = _a.page, page = _b === void 0 ? '1' : _b, _c = _a.limit, limit = _c === void 0 ? '20' : _c, tier = _a.tier, status_1 = _a.status, search = _a.search;
                where = {};
                if (tier) {
                    where.tier = tier;
                }
                if (status_1) {
                    where.subscriptionStatus = status_1;
                }
                if (search) {
                    where.OR = [
                        { email: { contains: search, mode: 'insensitive' } },
                        { name: { contains: search, mode: 'insensitive' } },
                    ];
                }
                skip = (parseInt(page) - 1) * parseInt(limit);
                return [4 /*yield*/, Promise.all([
                        prisma_1.prisma.user.findMany({
                            where: where,
                            skip: skip,
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
                        prisma_1.prisma.user.count({ where: where }),
                    ])];
            case 1:
                _d = _e.sent(), users = _d[0], total = _d[1];
                return [4 /*yield*/, logAdminAction(req.user.id, 'VIEW_USERS', null, null, { filters: { tier: tier, status: status_1, search: search } }, req)];
            case 2:
                _e.sent();
                res.json({
                    users: users,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: total,
                        totalPages: Math.ceil(total / parseInt(limit)),
                    },
                });
                return [3 /*break*/, 4];
            case 3:
                error_3 = _e.sent();
                console.error('사용자 목록 조회 오류:', error_3);
                res.status(500).json({ error: '사용자 목록을 가져오는데 실패했습니다' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 사용자 상세 조회
router.get('/users/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user, _a, promptCount, workspaceCount, error_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 4, , 5]);
                return [4 /*yield*/, prisma_1.prisma.user.findUnique({
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
                    })];
            case 1:
                user = _b.sent();
                if (!user) {
                    res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, Promise.all([
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
                    ])];
            case 2:
                _a = _b.sent(), promptCount = _a[0], workspaceCount = _a[1];
                return [4 /*yield*/, logAdminAction(req.user.id, 'VIEW_USER', 'USER', user.id, {}, req)];
            case 3:
                _b.sent();
                res.json({
                    user: __assign(__assign({}, user), { stats: {
                            promptCount: promptCount,
                            workspaceCount: workspaceCount,
                        } }),
                });
                return [3 /*break*/, 5];
            case 4:
                error_4 = _b.sent();
                console.error('사용자 상세 조회 오류:', error_4);
                res.status(500).json({ error: '사용자 정보를 가져오는데 실패했습니다' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// 사용자 Tier 변경
router.patch('/users/:id/tier', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var tier, user, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                tier = req.body.tier;
                if (!tier || !['FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE'].includes(tier)) {
                    res.status(400).json({ error: '유효한 Tier를 입력해주세요' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, prisma_1.prisma.user.update({
                        where: { id: req.params.id },
                        data: { tier: tier },
                        select: {
                            id: true,
                            email: true,
                            tier: true,
                        },
                    })];
            case 1:
                user = _a.sent();
                return [4 /*yield*/, logAdminAction(req.user.id, 'UPDATE_USER_TIER', 'USER', user.id, { oldTier: 'unknown', newTier: tier }, req)];
            case 2:
                _a.sent();
                res.json({
                    message: '사용자 Tier가 변경되었습니다',
                    user: user,
                });
                return [3 /*break*/, 4];
            case 3:
                error_5 = _a.sent();
                console.error('Tier 변경 오류:', error_5);
                res.status(500).json({ error: 'Tier 변경에 실패했습니다' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 사용자 구독 상태 변경
router.patch('/users/:id/subscription', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, status_2, endsAt, updateData, user, error_6;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                _a = req.body, status_2 = _a.status, endsAt = _a.endsAt;
                if (!status_2 || !['ACTIVE', 'CANCELLED', 'EXPIRED', 'TRIAL'].includes(status_2)) {
                    res.status(400).json({ error: '유효한 구독 상태를 입력해주세요' });
                    return [2 /*return*/];
                }
                updateData = {
                    subscriptionStatus: status_2,
                };
                if (endsAt) {
                    updateData.subscriptionEndsAt = new Date(endsAt);
                }
                return [4 /*yield*/, prisma_1.prisma.user.update({
                        where: { id: req.params.id },
                        data: updateData,
                        select: {
                            id: true,
                            email: true,
                            subscriptionStatus: true,
                            subscriptionEndsAt: true,
                        },
                    })];
            case 1:
                user = _b.sent();
                return [4 /*yield*/, logAdminAction(req.user.id, 'UPDATE_USER_SUBSCRIPTION', 'USER', user.id, { status: status_2, endsAt: endsAt }, req)];
            case 2:
                _b.sent();
                res.json({
                    message: '구독 상태가 변경되었습니다',
                    user: user,
                });
                return [3 /*break*/, 4];
            case 3:
                error_6 = _b.sent();
                console.error('구독 상태 변경 오류:', error_6);
                res.status(500).json({ error: '구독 상태 변경에 실패했습니다' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 프롬프트 목록 조회 (Admin)
router.get('/prompts', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, page, _c, limit, category, userId, search, where, skip, _d, prompts, total, error_7;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 3, , 4]);
                _a = req.query, _b = _a.page, page = _b === void 0 ? '1' : _b, _c = _a.limit, limit = _c === void 0 ? '20' : _c, category = _a.category, userId = _a.userId, search = _a.search;
                where = {
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
                skip = (parseInt(page) - 1) * parseInt(limit);
                return [4 /*yield*/, Promise.all([
                        prisma_1.prisma.prompt.findMany({
                            where: where,
                            skip: skip,
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
                        prisma_1.prisma.prompt.count({ where: where }),
                    ])];
            case 1:
                _d = _e.sent(), prompts = _d[0], total = _d[1];
                return [4 /*yield*/, logAdminAction(req.user.id, 'VIEW_PROMPTS', null, null, { filters: { category: category, userId: userId, search: search } }, req)];
            case 2:
                _e.sent();
                res.json({
                    prompts: prompts,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: total,
                        totalPages: Math.ceil(total / parseInt(limit)),
                    },
                });
                return [3 /*break*/, 4];
            case 3:
                error_7 = _e.sent();
                console.error('프롬프트 목록 조회 오류:', error_7);
                res.status(500).json({ error: '프롬프트 목록을 가져오는데 실패했습니다' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 감사 로그 조회
router.get('/audit-logs', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, page, _c, limit, action, resourceType, where, skip, _d, logs, total, error_8;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 2, , 3]);
                _a = req.query, _b = _a.page, page = _b === void 0 ? '1' : _b, _c = _a.limit, limit = _c === void 0 ? '50' : _c, action = _a.action, resourceType = _a.resourceType;
                where = {};
                if (action) {
                    where.action = action;
                }
                if (resourceType) {
                    where.resourceType = resourceType;
                }
                skip = (parseInt(page) - 1) * parseInt(limit);
                return [4 /*yield*/, Promise.all([
                        prisma_1.prisma.adminAuditLog.findMany({
                            where: where,
                            skip: skip,
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
                        prisma_1.prisma.adminAuditLog.count({ where: where }),
                    ])];
            case 1:
                _d = _e.sent(), logs = _d[0], total = _d[1];
                res.json({
                    logs: logs,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: total,
                        totalPages: Math.ceil(total / parseInt(limit)),
                    },
                });
                return [3 /*break*/, 3];
            case 2:
                error_8 = _e.sent();
                console.error('감사 로그 조회 오류:', error_8);
                res.status(500).json({ error: '감사 로그를 가져오는데 실패했습니다' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
