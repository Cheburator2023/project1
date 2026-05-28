import { ApplicationError } from './application.error'

export class ReportGenerationError extends ApplicationError {
  constructor(message = 'Ошибка генерации отчета') {
    super('REPORT_ERROR', message, 503)
  }
}
