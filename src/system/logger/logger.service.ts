import {
  Injectable,
  OnModuleDestroy,
  LoggerService as NestLoggerService
} from '@nestjs/common'
import { AsyncLocalStorage } from 'async_hooks'
import { LoggerFactory } from './LoggerFactory'
import {
  extractRequestContext,
  RequestContext,
  RequestContextMiddleware
} from './request-context'

/**
 * Сквозной контекст запроса, используемый для обогащения логов
 * атрибутами агрегационного контекста (раздел 4.5.1.5.1 документа
 * ИС 1404 «Журналирование»).
 *
 * Поля соответствуют атрибутам `agrType=TRACING`, которые
 * передаются в СС Журналирование и Ключ-Астром:
 *  - traceId      — идентификатор запроса (trace ID);
 *  - spanId       — идентификатор операции (span ID);
 *  - parentSpanId — идентификатор родительской операции;
 *  - userId       — идентификатор пользователя;
 *  - requestId    — внутренний идентификатор запроса приложения.
 */
export type { RequestContext } from './request-context'

/**
 * Хранилище контекста запроса, изолированное на уровне асинхронных
 * вызовов (AsyncLocalStorage).
 */
const requestContextStorage = new AsyncLocalStorage<RequestContext>()

@Injectable()
export class LoggerService implements NestLoggerService, OnModuleDestroy {
  private logger

  constructor() {
    const config = {
      host:
        process.env.TSLG_AGENT_HOST ||
        'tslg-agent-svc-main.dk1-sumd01-sumd-core.svc.cluster.local',
      port: parseInt(process.env.TSLG_AGENT_PORT || '5170', 10),
      appName: process.env.APP_NAME || 'surm-backend',
      projectCode: process.env.PROJECT_CODE || 'SURM',
      risCode: process.env.RIS_CODE || '1404',
      namespace: process.env.KUBERNETES_NAMESPACE || 'dk1-sumd01-sumd-core',
      podName: process.env.POD_NAME || 'surm-backend-7c8b5d9f6-abc123',
      podIp: process.env.POD_IP || '10.244.1.25',
      nodeName: process.env.NODE_NAME || 'dk1-sumd01-node-05',
      tslgClientVersion: process.env.TSLG_CLIENT_VERSION || '1.0.0',
      reconnectionDelay: parseInt(
        process.env.TSLG_RECONNECTION_DELAY_MS || '1000',
        10
      ),
      connectionTTL: parseInt(process.env.TSLG_CONNECTION_TTL_MS || '2000', 10),
      socketTimeout: parseInt(
        process.env.TSLG_SOCKET_TIMEOUT_MS || '10000',
        10
      ),
      maxBufferSize: parseInt(process.env.TSLG_MAX_BUFFER_SIZE || '1000', 10),
      enableTraceFields: process.env.TSLG_ENABLE_TRACE_FIELDS === 'true',
      consoleOutput:
        this.parseBoolean(process.env.TSLG_CONSOLE_OUTPUT) ??
        process.env.NODE_ENV !== 'production',
      debugJson: process.env.DEBUG_JSON === 'true',
      enableUserData: process.env.TSLG_ENABLE_USER_DATA === 'true',
      sanitizeSensitiveData:
        process.env.TSLG_SANITIZE_SENSITIVE_DATA !== 'false',
      enableFullContext: process.env.TSLG_ENABLE_FULL_CONTEXT === 'true',
      logLevel: process.env.TSLG_LOG_LEVEL || 'info'
    }

    this.logger = LoggerFactory.createLogger(config)
  }

  private parseBoolean(value: any): boolean | null {
    if (value === undefined || value === null) return null
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase().trim()
      return lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes'
    }
    return null
  }

  /**
   * Возвращает Express-middleware, устанавливающий RequestContext
   * в AsyncLocalStorage на время обработки запроса. Все логи внутри
   * обработчика получат единый traceId / spanId.
   *
   * Используется в main.ts как единственная точка подключения:
   *   app.use(logger.createRequestContextMiddleware())
   */
  createRequestContextMiddleware(): RequestContextMiddleware {
    return (req, res, next) => {
      const context = extractRequestContext(req)
      this.runWithContext(context, () => next())
    }
  }

  getRequestContext(): RequestContext | undefined {
    return requestContextStorage.getStore()
  }

  /**
   * Устанавливает контекст запроса на время выполнения переданной функции.
   * Используется в middleware для обогащения всех логов в рамках
   * обработки HTTP-запроса trace-идентификаторами.
   */
  runWithContext<T>(context: RequestContext, fn: () => T): T {
    return requestContextStorage.run(context, fn)
  }

  /**
   * Обогащает additionalData контекстными полями трассировки.
   *
   * Поля `traceId` и `spanId` заполняются только в паре — это соответствует
   * требованиям СС Журналирование: без span_id трассировка не имеет смысла.
   * Гарантия наличия обоих полей обеспечивается фабрикой middleware
   * (см. `extractRequestContext`), которая генерирует недостающий
   * идентификатор.
   *
   * Явно переданные значения не перезаписываются.
   */
  private enrichAdditionalData(data: any): any {
    const ctx = requestContextStorage.getStore()
    if (!ctx) {
      return data
    }

    // Не модифицируем примитивы и массивы — только плоские объекты.
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      return data
    }

    const enriched: any = { ...data }

    // Обязательные поля трассировки отправляются только в паре.
    if (ctx.traceId && ctx.spanId) {
      if (!enriched.traceId) {
        enriched.traceId = ctx.traceId
      }
      if (!enriched.spanId) {
        enriched.spanId = ctx.spanId
      }
    }

    if (ctx.parentSpanId && !enriched.parentSpanId) {
      enriched.parentSpanId = ctx.parentSpanId
    }
    if (ctx.userId && !enriched.userId) {
      enriched.userId = ctx.userId
    }
    if (ctx.requestId && !enriched.requestId) {
      enriched.requestId = ctx.requestId
    }

    return enriched
  }

  log(message: any, ...optionalParams: any[]) {
    if (this.shouldLog('info')) {
      const data = this.enrichAdditionalData(
        this.parseOptionalParams(optionalParams)
      )
      this.logger.info(message, 'Информация', data)
    }
  }

  error(message: any, ...optionalParams: any[]) {
    if (this.shouldLog('error')) {
      let error: Error | null = null
      let additionalData: any = {}

      if (optionalParams.length > 0) {
        const firstParam = optionalParams[0]
        if (firstParam instanceof Error) {
          error = firstParam
          additionalData = this.parseOptionalParams(optionalParams.slice(1))
        } else if (typeof firstParam === 'string') {
          additionalData = {
            context: firstParam,
            ...this.parseOptionalParams(optionalParams.slice(1))
          }
        } else {
          additionalData = this.parseOptionalParams(optionalParams)
        }
      }

      const enriched = this.enrichAdditionalData(additionalData)
      this.logger.error(message, 'Ошибка', error, enriched)
    }
  }

  warn(message: any, ...optionalParams: any[]) {
    if (this.shouldLog('warn')) {
      const data = this.enrichAdditionalData(
        this.parseOptionalParams(optionalParams)
      )
      this.logger.warn(message, 'Предупреждение', data)
    }
  }

  debug(message: any, ...optionalParams: any[]) {
    if (this.shouldLog('debug')) {
      const data = this.enrichAdditionalData(
        this.parseOptionalParams(optionalParams)
      )
      this.logger.debug(message, 'Отладка', data)
    }
  }

  verbose(message: any, ...optionalParams: any[]) {
    if (this.shouldLog('verbose')) {
      const data = this.enrichAdditionalData(
        this.parseOptionalParams(optionalParams)
      )
      this.logger.verbose(message, 'Подробно', data)
    }
  }

  private shouldLog(level: string): boolean {
    const logLevel = process.env.TSLG_LOG_LEVEL || 'info'
    const levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      verbose: 4
    }

    const currentLevel = levels[level as keyof typeof levels] || 2
    const configuredLevel = levels[logLevel as keyof typeof levels] || 2

    return currentLevel <= configuredLevel
  }

  private parseOptionalParams(optionalParams: any[]): any {
    if (optionalParams.length === 0) {
      return {}
    }

    if (
      optionalParams.length === 1 &&
      typeof optionalParams[0] === 'object' &&
      !Array.isArray(optionalParams[0])
    ) {
      return optionalParams[0]
    }

    return { params: optionalParams }
  }

  info(message: string, event = 'Информация', additionalData: any = {}) {
    if (this.shouldLog('info')) {
      this.logger.info(
        message,
        event,
        this.enrichAdditionalData(additionalData)
      )
    }
  }

  warnMessage(
    message: string,
    event = 'Предупреждение',
    additionalData: any = {}
  ) {
    if (this.shouldLog('warn')) {
      this.logger.warn(
        message,
        event,
        this.enrichAdditionalData(additionalData)
      )
    }
  }

  errorMessage(
    message: string,
    event = 'Ошибка',
    error: Error | null = null,
    additionalData: any = {}
  ) {
    if (this.shouldLog('error')) {
      this.logger.error(
        message,
        event,
        error,
        this.enrichAdditionalData(additionalData)
      )
    }
  }

  sys(message: string, additionalData: any = {}) {
    if (this.shouldLog('info')) {
      this.logger.sys(message, this.enrichAdditionalData(additionalData))
    }
  }

  onModuleDestroy() {
    this.logger.close()
  }
}
