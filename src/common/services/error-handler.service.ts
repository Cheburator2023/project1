import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common'
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

    const upstreamHttp = this.tryUpstreamHttpError(error)
    if (upstreamHttp) {
      return upstreamHttp
    }

    const network = this.tryNetworkTimeoutError(error)
    if (network) {
      return network
    }

    // Обработка ошибок базы данных
    if (this.isDatabaseError(error)) {
      this.logger.error(`Ошибка базы данных: ${error.message}`, error.stack)
      return this.httpServiceUnavailableWithDetail(error)
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

  /**
   * Ошибки node-postgres: `code` вида 28P01, 3D000, 42P01 и т.д.; сетевые — ECONNREFUSED и др.
   * Раньше часть ошибок (например «password authentication failed» без слова database)
   * не попадала сюда и превращалась в REPORT_ERROR 503.
   */
  private isDatabaseError(error: any): boolean {
    const networkCodes = ['ECONNREFUSED', 'ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET']
    const pgFiveCharCode =
      typeof error?.code === 'string' && /^[0-9A-Z]{5}$/.test(error.code)

    return (
      pgFiveCharCode ||
      error.message?.includes('SQL') ||
      error.message?.includes('database') ||
      error.message?.includes('базы данных') ||
      error.message?.includes('relation') ||
      error.code === '42P01' ||
      error.message?.includes('password authentication') ||
      error.message?.includes('authentication failed') ||
      (error.message?.includes('connection') &&
        !networkCodes.includes(error?.code)) ||
      (error.message?.includes('timeout') && !error.response?.status)
    )
  }

  /**
   * Ответы внешних HTTP-вызовов (axios и т.п.): расширенное тело для 408/502/503/504.
   */
  private tryUpstreamHttpError(error: any): HttpException | null {
    const status = error.response?.status
    if (typeof status !== 'number') {
      return null
    }

    const extendedStatuses = [408, 502, 503, 504]
    if (!extendedStatuses.includes(status)) {
      return null
    }

    const detail: Record<string, unknown> = {
      upstreamStatus: status,
      upstreamStatusText: error.response?.statusText ?? null
    }

    const path = this.safeRequestPath(error)
    if (path) {
      detail.requestPath = path
    }
    if (error.config?.method) {
      detail.method = String(error.config.method).toUpperCase()
    }

    this.logger.error(
      `Внешний сервис ответил HTTP ${status}: ${error.message ?? ''}`,
      error.stack
    )

    return new HttpException(
      {
        error: {
          code: String(status),
          message: this.messageForUpstreamStatus(status),
          detail
        }
      },
      status
    )
  }

  private tryNetworkTimeoutError(error: any): HttpException | null {
    const code = error?.code
    if (typeof code !== 'string') {
      return null
    }

    if (code === 'ECONNREFUSED') {
      return this.buildNetworkHttpException(
        code,
        error,
        '502',
        'Внешний сервис отклонил соединение',
        HttpStatus.BAD_GATEWAY
      )
    }

    const gatewayTimeoutCodes = ['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET']
    if (!gatewayTimeoutCodes.includes(code)) {
      return null
    }

    return this.buildNetworkHttpException(
      code,
      error,
      '504',
      'Превышено время ожидания или обрыв соединения с внешним сервисом',
      HttpStatus.GATEWAY_TIMEOUT
    )
  }

  private buildNetworkHttpException(
    code: string,
    error: any,
    errorCode: string,
    message: string,
    httpStatus: HttpStatus
  ): HttpException {
    const detail: Record<string, unknown> = { networkCode: code }
    const path = this.safeRequestPath(error)
    if (path) {
      detail.requestPath = path
    }

    this.logger.error(`Сетевой сбой (${code}): ${error.message ?? ''}`, error.stack)

    return new HttpException(
      {
        error: {
          code: errorCode,
          message,
          detail
        }
      },
      httpStatus
    )
  }

  private safeRequestPath(error: any): string | null {
    const url = error.config?.url
    if (!url || typeof url !== 'string') {
      return null
    }
    const base = error.config?.baseURL
    const full = typeof base === 'string' && base ? `${base.replace(/\/$/, '')}/${url.replace(/^\//, '')}` : url
    try {
      const u = new URL(full)
      return `${u.pathname}${u.search ? u.search : ''}`.split('?')[0]
    } catch {
      return full.split('?')[0]
    }
  }

  private messageForUpstreamStatus(status: number): string {
    switch (status) {
      case 408:
        return 'Истекло время ожидания запроса у внешнего сервиса'
      case 502:
        return 'Внешний сервис вернул некорректный ответ (шлюз)'
      case 503:
        return 'Внешний сервис временно недоступен'
      case 504:
        return 'Внешний сервис не ответил в срок (таймаут шлюза)'
      default:
        return 'Сбой при обращении к внешнему сервису'
    }
  }

  private httpServiceUnavailableWithDetail(error: any): HttpException {
    const detail: Record<string, unknown> = {}
    if (error.code && typeof error.code === 'string') {
      detail.driverCode = error.code
    }
    if (error.severity && typeof error.severity === 'string') {
      detail.severity = error.severity
    }

    const hasDetail = Object.keys(detail).length > 0

    return new HttpException(
      {
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Сервис недоступен',
          ...(hasDetail ? { detail } : {})
        }
      },
      HttpStatus.SERVICE_UNAVAILABLE
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
