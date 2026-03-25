import { ApplicationError } from './application.error'

export class AuthenticationError extends ApplicationError {
  constructor(message = 'Ошибка аутентификации') {
    super('AUTH_ERROR', message, 401)
  }
}
