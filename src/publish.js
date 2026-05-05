import crypto from 'node:crypto'
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns'
import { validateAuditEvent } from './validate.js'

const DEFAULT_VERSION = '1.0.0'

function applyDefaults (event, config) {
  const defaults = {
    datetime: new Date().toISOString(),
    version: config.version ?? DEFAULT_VERSION,
    ...(config.generateCorrelationId && { correlationid: crypto.randomUUID() }),
    ...(config.application && { application: config.application }),
    ...(config.component && { component: config.component }),
    ...(config.environment && { environment: config.environment }),
    ...(config.ip && { ip: config.ip })
  }

  return { ...defaults, ...event }
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
