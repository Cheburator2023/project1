import { Injectable, Logger } from '@nestjs/common'
import { HttpException } from '@nestjs/common'
import {
  ApplicationError,
  AuthenticationError,
  ValidationError,
  ReportGenerationError,
  NotFoundError,
  RateLimitError
} from '../errors'

@Injectable()
export class ErrorHandlerService {
  private readonly logger = new Logger(ErrorHandlerService.name)

  handleError(error: any): HttpException {
    // Если уже HttpException, просто возвращаем
    if (error instanceof HttpException) {
      return error
    }

    // Обработка кастомных ошибок
    if (error instanceof ApplicationError) {
      return this.createHttpException(error)
    }

    // Обработка ошибок Keycloak
    if (this.isKeycloakError(error)) {
      return this.handleKeycloakError(error)
    }

    // Обработка ошибок базы данных
    if (this.isDatabaseError(error)) {
      this.logger.error(`Ошибка базы данных: ${error.message}`, error.stack)
      return this.createHttpException(
        new ReportGenerationError('Сервис недоступен')
      )
    }

    // Обработка неизвестных ошибок
    this.logger.error(`Необработанная ошибка: ${error.message}`, error.stack)
    return this.createHttpException(
      new ReportGenerationError('Внутренняя ошибка сервера')
    )
  }

  private createHttpException(error: ApplicationError): HttpException {
    return new HttpException(
      {
        error: {
          code: error.code,
          message: error.message
        }
      },
      error.statusCode
    )
  }

  private isKeycloakError(error: any): boolean {
    return (
      error.response?.config?.url?.includes('keycloak') ||
      error.response?.config?.url?.includes('auth') ||
      error.message?.includes('Keycloak') ||
      error.message?.includes('токен') ||
      error.message?.includes('authentication')
    )
  }

  private handleKeycloakError(error: any): HttpException {
    const status = error.response?.status

    switch (status) {
      case 400:
        return new HttpException(
          {
            error: {
              code: '400',
              message: 'Неверные параметры запроса'
            }
          },
          400
        )
      case 401:
        return new HttpException(
          {
            error: {
              code: '401',
              message: 'Некорректная пара логин - пароль'
            }
          },
          401
        )
      default:
        return new HttpException(
          {
            error: {
              code: '503',
              message: 'Сервис недоступен'
            }
          },
          503
        )
    }
  }

  private isDatabaseError(error: any): boolean {
    return (
      error.message?.includes('SQL') ||
      error.message?.includes('database') ||
      error.message?.includes('базы данных') ||
      error.message?.includes('connection') ||
      error.message?.includes('timeout')
    )
  }

  getErrorCode(error: any): string {
    if (error instanceof ApplicationError) {
      return error.code
    }

    const status = error.response?.status || error.status || 500

    switch (status) {
      case 400:
        return '400'
      case 401:
        return '401'
      case 403:
        return '403'
      case 404:
        return '404'
      case 429:
        return '429'
      case 503:
        return '503'
      default:
        return '500'
    }
  }
}
