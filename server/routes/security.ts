/**
 * 보안 관련 API 라우트
 * 
 * 보안 이벤트 조회, 통계, IP 관리 등의 엔드포인트를 제공합니다.
 */

import { Router, Request, Response } from 'express'
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth'
import {
  getSecurityEvents,
  getAttackStatistics,
  getSuspiciousIPs,
  SecurityEventType,
  SecuritySeverity,
} from '../utils/securityLogger'
import { ipFilter } from '../middleware/security'
import { log } from '../utils/logger'

const router = Router()

/**
 * 보안 이벤트 조회 (Admin 전용)
 * GET /api/admin/security/events
 */
router.get(
  '/events',
  authenticateToken,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        type,
        ip,
        severity,
        limit = '100',
        timeWindowMs,
      } = req.query

      const events = getSecurityEvents({
        type: type as SecurityEventType | undefined,
        ip: ip as string | undefined,
        severity: severity as SecuritySeverity | undefined,
        limit: parseInt(limit as string, 10),
        timeWindowMs: timeWindowMs
          ? parseInt(timeWindowMs as string, 10)
          : undefined,
      })

      res.json({
        success: true,
        events,
        count: events.length,
      })
    } catch (error: any) {
      log.error({ type: 'security_api', error }, '보안 이벤트 조회 실패')
      res.status(500).json({
        success: false,
        error: '보안 이벤트 조회에 실패했습니다',
      })
    }
  }
)

/**
 * 공격 시도 통계 (Admin 전용)
 * GET /api/admin/security/statistics
 */
router.get(
  '/statistics',
  authenticateToken,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const timeWindowMs = req.query.timeWindowMs
        ? parseInt(req.query.timeWindowMs as string, 10)
        : 3600000 // 기본 1시간

      const statistics = getAttackStatistics(timeWindowMs)
      const suspiciousIPs = getSuspiciousIPs(10)

      res.json({
        success: true,
        statistics,
        suspiciousIPs,
        timeWindow: {
          ms: timeWindowMs,
          hours: Math.round(timeWindowMs / 3600000),
        },
      })
    } catch (error: any) {
      log.error({ type: 'security_api', error }, '보안 통계 조회 실패')
      res.status(500).json({
        success: false,
        error: '보안 통계 조회에 실패했습니다',
      })
    }
  }
)

/**
 * 의심스러운 IP 목록 조회 (Admin 전용)
 * GET /api/admin/security/suspicious-ips
 */
router.get(
  '/suspicious-ips',
  authenticateToken,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 10

      const suspiciousIPs = getSuspiciousIPs(limit)

      res.json({
        success: true,
        suspiciousIPs,
        count: suspiciousIPs.length,
      })
    } catch (error: any) {
      log.error({ type: 'security_api', error }, '의심스러운 IP 조회 실패')
      res.status(500).json({
        success: false,
        error: '의심스러운 IP 조회에 실패했습니다',
      })
    }
  }
)

/**
 * IP 블랙리스트에 추가 (Admin 전용)
 * POST /api/admin/security/blacklist
 */
router.post(
  '/blacklist',
  authenticateToken,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { ip, reason } = req.body

      if (!ip || typeof ip !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'IP 주소가 필요합니다',
        })
      }

      ipFilter.addToBlacklist(ip, reason || 'manual_block')

      log.security('ip_blacklisted', {
        ip,
        reason: reason || 'manual_block',
        adminId: req.user?.id,
        adminEmail: req.user?.email,
      })

      res.json({
        success: true,
        message: 'IP가 블랙리스트에 추가되었습니다',
        ip,
      })
    } catch (error: any) {
      log.error({ type: 'security_api', error }, 'IP 블랙리스트 추가 실패')
      res.status(500).json({
        success: false,
        error: 'IP 블랙리스트 추가에 실패했습니다',
      })
    }
  }
)

/**
 * 보안 설정 조회 (Admin 전용)
 * GET /api/admin/security/settings
 */
router.get(
  '/settings',
  authenticateToken,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const settings = {
        ipWhitelist: {
          enabled: process.env.ENABLE_IP_WHITELIST === 'true',
          ips: process.env.IP_WHITELIST?.split(',').map(ip => ip.trim()) || [],
        },
        rateLimiting: {
          windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
          maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
        },
        securityHeaders: {
          enabled: true,
        },
        csrfProtection: {
          enabled: true,
          tokenTTL: 3600000, // 1시간
        },
        injectionPrevention: {
          enabled: true,
        },
        requestTimeout: {
          enabled: true,
          timeoutMs: 30000, // 30초
        },
      }

      res.json({
        success: true,
        settings,
      })
    } catch (error: any) {
      log.error({ type: 'security_api', error }, '보안 설정 조회 실패')
      res.status(500).json({
        success: false,
        error: '보안 설정 조회에 실패했습니다',
      })
    }
  }
)

export default router
