import crypto from 'node:crypto'
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns'
import { validateAuditEvent } from './validate.js'

const DEFAULT_VERSION = '1.0.0'

function applyDefaults (event, config) {
  const merged = { ...event }

  if (!merged.datetime) {
    merged.datetime = new Date().toISOString()
  }

  if (config.generateCorrelationId && !merged.correlationid) {
    merged.correlationid = crypto.randomUUID()
  }

  if (!merged.version) {
    merged.version = config.version ?? DEFAULT_VERSION
  }

  if (!merged.application && config.application) {
    merged.application = config.application
  }

  if (!merged.component && config.component) {
    merged.component = config.component
  }

  if (!merged.environment && config.environment) {
    merged.environment = config.environment
  }

  if (!merged.ip && config.ip) {
    merged.ip = config.ip
  }

  return merged
}

export async function publishAuditEvent (event, config) {
  const merged = applyDefaults(event, config)

  const { valid, errors } = validateAuditEvent(merged)

  if (!valid) {
    throw new Error(`Invalid audit event: ${errors.join(', ')}`)
  }

  const { aws, sns } = config

  const snsClient = new SNSClient({
    region: aws.region,
    ...(aws.endpoint && {
      endpoint: aws.endpoint,
      credentials: {
        accessKeyId: aws.accessKeyId,
        secretAccessKey: aws.secretAccessKey
      }
    })
  })

  const result = await snsClient.send(
    new PublishCommand({
      Message: JSON.stringify(merged),
      TopicArn: sns.topicArn
    })
  )

  return { messageId: result.MessageId }
}
