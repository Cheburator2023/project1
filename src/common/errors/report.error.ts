import { ApplicationError } from './application.error';

export class ReportGenerationError extends ApplicationError {
  constructor(message: string = 'Ошибка генерации отчета') {
    super('REPORT_ERROR', message, 503)
  }
}