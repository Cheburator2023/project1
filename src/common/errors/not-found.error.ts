import { ApplicationError } from './application.error'

export class NotFoundError extends ApplicationError {
  constructor(message = 'Ресурс не найден') {
    super('NOT_FOUND', message, 404)
  }
}
