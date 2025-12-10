import { ApplicationError } from './application.error'

export class NotFoundError extends ApplicationError {
  constructor(message: string = 'Ресурс не найден') {
    super('NOT_FOUND', message, 404)
  }
}