import { describe, test, expect } from 'vitest'

// Test CommonJS build
const cjs = await import('../dist/index.cjs')

describe('fcp-audit-publisher (CommonJS)', () => {
  test('exports validateAuditEvent', () => {
    expect(typeof cjs.validateAuditEvent).toBe('function')
  })

  test('exports publishAuditEvent', () => {
    expect(typeof cjs.publishAuditEvent).toBe('function')
  })

  test('validateAuditEvent returns valid:true for a valid event', () => {
    const event = {
      correlationid: 'abc-123',
      datetime: '2025-12-01T12:51:41.381Z',
      environment: 'prod',
      version: '1.0.0',
      application: 'FCP001',
      component: 'fcp-audit',
      ip: '192.168.1.100',
      audit: {
        entities: [{ entity: 'application', action: 'created', entityid: 'APP-001' }]
      },
      security: null
    }
    const result = cjs.validateAuditEvent(event)
    expect(result.valid).toBe(true)
    expect(result.value).toBeDefined()
  })

  test('validateAuditEvent returns valid:false for an invalid event', () => {
    const result = cjs.validateAuditEvent({ correlationid: 'abc-123' })
    expect(result.valid).toBe(false)
    expect(Array.isArray(result.errors)).toBe(true)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  test('validateAuditEvent returns errors when both audit and security are null', () => {
    const event = {
      correlationid: 'abc-123',
      datetime: '2025-12-01T12:51:41.381Z',
      environment: 'prod',
      version: '1.0.0',
      application: 'FCP001',
      component: 'fcp-audit',
      ip: '192.168.1.100',
      audit: null,
      security: null
    }
    const result = cjs.validateAuditEvent(event)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('at least one of "audit" or "security" must be provided and not null')
  })
})
