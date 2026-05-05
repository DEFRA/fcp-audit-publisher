import { eventSchema } from './schema.js'

export function validateAuditEvent (event) {
  const { error, value } = eventSchema.validate(event, { abortEarly: false })

  if (error) {
    return {
      valid: false,
      errors: error.details.map(d => d.message)
    }
  }

  return { valid: true, value }
}
