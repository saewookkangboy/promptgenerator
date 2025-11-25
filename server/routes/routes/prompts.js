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
Object.defineProperty(exports, "__esModule", { value: true });
// 프롬프트 관련 API 라우트
var express_1 = require("express");
var prisma_1 = require("../db/prisma");
var auth_1 = require("../middleware/auth");
var router = (0, express_1.Router)();
// 모든 프롬프트 라우트는 인증 필요
router.use(auth_1.authenticateToken);
// 프롬프트 목록 조회
router.get('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, category, folderId, tagId, search, _b, page, _c, limit, where, skip, _d, prompts, total, error_1;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 2, , 3]);
                _a = req.query, category = _a.category, folderId = _a.folderId, tagId = _a.tagId, search = _a.search, _b = _a.page, page = _b === void 0 ? '1' : _b, _c = _a.limit, limit = _c === void 0 ? '20' : _c;
                where = {
                    userId: req.user.id,
                    deletedAt: null,
                };
                if (category) {
                    where.category = category;
                }
                if (folderId) {
                    where.folderId = folderId;
                }
                if (tagId) {
                    where.tags = {
                        some: {
                            tagId: tagId,
                        },
                    };
                }
                if (search) {
                    where.OR = [
                        { title: { contains: search, mode: 'insensitive' } },
                        { content: { contains: search, mode: 'insensitive' } },
                        { inputText: { contains: search, mode: 'insensitive' } },
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
                                folder: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                                tags: {
                                    include: {
                                        tag: true,
                                    },
                                },
                                versions: {
                                    orderBy: { versionNumber: 'desc' },
                                    take: 1,
                                },
                            },
                        }),
                        prisma_1.prisma.prompt.count({ where: where }),
                    ])];
            case 1:
                _d = _e.sent(), prompts = _d[0], total = _d[1];
                res.json({
                    prompts: prompts,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: total,
                        totalPages: Math.ceil(total / parseInt(limit)),
                    },
                });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _e.sent();
                console.error('프롬프트 목록 조회 오류:', error_1);
                res.status(500).json({ error: '프롬프트 목록을 가져오는데 실패했습니다' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 프롬프트 상세 조회
router.get('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var prompt_1, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, prisma_1.prisma.prompt.findFirst({
                        where: {
                            id: req.params.id,
                            userId: req.user.id,
                            deletedAt: null,
                        },
                        include: {
                            folder: true,
                            tags: {
                                include: {
                                    tag: true,
                                },
                            },
                            versions: {
                                orderBy: { versionNumber: 'desc' },
                            },
                            workspace: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    })];
            case 1:
                prompt_1 = _a.sent();
                if (!prompt_1) {
                    res.status(404).json({ error: '프롬프트를 찾을 수 없습니다' });
                    return [2 /*return*/];
                }
                res.json(prompt_1);
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error('프롬프트 조회 오류:', error_2);
                res.status(500).json({ error: '프롬프트를 가져오는데 실패했습니다' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 프롬프트 생성
router.post('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, title, content, category, model, inputText, options, folderId, workspaceId, tagIds, workspace, prompt_2, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 4, , 5]);
                _a = req.body, title = _a.title, content = _a.content, category = _a.category, model = _a.model, inputText = _a.inputText, options = _a.options, folderId = _a.folderId, workspaceId = _a.workspaceId, tagIds = _a.tagIds;
                if (!workspaceId) return [3 /*break*/, 2];
                return [4 /*yield*/, prisma_1.prisma.workspace.findFirst({
                        where: {
                            id: workspaceId,
                            OR: [
                                { ownerId: req.user.id },
                                {
                                    members: {
                                        some: {
                                            userId: req.user.id,
                                        },
                                    },
                                },
                            ],
                        },
                    })];
            case 1:
                workspace = _b.sent();
                if (!workspace) {
                    res.status(403).json({ error: '워크스페이스 접근 권한이 없습니다' });
                    return [2 /*return*/];
                }
                _b.label = 2;
            case 2: return [4 /*yield*/, prisma_1.prisma.prompt.create({
                    data: {
                        title: title,
                        content: content,
                        category: category,
                        model: model,
                        inputText: inputText,
                        options: options || {},
                        folderId: folderId,
                        workspaceId: workspaceId,
                        userId: req.user.id,
                        tags: tagIds
                            ? {
                                create: tagIds.map(function (tagId) { return ({
                                    tag: {
                                        connect: { id: tagId },
                                    },
                                }); }),
                            }
                            : undefined,
                    },
                    include: {
                        folder: true,
                        tags: {
                            include: {
                                tag: true,
                            },
                        },
                    },
                })];
            case 3:
                prompt_2 = _b.sent();
                res.status(201).json(prompt_2);
                return [3 /*break*/, 5];
            case 4:
                error_3 = _b.sent();
                console.error('프롬프트 생성 오류:', error_3);
                res.status(500).json({ error: '프롬프트 생성에 실패했습니다' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// 프롬프트 수정
router.patch('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, title, content, options, folderId, tagIds, existingPrompt_1, prompt_3, error_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 8, , 9]);
                _a = req.body, title = _a.title, content = _a.content, options = _a.options, folderId = _a.folderId, tagIds = _a.tagIds;
                return [4 /*yield*/, prisma_1.prisma.prompt.findFirst({
                        where: {
                            id: req.params.id,
                            userId: req.user.id,
                            deletedAt: null,
                        },
                    })];
            case 1:
                existingPrompt_1 = _b.sent();
                if (!existingPrompt_1) {
                    res.status(404).json({ error: '프롬프트를 찾을 수 없습니다' });
                    return [2 /*return*/];
                }
                if (!(content && content !== existingPrompt_1.content)) return [3 /*break*/, 3];
                return [4 /*yield*/, prisma_1.prisma.promptVersion.create({
                        data: {
                            promptId: existingPrompt_1.id,
                            versionNumber: existingPrompt_1.versionNumber + 1,
                            content: existingPrompt_1.content,
                            options: existingPrompt_1.options,
                            createdById: req.user.id,
                        },
                    })];
            case 2:
                _b.sent();
                _b.label = 3;
            case 3:
                if (!tagIds) return [3 /*break*/, 6];
                return [4 /*yield*/, prisma_1.prisma.promptTagRelation.deleteMany({
                        where: { promptId: existingPrompt_1.id },
                    })];
            case 4:
                _b.sent();
                if (!(tagIds.length > 0)) return [3 /*break*/, 6];
                return [4 /*yield*/, prisma_1.prisma.promptTagRelation.createMany({
                        data: tagIds.map(function (tagId) { return ({
                            promptId: existingPrompt_1.id,
                            tagId: tagId,
                        }); }),
                    })];
            case 5:
                _b.sent();
                _b.label = 6;
            case 6: return [4 /*yield*/, prisma_1.prisma.prompt.update({
                    where: { id: req.params.id },
                    data: {
                        title: title,
                        content: content,
                        options: options,
                        folderId: folderId,
                        versionNumber: content && content !== existingPrompt_1.content
                            ? existingPrompt_1.versionNumber + 1
                            : existingPrompt_1.versionNumber,
                    },
                    include: {
                        folder: true,
                        tags: {
                            include: {
                                tag: true,
                            },
                        },
                        versions: {
                            orderBy: { versionNumber: 'desc' },
                        },
                    },
                })];
            case 7:
                prompt_3 = _b.sent();
                res.json(prompt_3);
                return [3 /*break*/, 9];
            case 8:
                error_4 = _b.sent();
                console.error('프롬프트 수정 오류:', error_4);
                res.status(500).json({ error: '프롬프트 수정에 실패했습니다' });
                return [3 /*break*/, 9];
            case 9: return [2 /*return*/];
        }
    });
}); });
// 프롬프트 삭제 (소프트 삭제)
router.delete('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var prompt_4, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, prisma_1.prisma.prompt.update({
                        where: {
                            id: req.params.id,
                            userId: req.user.id,
                        },
                        data: {
                            deletedAt: new Date(),
                        },
                    })];
            case 1:
                prompt_4 = _a.sent();
                res.json({ message: '프롬프트가 삭제되었습니다', prompt: prompt_4 });
                return [3 /*break*/, 3];
            case 2:
                error_5 = _a.sent();
                console.error('프롬프트 삭제 오류:', error_5);
                res.status(500).json({ error: '프롬프트 삭제에 실패했습니다' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 프롬프트 버전 목록 조회 (Tier 1)
router.get('/:id/versions', (0, auth_1.requireTier)('BASIC', 'PROFESSIONAL', 'ENTERPRISE'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var versions, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, prisma_1.prisma.promptVersion.findMany({
                        where: {
                            promptId: req.params.id,
                            prompt: {
                                userId: req.user.id,
                            },
                        },
                        orderBy: { versionNumber: 'desc' },
                    })];
            case 1:
                versions = _a.sent();
                res.json(versions);
                return [3 /*break*/, 3];
            case 2:
                error_6 = _a.sent();
                console.error('버전 목록 조회 오류:', error_6);
                res.status(500).json({ error: '버전 목록을 가져오는데 실패했습니다' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
