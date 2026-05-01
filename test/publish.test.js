import { describe, test, expect, vi, beforeEach } from 'vitest'
import { publishAuditEvent } from '../src/publish.js'

const mockSend = vi.hoisted(() => vi.fn().mockResolvedValue({ MessageId: 'msg-001' }))

vi.mock('@aws-sdk/client-sns', () => ({
  SNSClient: vi.fn(function () {
    this.send = mockSend
  }),
  PublishCommand: vi.fn(function (input) {
    Object.assign(this, input)
  })
}))

const { SNSClient, PublishCommand } = await import('@aws-sdk/client-sns')

const baseConfig = {
  sns: { topicArn: 'arn:aws:sns:eu-west-2:000000000000:fcp-audit' },
  aws: { region: 'eu-west-2' }
}

const validEvent = {
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

describe('publishAuditEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSend.mockResolvedValue({ MessageId: 'msg-001' })
  })

  describe('defaults', () => {
    test('applies datetime default when not set in event', async () => {
      const { datetime: _, ...eventWithoutDatetime } = validEvent
      await publishAuditEvent(eventWithoutDatetime, baseConfig)
      const cmdArg = PublishCommand.mock.calls[0][0]
      const msg = JSON.parse(cmdArg.Message)
      expect(msg.datetime).toBeDefined()
      expect(() => new Date(msg.datetime)).not.toThrow()
    })

    test('preserves event datetime when already set', async () => {
      await publishAuditEvent(validEvent, baseConfig)
      const cmdArg = PublishCommand.mock.calls[0][0]
      const msg = JSON.parse(cmdArg.Message)
      expect(msg.datetime).toBe(validEvent.datetime)
    })

    test('applies library default version (1.0.0) when not set in event or config', async () => {
      const { version: _, ...eventWithoutVersion } = validEvent
      await publishAuditEvent(eventWithoutVersion, baseConfig)
      const cmdArg = PublishCommand.mock.calls[0][0]
      const msg = JSON.parse(cmdArg.Message)
      expect(msg.version).toBe('1.0.0')
    })

    test('applies config version when not set in event', async () => {
      const { version: _, ...eventWithoutVersion } = validEvent
      await publishAuditEvent(eventWithoutVersion, { ...baseConfig, version: '2.0' })
      const cmdArg = PublishCommand.mock.calls[0][0]
      const msg = JSON.parse(cmdArg.Message)
      expect(msg.version).toBe('2.0')
    })

    test('event version wins over config version', async () => {
      await publishAuditEvent({ ...validEvent, version: '3.0' }, { ...baseConfig, version: '2.0' })
      const cmdArg = PublishCommand.mock.calls[0][0]
      const msg = JSON.parse(cmdArg.Message)
      expect(msg.version).toBe('3.0')
    })

    test('applies application from config when not set in event', async () => {
      const { application: _, ...eventWithout } = validEvent
      await publishAuditEvent(eventWithout, { ...baseConfig, application: 'DefaultApp' })
      const cmdArg = PublishCommand.mock.calls[0][0]
      const msg = JSON.parse(cmdArg.Message)
      expect(msg.application).toBe('DefaultApp')
    })

    test('event application wins over config application', async () => {
      await publishAuditEvent({ ...validEvent, application: 'MyApp' }, { ...baseConfig, application: 'DefaultApp' })
      const cmdArg = PublishCommand.mock.calls[0][0]
      const msg = JSON.parse(cmdArg.Message)
      expect(msg.application).toBe('MyApp')
    })

    test('applies component from config when not set in event', async () => {
      const { component: _, ...eventWithout } = validEvent
      await publishAuditEvent(eventWithout, { ...baseConfig, component: 'my-service' })
      const cmdArg = PublishCommand.mock.calls[0][0]
      const msg = JSON.parse(cmdArg.Message)
      expect(msg.component).toBe('my-service')
    })

    test('applies environment from config when not set in event', async () => {
      const { environment: _, ...eventWithout } = validEvent
      await publishAuditEvent(eventWithout, { ...baseConfig, environment: 'dev' })
      const cmdArg = PublishCommand.mock.calls[0][0]
      const msg = JSON.parse(cmdArg.Message)
      expect(msg.environment).toBe('dev')
    })

    test('applies ip from config when not set in event', async () => {
      const { ip: _, ...eventWithout } = validEvent
      await publishAuditEvent(eventWithout, { ...baseConfig, ip: '10.0.0.1' })
      const cmdArg = PublishCommand.mock.calls[0][0]
      const msg = JSON.parse(cmdArg.Message)
      expect(msg.ip).toBe('10.0.0.1')
    })
  })

  describe('correlationid', () => {
    test('generates correlationid when generateCorrelationId:true and event has none', async () => {
      const { correlationid: _, ...eventWithout } = validEvent
      await publishAuditEvent(eventWithout, { ...baseConfig, generateCorrelationId: true })
      const cmdArg = PublishCommand.mock.calls[0][0]
      const msg = JSON.parse(cmdArg.Message)
      expect(msg.correlationid).toMatch(/^[0-9a-f-]{36}$/)
    })

    test('preserves event correlationid when generateCorrelationId:true', async () => {
      await publishAuditEvent(validEvent, { ...baseConfig, generateCorrelationId: true })
      const cmdArg = PublishCommand.mock.calls[0][0]
      const msg = JSON.parse(cmdArg.Message)
      expect(msg.correlationid).toBe('abc-123')
    })

    test('does not generate correlationid when generateCorrelationId:false', async () => {
      const { correlationid: _, ...eventWithout } = validEvent
      await expect(
        publishAuditEvent(eventWithout, { ...baseConfig, generateCorrelationId: false })
      ).rejects.toThrow('Invalid audit event')
    })
  })

  describe('SNS publishing', () => {
    test('calls PublishCommand with correct TopicArn', async () => {
      await publishAuditEvent(validEvent, baseConfig)
      const cmdArg = PublishCommand.mock.calls[0][0]
      expect(cmdArg.TopicArn).toBe(baseConfig.sns.topicArn)
    })

    test('calls PublishCommand with serialised event', async () => {
      await publishAuditEvent(validEvent, baseConfig)
      const cmdArg = PublishCommand.mock.calls[0][0]
      const msg = JSON.parse(cmdArg.Message)
      expect(msg.application).toBe(validEvent.application)
    })

    test('returns messageId from SNS response', async () => {
      const result = await publishAuditEvent(validEvent, baseConfig)
      expect(result).toEqual({ messageId: 'msg-001' })
    })

    test('creates SNSClient with region', async () => {
      await publishAuditEvent(validEvent, baseConfig)
      expect(SNSClient).toHaveBeenCalledWith(expect.objectContaining({ region: 'eu-west-2' }))
    })

    test('creates SNSClient with endpoint credentials when endpoint provided', async () => {
      const config = {
        ...baseConfig,
        aws: {
          region: 'eu-west-2',
          endpoint: 'http://localhost:4566',
          accessKeyId: 'test',
          secretAccessKey: 'test'
        }
      }
      await publishAuditEvent(validEvent, config)
      expect(SNSClient).toHaveBeenCalledWith(expect.objectContaining({
        endpoint: 'http://localhost:4566',
        credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
      }))
    })
  })

  describe('validation', () => {
    test('throws when event is invalid after defaults applied', async () => {
      await expect(
        publishAuditEvent({ correlationid: 'abc' }, baseConfig)
      ).rejects.toThrow('Invalid audit event')
    })

    test('error message includes validation details', async () => {
      await expect(
        publishAuditEvent({ correlationid: 'abc' }, baseConfig)
      ).rejects.toThrow(/environment/)
    })
  })
})
