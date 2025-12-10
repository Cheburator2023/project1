import { ApplicationError } from './application.error';

export class ValidationError extends ApplicationError {
  constructor(message: string = 'Ошибка валидации') {
    super('VALIDATION_ERROR', message, 400)
  }
}