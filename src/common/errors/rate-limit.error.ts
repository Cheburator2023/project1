import { ApplicationError } from './application.error'

export class RateLimitError extends ApplicationError {
  constructor(message = 'Превышен лимит запросов') {
    super('RATE_LIMIT', message, 429)
  }
}
