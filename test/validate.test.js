import { describe, test, expect } from 'vitest'
import { validateAuditEvent } from '../src/validate.js'

const validBase = {
  correlationid: 'abc-123',
  datetime: '2025-12-01T12:51:41.381Z',
  environment: 'prod',
  version: '1.0.0',
  application: 'FCP001',
  component: 'fcp-audit',
  ip: '192.168.1.100'
}

const auditPayload = {
  entities: [{ entity: 'application', action: 'created', entityid: 'APP-001' }]
}

const securityPayload = {
  pmccode: '0706',
  priority: 0,
  details: {}
}

describe('validateAuditEvent', () => {
  describe('valid events', () => {
    test('accepts event with audit only', () => {
      const result = validateAuditEvent({ ...validBase, audit: auditPayload, security: null })
      expect(result.valid).toBe(true)
      expect(result.value).toBeDefined()
    })

    test('accepts event with security only', () => {
      const result = validateAuditEvent({ ...validBase, audit: null, security: securityPayload })
      expect(result.valid).toBe(true)
      expect(result.value).toBeDefined()
    })

    test('accepts event with both audit and security', () => {
      const result = validateAuditEvent({ ...validBase, audit: auditPayload, security: securityPayload })
      expect(result.valid).toBe(true)
      expect(result.value).toBeDefined()
    })

    test('accepts optional user and sessionid fields', () => {
      const result = validateAuditEvent({
        ...validBase,
        user: 'user-123',
        sessionid: 'session-abc',
        audit: auditPayload,
        security: null
      })
      expect(result.valid).toBe(true)
    })

    test('normalises the validated value (applies joi defaults)', () => {
      const result = validateAuditEvent({ ...validBase, audit: auditPayload, security: null })
      expect(result.valid).toBe(true)
      expect(result.value.audit.accounts).toEqual({})
      expect(result.value.audit.details).toEqual({})
    })
  })

  describe('invalid events', () => {
    test('returns valid:false when both audit and security are null', () => {
      const result = validateAuditEvent({ ...validBase, audit: null, security: null })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('at least one of "audit" or "security" must be provided and not null')
    })

    test('returns valid:false when both audit and security are absent', () => {
      const result = validateAuditEvent({ ...validBase })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('at least one of "audit" or "security" must be provided and not null')
    })

    test('returns valid:false when correlationid is missing', () => {
      const { correlationid: _, ...event } = validBase
      const result = validateAuditEvent({ ...event, audit: auditPayload, security: null })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('correlationid'))).toBe(true)
    })

    test('returns valid:false when datetime is missing', () => {
      const { datetime: _, ...event } = validBase
      const result = validateAuditEvent({ ...event, audit: auditPayload, security: null })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('datetime'))).toBe(true)
    })

    test('returns valid:false when application is missing', () => {
      const { application: _, ...event } = validBase
      const result = validateAuditEvent({ ...event, audit: auditPayload, security: null })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('application'))).toBe(true)
    })

    test('returns valid:false when version exceeds max length', () => {
      const result = validateAuditEvent({ ...validBase, version: 'x'.repeat(11), audit: auditPayload, security: null })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('version'))).toBe(true)
    })

    test('returns valid:false when audit has no entities', () => {
      const result = validateAuditEvent({ ...validBase, audit: { entities: [] }, security: null })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('entities'))).toBe(true)
    })

    test('returns multiple errors with abortEarly:false', () => {
      const result = validateAuditEvent({ audit: auditPayload })
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(1)
    })
  })
})
