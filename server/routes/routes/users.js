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
// 사용자 관리 API 라우트
var express_1 = require("express");
var prisma_1 = require("../db/prisma");
var auth_1 = require("../middleware/auth");
var router = (0, express_1.Router)();
// 모든 라우트는 인증 필요
router.use(auth_1.authenticateToken);
// 사용자 프로필 조회
router.get('/profile', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user, _a, promptCount, workspaceCount, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                return [4 /*yield*/, prisma_1.prisma.user.findUnique({
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
                                userId: req.user.id,
                                deletedAt: null,
                            },
                        }),
                        prisma_1.prisma.workspace.count({
                            where: {
                                ownerId: req.user.id,
                            },
                        }),
                    ])];
            case 2:
                _a = _b.sent(), promptCount = _a[0], workspaceCount = _a[1];
                res.json({
                    user: __assign(__assign({}, user), { stats: {
                            promptCount: promptCount,
                            workspaceCount: workspaceCount,
                        } }),
                });
                return [3 /*break*/, 4];
            case 3:
                error_1 = _b.sent();
                console.error('프로필 조회 오류:', error_1);
                res.status(500).json({ error: '프로필을 가져오는데 실패했습니다' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 사용자 프로필 수정
router.patch('/profile', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var name_1, user, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                name_1 = req.body.name;
                return [4 /*yield*/, prisma_1.prisma.user.update({
                        where: { id: req.user.id },
                        data: {
                            name: name_1 || undefined,
                        },
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            tier: true,
                            updatedAt: true,
                        },
                    })];
            case 1:
                user = _a.sent();
                res.json({
                    message: '프로필이 업데이트되었습니다',
                    user: user,
                });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error('프로필 수정 오류:', error_2);
                res.status(500).json({ error: '프로필 수정에 실패했습니다' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// API 키 생성/조회
router.get('/api-key', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, prisma_1.prisma.user.findUnique({
                        where: { id: req.user.id },
                        select: {
                            apiKey: true,
                            tier: true,
                        },
                    })];
            case 1:
                user = _a.sent();
                if (!user) {
                    res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
                    return [2 /*return*/];
                }
                // BASIC 이상만 API 키 사용 가능
                if (user.tier === 'FREE') {
                    res.status(403).json({
                        error: 'API 키는 BASIC 이상 Tier에서 사용할 수 있습니다',
                        requiredTier: 'BASIC',
                    });
                    return [2 /*return*/];
                }
                res.json({
                    apiKey: user.apiKey || null,
                    hasApiKey: !!user.apiKey,
                });
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                console.error('API 키 조회 오류:', error_3);
                res.status(500).json({ error: 'API 키를 가져오는데 실패했습니다' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// API 키 생성
router.post('/api-key', (0, auth_1.requireTier)('BASIC', 'PROFESSIONAL', 'ENTERPRISE'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var apiKey, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                apiKey = "pk_".concat(Buffer.from("".concat(req.user.id, "-").concat(Date.now())).toString('base64').replace(/[^a-zA-Z0-9]/g, ''));
                return [4 /*yield*/, prisma_1.prisma.user.update({
                        where: { id: req.user.id },
                        data: { apiKey: apiKey },
                    })];
            case 1:
                _a.sent();
                res.json({
                    message: 'API 키가 생성되었습니다',
                    apiKey: apiKey,
                    warning: '이 키는 한 번만 표시됩니다. 안전한 곳에 저장하세요.',
                });
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                console.error('API 키 생성 오류:', error_4);
                res.status(500).json({ error: 'API 키 생성에 실패했습니다' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// API 키 삭제
router.delete('/api-key', (0, auth_1.requireTier)('BASIC', 'PROFESSIONAL', 'ENTERPRISE'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, prisma_1.prisma.user.update({
                        where: { id: req.user.id },
                        data: { apiKey: null },
                    })];
            case 1:
                _a.sent();
                res.json({ message: 'API 키가 삭제되었습니다' });
                return [3 /*break*/, 3];
            case 2:
                error_5 = _a.sent();
                console.error('API 키 삭제 오류:', error_5);
                res.status(500).json({ error: 'API 키 삭제에 실패했습니다' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
