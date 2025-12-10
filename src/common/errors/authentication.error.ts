import { ApplicationError } from './application.error';

export class AuthenticationError extends ApplicationError {
  constructor(message: string = 'Ошибка аутентификации') {
    super('AUTH_ERROR', message, 401)
  }
}