// 역할 기반 접근 제어 (RBAC) 미들웨어
import { Request, Response, NextFunction } from 'express'
import { AuthRequest } from './auth'
import { prisma } from '../db/prisma'
import { log } from '../utils/logger'

/**
 * 권한 타입
 */
export enum Permission {
  // 읽기 권한
  READ = 'read',
  // 쓰기 권한
  WRITE = 'write',
  // 삭제 권한
  DELETE = 'delete',
  // 관리 권한
  ADMIN = 'admin',
}

/**
 * 리소스 타입
 */
export enum ResourceType {
  PROMPT = 'prompt',
  TEMPLATE = 'template',
  USER = 'user',
  WORKSPACE = 'workspace',
  ADMIN = 'admin',
}

/**
 * 권한 확인 결과
 */
interface PermissionCheckResult {
  allowed: boolean
  reason?: string
}

/**
 * 리소스 소유자 확인
 */
async function checkResourceOwner(
  userId: string,
  resourceType: ResourceType,
  resourceId: string
): Promise<boolean> {
  try {
    switch (resourceType) {
      case ResourceType.PROMPT: {
        const prompt = await prisma.prompt.findUnique({
          where: { id: resourceId },
          select: { userId: true },
        })
        return prompt?.userId === userId
      }

      case ResourceType.TEMPLATE: {
        const template = await prisma.template.findUnique({
          where: { id: resourceId },
          select: { authorId: true },
        })
        return template?.authorId === userId
      }

      case ResourceType.WORKSPACE: {
        const workspace = await prisma.workspace.findUnique({
          where: { id: resourceId },
          select: { ownerId: true },
        })
        return workspace?.ownerId === userId
      }

      default:
        return false
    }
  } catch (error) {
    log.error({ type: 'rbac', error }, '리소스 소유자 확인 실패')
    return false
  }
}

/**
 * 워크스페이스 멤버 권한 확인
 */
async function checkWorkspaceMember(
  userId: string,
  workspaceId: string,
  requiredPermission: Permission
): Promise<PermissionCheckResult> {
  try {
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      select: {
        role: true,
      },
    })

    if (!membership) {
      return { allowed: false, reason: '워크스페이스 멤버가 아닙니다' }
    }

    // 역할별 권한 확인
    const rolePermissions: Record<string, Permission[]> = {
      OWNER: [Permission.READ, Permission.WRITE, Permission.DELETE, Permission.ADMIN],
      ADMIN: [Permission.READ, Permission.WRITE, Permission.DELETE],
      MEMBER: [Permission.READ, Permission.WRITE],
      VIEWER: [Permission.READ],
    }

    const permissions = rolePermissions[membership.role] || []
    const hasPermission = permissions.includes(requiredPermission)

    return {
      allowed: hasPermission,
      reason: hasPermission ? undefined : `${membership.role} 역할은 ${requiredPermission} 권한이 없습니다`,
    }
  } catch (error) {
    log.error({ type: 'rbac', error }, '워크스페이스 멤버 권한 확인 실패')
    return { allowed: false, reason: '권한 확인 중 오류가 발생했습니다' }
  }
}

/**
 * 리소스 기반 권한 확인 미들웨어
 */
export function requireResourcePermission(
  resourceType: ResourceType,
  permission: Permission,
  resourceIdParam: string = 'id'
) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: '인증이 필요합니다' })
        return
      }

      const resourceId = req.params[resourceIdParam]

      if (!resourceId) {
        res.status(400).json({ error: '리소스 ID가 필요합니다' })
        return
      }

      // Admin 권한 확인
      const adminEmails = process.env.ADMIN_EMAIL?.split(',').map(e => e.trim()) || []
      const isAdmin = adminEmails.includes(req.user.email)

      if (isAdmin && permission !== Permission.ADMIN) {
        // Admin은 모든 권한 보유
        return next()
      }

      // 리소스 소유자 확인
      const isOwner = await checkResourceOwner(req.user.id, resourceType, resourceId)

      if (isOwner) {
        // 소유자는 읽기/쓰기/삭제 권한 보유
        if ([Permission.READ, Permission.WRITE, Permission.DELETE].includes(permission)) {
          return next()
        }
      }

      // 워크스페이스 멤버 권한 확인 (워크스페이스 리소스인 경우)
      if (resourceType === ResourceType.PROMPT || resourceType === ResourceType.TEMPLATE) {
        // 리소스의 워크스페이스 확인
        let workspaceId: string | null = null

        if (resourceType === ResourceType.PROMPT) {
          const prompt = await prisma.prompt.findUnique({
            where: { id: resourceId },
            select: { workspaceId: true },
          })
          workspaceId = prompt?.workspaceId || null
        } else if (resourceType === ResourceType.TEMPLATE) {
          // 템플릿은 워크스페이스와 직접 연결되지 않을 수 있음
          // 필요시 구현
        }

        if (workspaceId) {
          const workspaceCheck = await checkWorkspaceMember(req.user.id, workspaceId, permission)
          if (workspaceCheck.allowed) {
            return next()
          }
        }
      }

      // 권한 거부
      log.security('permission_denied', {
        reason: 'resource_permission_denied',
        userId: req.user.id,
        email: req.user.email,
        resourceType,
        resourceId,
        permission,
        ip: req.ip,
        path: req.path,
      })

      res.status(403).json({
        error: '이 리소스에 대한 권한이 없습니다',
        resourceType,
        requiredPermission: permission,
      })
    } catch (error: any) {
      log.error({ type: 'rbac', error }, '권한 확인 중 오류 발생')
      res.status(500).json({ error: '권한 확인 중 오류가 발생했습니다' })
    }
  }
}

/**
 * 워크스페이스 권한 확인 미들웨어
 */
export function requireWorkspacePermission(permission: Permission, workspaceIdParam: string = 'workspaceId') {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: '인증이 필요합니다' })
        return
      }

      const workspaceId = req.params[workspaceIdParam] || req.body[workspaceIdParam]

      if (!workspaceId) {
        res.status(400).json({ error: '워크스페이스 ID가 필요합니다' })
        return
      }

      const checkResult = await checkWorkspaceMember(req.user.id, workspaceId, permission)

      if (!checkResult.allowed) {
        log.security('permission_denied', {
          reason: 'workspace_permission_denied',
          userId: req.user.id,
          email: req.user.email,
          workspaceId,
          permission,
          detail: checkResult.reason,
          ip: req.ip,
          path: req.path,
        })

        res.status(403).json({
          error: checkResult.reason || '워크스페이스 권한이 없습니다',
          requiredPermission: permission,
        })
        return
      }

      next()
    } catch (error: any) {
      log.error({ type: 'rbac', error }, '워크스페이스 권한 확인 중 오류 발생')
      res.status(500).json({ error: '권한 확인 중 오류가 발생했습니다' })
    }
  }
}

/**
 * Admin 권한 세분화 미들웨어
 */
export function requireAdminPermission(permission: 'read' | 'write' | 'delete' | 'admin') {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: '인증이 필요합니다' })
        return
      }

      // Admin 이메일 확인
      const adminEmails = process.env.ADMIN_EMAIL?.split(',').map(e => e.trim()) || []
      const isAdmin = adminEmails.includes(req.user.email)

      if (!isAdmin) {
        log.security('permission_denied', {
          reason: 'admin_permission_denied',
          userId: req.user.id,
          email: req.user.email,
          requiredPermission: permission,
          ip: req.ip,
          path: req.path,
        })

        res.status(403).json({
          error: 'Admin 권한이 필요합니다',
          requiredPermission: permission,
        })
        return
      }

      // Admin 권한 세분화 (향후 구현)
      // 현재는 모든 Admin이 모든 권한 보유
      // 필요시 역할 기반으로 세분화 가능

      next()
    } catch (error: any) {
      log.error({ type: 'rbac', error }, 'Admin 권한 확인 중 오류 발생')
      res.status(500).json({ error: '권한 확인 중 오류가 발생했습니다' })
    }
  }
}
