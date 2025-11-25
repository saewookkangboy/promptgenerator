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
exports.authenticateToken = authenticateToken;
exports.requireAdmin = requireAdmin;
exports.requireTier = requireTier;
var jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
var prisma_1 = require("../db/prisma");
// JWT 토큰 검증
function authenticateToken(req, res, next) {
    return __awaiter(this, void 0, void 0, function () {
        var authHeader, token, decoded, user, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    authHeader = req.headers['authorization'];
                    token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN
                    ;
                    if (!token) {
                        res.status(401).json({ error: '인증 토큰이 필요합니다' });
                        return [2 /*return*/];
                    }
                    decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
                    return [4 /*yield*/, prisma_1.prisma.user.findUnique({
                            where: { id: decoded.userId },
                            select: {
                                id: true,
                                email: true,
                                tier: true,
                                subscriptionStatus: true,
                            },
                        })];
                case 1:
                    user = _a.sent();
                    if (!user || user.subscriptionStatus !== 'ACTIVE') {
                        res.status(401).json({ error: '유효하지 않은 사용자입니다' });
                        return [2 /*return*/];
                    }
                    req.user = {
                        id: user.id,
                        email: user.email,
                        tier: user.tier,
                    };
                    next();
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    res.status(403).json({ error: '유효하지 않은 토큰입니다' });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Admin 권한 확인
function requireAdmin(req, res, next) {
    return __awaiter(this, void 0, void 0, function () {
        var isAdmin;
        return __generator(this, function (_a) {
            if (!req.user) {
                res.status(401).json({ error: '인증이 필요합니다' });
                return [2 /*return*/];
            }
            isAdmin = req.user.email === process.env.ADMIN_EMAIL;
            if (!isAdmin) {
                res.status(403).json({ error: 'Admin 권한이 필요합니다' });
                return [2 /*return*/];
            }
            next();
            return [2 /*return*/];
        });
    });
}
// Tier 확인 미들웨어
function requireTier() {
    var _this = this;
    var allowedTiers = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        allowedTiers[_i] = arguments[_i];
    }
    return function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (!req.user) {
                res.status(401).json({ error: '인증이 필요합니다' });
                return [2 /*return*/];
            }
            if (!allowedTiers.includes(req.user.tier)) {
                res.status(403).json({
                    error: "\uC774 \uAE30\uB2A5\uC740 ".concat(allowedTiers.join(' 또는 '), " Tier\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4"),
                    requiredTier: allowedTiers,
                    currentTier: req.user.tier,
                });
                return [2 /*return*/];
            }
            next();
            return [2 /*return*/];
        });
    }); };
}
