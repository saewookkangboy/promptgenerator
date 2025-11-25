"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// 인증 관련 API 라우트
var express_1 = require("express");
var bcryptjs_1 = __importDefault(require("bcryptjs"));
var jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
var prisma_1 = require("../db/prisma");
var auth_1 = require("../middleware/auth");
var router = (0, express_1.Router)();
// JWT 토큰 생성
function generateToken(userId, email) {
    return jsonwebtoken_1.default.sign({ userId: userId, email: email }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
}
// 회원가입
router.post('/register', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, password, name_1, existingUser, passwordHash, user, token, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 4, , 5]);
                _a = req.body, email = _a.email, password = _a.password, name_1 = _a.name;
                // 입력 검증
                if (!email || !password) {
                    res.status(400).json({ error: '이메일과 비밀번호는 필수입니다' });
                    return [2 /*return*/];
                }
                if (password.length < 8) {
                    res.status(400).json({ error: '비밀번호는 최소 8자 이상이어야 합니다' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, prisma_1.prisma.user.findUnique({
                        where: { email: email },
                    })];
            case 1:
                existingUser = _b.sent();
                if (existingUser) {
                    res.status(409).json({ error: '이미 사용 중인 이메일입니다' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, bcryptjs_1.default.hash(password, 10)
                    // 사용자 생성
                ];
            case 2:
                passwordHash = _b.sent();
                return [4 /*yield*/, prisma_1.prisma.user.create({
                        data: {
                            email: email,
                            passwordHash: passwordHash,
                            name: name_1 || null,
                            tier: 'FREE',
                            subscriptionStatus: 'ACTIVE',
                        },
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            tier: true,
                            createdAt: true,
                        },
                    })
                    // JWT 토큰 생성
                ];
            case 3:
                user = _b.sent();
                token = generateToken(user.id, user.email);
                res.status(201).json({
                    message: '회원가입이 완료되었습니다',
                    user: user,
                    token: token,
                });
                return [3 /*break*/, 5];
            case 4:
                error_1 = _b.sent();
                console.error('회원가입 오류:', error_1);
                res.status(500).json({ error: '회원가입에 실패했습니다' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// 로그인
router.post('/login', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, password, user, isValidPassword, token, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 4, , 5]);
                _a = req.body, email = _a.email, password = _a.password;
                // 입력 검증
                if (!email || !password) {
                    res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, prisma_1.prisma.user.findUnique({
                        where: { email: email },
                    })];
            case 1:
                user = _b.sent();
                if (!user) {
                    res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, bcryptjs_1.default.compare(password, user.passwordHash)];
            case 2:
                isValidPassword = _b.sent();
                if (!isValidPassword) {
                    res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' });
                    return [2 /*return*/];
                }
                // 구독 상태 확인
                if (user.subscriptionStatus !== 'ACTIVE') {
                    res.status(403).json({
                        error: '구독이 만료되었거나 비활성화된 계정입니다',
                        subscriptionStatus: user.subscriptionStatus,
                    });
                    return [2 /*return*/];
                }
                // 마지막 로그인 시간 업데이트
                return [4 /*yield*/, prisma_1.prisma.user.update({
                        where: { id: user.id },
                        data: { lastLoginAt: new Date() },
                    })
                    // JWT 토큰 생성
                ];
            case 3:
                // 마지막 로그인 시간 업데이트
                _b.sent();
                token = generateToken(user.id, user.email);
                res.json({
                    message: '로그인 성공',
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        tier: user.tier,
                    },
                    token: token,
                });
                return [3 /*break*/, 5];
            case 4:
                error_2 = _b.sent();
                console.error('로그인 오류:', error_2);
                res.status(500).json({ error: '로그인에 실패했습니다' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// 현재 사용자 정보 조회
router.get('/me', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
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
                user = _a.sent();
                if (!user) {
                    res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
                    return [2 /*return*/];
                }
                res.json({ user: user });
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                console.error('사용자 정보 조회 오류:', error_3);
                res.status(500).json({ error: '사용자 정보를 가져오는데 실패했습니다' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 토큰 갱신
router.post('/refresh', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var newToken;
    return __generator(this, function (_a) {
        try {
            newToken = generateToken(req.user.id, req.user.email);
            res.json({
                message: '토큰이 갱신되었습니다',
                token: newToken,
            });
        }
        catch (error) {
            console.error('토큰 갱신 오류:', error);
            res.status(500).json({ error: '토큰 갱신에 실패했습니다' });
        }
        return [2 /*return*/];
    });
}); });
// 비밀번호 변경
router.post('/change-password', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, currentPassword, newPassword, user, isValidPassword, newPasswordHash, error_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 5, , 6]);
                _a = req.body, currentPassword = _a.currentPassword, newPassword = _a.newPassword;
                if (!currentPassword || !newPassword) {
                    res.status(400).json({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요' });
                    return [2 /*return*/];
                }
                if (newPassword.length < 8) {
                    res.status(400).json({ error: '새 비밀번호는 최소 8자 이상이어야 합니다' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, prisma_1.prisma.user.findUnique({
                        where: { id: req.user.id },
                    })];
            case 1:
                user = _b.sent();
                if (!user) {
                    res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, bcryptjs_1.default.compare(currentPassword, user.passwordHash)];
            case 2:
                isValidPassword = _b.sent();
                if (!isValidPassword) {
                    res.status(401).json({ error: '현재 비밀번호가 올바르지 않습니다' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, bcryptjs_1.default.hash(newPassword, 10)
                    // 비밀번호 업데이트
                ];
            case 3:
                newPasswordHash = _b.sent();
                // 비밀번호 업데이트
                return [4 /*yield*/, prisma_1.prisma.user.update({
                        where: { id: user.id },
                        data: { passwordHash: newPasswordHash },
                    })];
            case 4:
                // 비밀번호 업데이트
                _b.sent();
                res.json({ message: '비밀번호가 변경되었습니다' });
                return [3 /*break*/, 6];
            case 5:
                error_4 = _b.sent();
                console.error('비밀번호 변경 오류:', error_4);
                res.status(500).json({ error: '비밀번호 변경에 실패했습니다' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
