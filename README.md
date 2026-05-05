[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=defra_fcp-audit-publisher&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=defra_fcp-audit-publisher)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=defra_fcp-audit-publisher&metric=bugs)](https://sonarcloud.io/summary/new_code?id=defra_fcp-audit-publisher)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=defra_fcp-audit-publisher&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=defra_fcp-audit-publisher)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=defra_fcp-audit-publisher&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=defra_fcp-audit-publisher)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=defra_fcp-audit-publisher&metric=coverage)](https://sonarcloud.io/summary/new_code?id=defra_fcp-audit-publisher)

# FCP Audit Publisher

A library to validate and/or publish FCP Audit events to the FCP Audit service.

## Installation

```bash
npm install fcp-audit-publisher
```

## Usage

### ESM

```js
import { validateAuditEvent, publishAuditEvent } from 'fcp-audit-publisher'
```

### CommonJS

```js
const { validateAuditEvent, publishAuditEvent } = require('fcp-audit-publisher')
```

---

## `validateAuditEvent(event)`

Validates a JSON object against the FCP Audit event schema.

```js
const result = validateAuditEvent({
  correlationid: 'abc-123',
  datetime: '2025-12-01T12:51:41.381Z',
  environment: 'prod',
  version: '1.0.0',
  application: 'FCP001',
  component: 'my-service',
  ip: '192.168.1.100',
  audit: {
    entities: [{ entity: 'application', action: 'created', entityid: 'APP-001' }]
  },
  security: null
})
```

### Return value

On success:

```js
{ valid: true, value: { /* normalised event */ } }
```

On failure:

```js
{
  valid: false,
  errors: [
    '"datetime" is required',
    '"application" is required'
  ]
}
```

---

## `publishAuditEvent(event, config)`

Applies defaults, validates the event, then publishes it to an AWS SNS topic.

```js
const result = await publishAuditEvent(
  {
    audit: {
      entities: [{ entity: 'application', action: 'created', entityid: 'APP-001' }]
    },
    security: null
  },
  {
    sns: { topicArn: 'arn:aws:sns:eu-west-2:123456789012:fcp-audit' },
    aws: { region: 'eu-west-2' },
    application: 'FCP001',
    component: 'my-service',
    environment: 'prod',
    ip: '192.168.1.100',
    generateCorrelationId: true
  }
)

console.log(result.messageId)
```

Throws an `Error` if the event is invalid after defaults are applied.

### Config reference

| Option | Type | Required | Description |
|---|---|---|---|
| `sns.topicArn` | string | Yes | ARN of the SNS topic to publish to |
| `aws.region` | string | Yes | AWS region |
| `aws.endpoint` | string | No | Custom AWS endpoint URL (e.g. for local Floci) |
| `aws.accessKeyId` | string | No | AWS access key ID (required when `endpoint` is set) |
| `aws.secretAccessKey` | string | No | AWS secret access key (required when `endpoint` is set) |
| `version` | string | No | Default event schema version. Overridden by the event's own `version` field |
| `application` | string | No | Default application name. Overridden by the event's own `application` field |
| `component` | string | No | Default component name. Overridden by the event's own `component` field |
| `environment` | string | No | Default environment. Overridden by the event's own `environment` field |
| `ip` | string | No | Default IP address. Overridden by the event's own `ip` field |
| `generateCorrelationId` | boolean | No | When `true`, generates a UUID v4 as `correlationid` if the event has none |

### Default precedence

For fields that can be defaulted, the order of precedence from lowest to highest is:

**library default → config value → event value**

| Field | Library default | Config override | Notes |
|---|---|---|---|
| `version` | `'1.0.0'` | `config.version` | |
| `datetime` | `new Date().toISOString()` | — | Applied only when absent from event |
| `correlationid` | — | `generateCorrelationId: true` generates a UUID | Applied only when absent from event |
| `application` | — | `config.application` | |
| `component` | — | `config.component` | |
| `environment` | — | `config.environment` | |
| `ip` | — | `config.ip` | Should only be used for services reporting their own IP address, ie Cron job or background service.  Not when handling requests from users or other services. |

---

## Event schema

All events must satisfy the following schema (validated via Joi):

| Field | Type | Required | Constraints |
|---|---|---|---|
| `correlationid` | string | Yes | max 50 chars |
| `datetime` | ISO date string | Yes | |
| `environment` | string | Yes | lowercase, max 20 chars |
| `version` | string | Yes | max 10 chars |
| `application` | string | Yes | max 30 chars |
| `component` | string | Yes | max 30 chars |
| `ip` | string | Yes | max 20 chars |
| `user` | string | No | max 50 chars |
| `sessionid` | string | No | max 50 chars |
| `audit` | object or null | No* | See audit schema below |
| `security` | object or null | No* | See security schema below |

\* At least one of `audit` or `security` must be present and non-null.

### `audit` object

| Field | Type | Required | Constraints |
|---|---|---|---|
| `entities` | array | Yes | min 1 item |
| `entities[].entity` | string | Yes | lowercase, max 120 chars |
| `entities[].action` | string | Yes | lowercase, max 120 chars |
| `entities[].entityid` | string | No | max 120 chars |
| `accounts` | object | No | keys: `sbi`, `frn`, `vendor`, `trader`, `organisationId`, `crn`, `personId` |
| `status` | string | No | max 120 chars |
| `details` | object | No | free-form |

### `security` object

| Field | Type | Required | Constraints |
|---|---|---|---|
| `pmccode` | string | Yes | max 4 chars (hyphens stripped) |
| `priority` | integer | No | defaults to `0` |
| `details.transactioncode` | string | No | max 4 chars |
| `details.message` | string | No | max 120 chars |
| `details.additionalinfo` | string | No | max 120 chars |

---

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:
http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3
