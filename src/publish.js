import crypto from 'node:crypto'
import { PublishCommand } from '@aws-sdk/client-sns'
import { validateAuditEvent } from './validate.js'
import { configSchema } from './schema.js'

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
  const { error: configError } = configSchema.validate(config, { abortEarly: false })

  if (configError) {
    throw new Error(`Invalid config: ${configError.details.map(d => d.message).join(', ')}`)
  }

  const merged = applyDefaults(event, config)

  const { valid, errors } = validateAuditEvent(merged)

  if (!valid) {
    throw new Error(`Invalid audit event: ${errors.join(', ')}`)
  }

  const { snsClient, sns } = config

  const result = await snsClient.send(
    new PublishCommand({
      Message: JSON.stringify(merged),
      TopicArn: sns.topicArn
    })
  )

  return { messageId: result.MessageId }
}
