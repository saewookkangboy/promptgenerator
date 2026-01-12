/**
 * 보안 로깅 시스템
 * 
 * 보안 이벤트를 추적하고 알림을 제공합니다.
 */

import { Request } from 'express'
import { log } from './logger'
import { getClientIp } from '../middleware/security'

/**
 * 보안 이벤트 타입
 */
export enum SecurityEventType {
  // 인증 관련
  AUTHENTICATION_SUCCESS = 'authentication_success',
  AUTHENTICATION_FAILURE = 'authentication_failure',
  TOKEN_EXPIRED = 'token_expired',
  TOKEN_INVALID = 'token_invalid',
  
  // 권한 관련
  PERMISSION_DENIED = 'permission_denied',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  
  // 공격 시도
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  XSS_ATTEMPT = 'xss_attempt',
  CSRF_ATTEMPT = 'csrf_attempt',
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  
  // IP 관련
  IP_BLOCKED = 'ip_blocked',
  IP_WHITELISTED = 'ip_whitelisted',
  IP_BLACKLISTED = 'ip_blacklisted',
  
  // 데이터 접근
  SENSITIVE_DATA_ACCESS = 'sensitive_data_access',
  DATA_EXPORT = 'data_export',
  
  // 시스템 이벤트
  CONFIGURATION_CHANGE = 'configuration_change',
  SECURITY_SETTING_CHANGE = 'security_setting_change',
}

/**
 * 보안 이벤트 심각도
 */
export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * 보안 이벤트 인터페이스
 */
export interface SecurityEvent {
  type: SecurityEventType
  severity: SecuritySeverity
  timestamp: string
  ip: string
  userId?: string
  email?: string
  path?: string
  method?: string
  userAgent?: string
  details?: Record<string, any>
  requestId?: string
}

/**
 * 보안 이벤트 저장소 (메모리 기반, 프로덕션에서는 DB 사용 권장)
 */
class SecurityEventStore {
  private events: SecurityEvent[] = []
  private readonly MAX_EVENTS = 10000

  add(event: SecurityEvent) {
    this.events.push(event)
    
    // 최대 이벤트 수 제한
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS)
    }
  }

  getRecentEvents(limit: number = 100): SecurityEvent[] {
    return this.events.slice(-limit).reverse()
  }

  getEventsByType(type: SecurityEventType, limit: number = 100): SecurityEvent[] {
    return this.events
      .filter(e => e.type === type)
      .slice(-limit)
      .reverse()
  }

  getEventsByIp(ip: string, limit: number = 100): SecurityEvent[] {
    return this.events
      .filter(e => e.ip === ip)
      .slice(-limit)
      .reverse()
  }

  getEventsBySeverity(severity: SecuritySeverity, limit: number = 100): SecurityEvent[] {
    return this.events
      .filter(e => e.severity === severity)
      .slice(-limit)
      .reverse()
  }

  getEventCountByType(type: SecurityEventType, timeWindowMs: number = 3600000): number {
    const cutoff = Date.now() - timeWindowMs
    return this.events.filter(e => 
      e.type === type && 
      new Date(e.timestamp).getTime() > cutoff
    ).length
  }
}

const eventStore = new SecurityEventStore()

/**
 * 보안 이벤트 로깅
 */
export function logSecurityEvent(
  type: SecurityEventType,
  severity: SecuritySeverity,
  req: Request,
  details?: Record<string, any>
) {
  const event: SecurityEvent = {
    type,
    severity,
    timestamp: new Date().toISOString(),
    ip: getClientIp(req),
    path: req.path,
    method: req.method,
    userAgent: req.get('user-agent'),
    requestId: (req as any).requestId,
    details,
  }

  // 사용자 정보 추가 (있는 경우)
  if ((req as any).user) {
    event.userId = (req as any).user.id
    event.email = (req as any).user.email
  }

  // 이벤트 저장
  eventStore.add(event)

  // 로그 레벨 결정
  const logLevel = getLogLevel(severity)
  const logMessage = `[Security] ${type}: ${event.ip} - ${req.path}`

  // Pino 로거로 로깅
  switch (logLevel) {
    case 'fatal':
      log.fatal(event, logMessage)
      break
    case 'error':
      log.error(event, logMessage)
      break
    case 'warn':
      log.warn(event, logMessage)
      break
    case 'info':
      log.info(event, logMessage)
      break
    default:
      log.debug(event, logMessage)
  }

  // 심각한 이벤트는 추가 알림 (향후 구현)
  if (severity === SecuritySeverity.CRITICAL || severity === SecuritySeverity.HIGH) {
    // TODO: 외부 알림 서비스에 전송 (Slack, Email, SMS 등)
    notifySecurityEvent(event)
  }

  return event
}

/**
 * 심각도에 따른 로그 레벨 결정
 */
function getLogLevel(severity: SecuritySeverity): 'fatal' | 'error' | 'warn' | 'info' | 'debug' {
  switch (severity) {
    case SecuritySeverity.CRITICAL:
      return 'fatal'
    case SecuritySeverity.HIGH:
      return 'error'
    case SecuritySeverity.MEDIUM:
      return 'warn'
    case SecuritySeverity.LOW:
      return 'info'
    default:
      return 'debug'
  }
}

/**
 * 보안 이벤트 알림 (향후 구현)
 */
function notifySecurityEvent(event: SecurityEvent) {
  // TODO: 외부 알림 서비스 통합
  // - Slack 웹훅
  // - 이메일 알림
  // - SMS 알림
  // - PagerDuty 등
  
  if (process.env.SECURITY_ALERT_WEBHOOK) {
    // 웹훅 URL이 설정된 경우 알림 전송
    // 예: axios.post(process.env.SECURITY_ALERT_WEBHOOK, event)
  }
}

/**
 * 보안 이벤트 조회 API
 */
export function getSecurityEvents(options: {
  type?: SecurityEventType
  ip?: string
  severity?: SecuritySeverity
  limit?: number
  timeWindowMs?: number
}): SecurityEvent[] {
  let events: SecurityEvent[]

  if (options.type) {
    events = eventStore.getEventsByType(options.type, options.limit || 100)
  } else if (options.ip) {
    events = eventStore.getEventsByIp(options.ip, options.limit || 100)
  } else if (options.severity) {
    events = eventStore.getEventsBySeverity(options.severity, options.limit || 100)
  } else {
    events = eventStore.getRecentEvents(options.limit || 100)
  }

  // 시간 윈도우 필터링
  if (options.timeWindowMs) {
    const cutoff = Date.now() - options.timeWindowMs
    events = events.filter(e => new Date(e.timestamp).getTime() > cutoff)
  }

  return events
}

/**
 * 공격 시도 통계
 */
export function getAttackStatistics(timeWindowMs: number = 3600000): {
  sqlInjection: number
  xss: number
  csrf: number
  bruteForce: number
  rateLimit: number
  total: number
} {
  return {
    sqlInjection: eventStore.getEventCountByType(SecurityEventType.SQL_INJECTION_ATTEMPT, timeWindowMs),
    xss: eventStore.getEventCountByType(SecurityEventType.XSS_ATTEMPT, timeWindowMs),
    csrf: eventStore.getEventCountByType(SecurityEventType.CSRF_ATTEMPT, timeWindowMs),
    bruteForce: eventStore.getEventCountByType(SecurityEventType.BRUTE_FORCE_ATTEMPT, timeWindowMs),
    rateLimit: eventStore.getEventCountByType(SecurityEventType.RATE_LIMIT_EXCEEDED, timeWindowMs),
    total: eventStore.getRecentEvents(10000).filter(e => 
      new Date(e.timestamp).getTime() > Date.now() - timeWindowMs
    ).length,
  }
}

/**
 * IP별 의심스러운 활동 통계
 */
export function getSuspiciousIPs(limit: number = 10): Array<{
  ip: string
  eventCount: number
  lastEvent: string
  eventTypes: string[]
}> {
  const ipStats = new Map<string, {
    count: number
    lastEvent: Date
    types: Set<string>
  }>()

  const recentEvents = eventStore.getRecentEvents(1000)
  
  for (const event of recentEvents) {
    const stats = ipStats.get(event.ip) || {
      count: 0,
      lastEvent: new Date(event.timestamp),
      types: new Set<string>(),
    }

    stats.count++
    stats.types.add(event.type)
    if (new Date(event.timestamp) > stats.lastEvent) {
      stats.lastEvent = new Date(event.timestamp)
    }

    ipStats.set(event.ip, stats)
  }

  return Array.from(ipStats.entries())
    .map(([ip, stats]) => ({
      ip,
      eventCount: stats.count,
      lastEvent: stats.lastEvent.toISOString(),
      eventTypes: Array.from(stats.types),
    }))
    .sort((a, b) => b.eventCount - a.eventCount)
    .slice(0, limit)
}

export { eventStore }
