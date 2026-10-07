import { v4 as uuidv4 } from 'uuid'
import {
  UserDataExtractor,
  UserData,
  UserFieldsMapping
} from './UserDataExtractor'
import { CallerInfoExtractor } from './CallerInfoExtractor'
import { DataSanitizer } from './DataSanitizer'

interface LogEntryConfig {
  appName: string
  risCode: string
  projectCode: string
  appType: string
  envType: string
  namespace?: string
  podName?: string
  podIp?: string
  nodeName?: string
  tslgClientVersion: string
  enableUserData: boolean
  sanitizeSensitiveData: boolean
  enableFullContext: boolean
  sanitizePercentage: number
  userFieldsMapping?: UserFieldsMapping
}

/**
 * Допустимые значения атрибута level согласно требованиям
 * ИС 1404 «Журналирование» (раздел 4.5.1.1, Таблица 4.5.1.1).
 *
 * На вход методы логгера могут передавать уровень в любом регистре,
 * внутри нормализуем к нижнему.
 */
const ALLOWED_LOG_LEVELS = [
  'TRACE',
  'DEBUG',
  'INFO',
  'WARN',
  'WARNING',
  'ERROR',
  'FATAL',
  'PANIC',
  'CRITICAL'
] as const

type AllowedLogLevel = (typeof ALLOWED_LOG_LEVELS)[number]

/**
 * Соответствие внутренних уровней логгера и допустимых значений
 * атрибута level.
 */
const LEVEL_MAPPING: Record<string, AllowedLogLevel> = {
  trace: 'TRACE',
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARN',
  warning: 'WARN',
  error: 'ERROR',
  fatal: 'FATAL',
  panic: 'PANIC',
  critical: 'CRITICAL',
  verbose: 'TRACE',
  log: 'INFO',
  sys: 'INFO'
}

/**
 * Запрещённые символы в атрибутах, участвующих в формировании имени
 * индекса Elasticsearch (раздел 4.5.1.1).
 */
const INVALID_INDEX_CHARS = /[\\/,?"<>|\s#:{}]/

/**
 * Максимальная длина стектрейса в символах.
 */
const MAX_STACK_LENGTH = 16000

function isValidIndexAttribute(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false
  }
  if (value !== value.toLowerCase()) {
    return false
  }
  if (/^[-_+]/.test(value)) {
    return false
  }
  if (INVALID_INDEX_CHARS.test(value)) {
    return false
  }
  return true
}

function isValidRisCode(value: string): boolean {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 20 &&
    isValidIndexAttribute(value)
  )
}

function isValidProjectCode(value: string): boolean {
  if (typeof value !== 'string' || value.length === 0 || value.length > 20) {
    return false
  }
  return /^[A-Z][A-Z0-9_]*$/.test(value)
}

export class LogEntryBuilder {
  constructor(private config: LogEntryConfig) {
    this.validateConfig()
  }

  private validateConfig(): void {
    if (!isValidRisCode(this.config.risCode)) {
      // eslint-disable-next-line no-console
      console.warn(
        `[TSLG] risCode "${this.config.risCode}" не соответствует требованиям ` +
        `(нижний регистр, без запрещённых символов, не начинается с -, _, +, до 20 символов)`
      )
    }

    if (!isValidProjectCode(this.config.projectCode)) {
      // eslint-disable-next-line no-console
      console.warn(
        `[TSLG] projectCode "${this.config.projectCode}" не соответствует требованиям ` +
        `(латиница в верхнем регистре, до 20 символов, '_' и цифры)`
      )
    }

    if (
      this.config.envType === 'K8S' &&
      this.config.namespace &&
      !isValidIndexAttribute(this.config.namespace)
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        `[TSLG] namespace "${this.config.namespace}" содержит недопустимые символы для имени индекса Elasticsearch`
      )
    }
  }

  private normalizeLevel(level: string): AllowedLogLevel {
    if (typeof level !== 'string') {
      return 'INFO'
    }
    const lower = level.trim().toLowerCase()
    return LEVEL_MAPPING[lower] ?? 'INFO'
  }

  buildLogEntry(
    level: string,
    message: string,
    event: string,
    error: Error | null,
    additionalData: any
  ) {
    const timestamp = new Date()
    const normalizedLevel = this.normalizeLevel(level)
    const callerInfo = CallerInfoExtractor.getCallerInfo(additionalData)

    const sanitizedMessage = this.sanitizeMessage(message)

    const userData = this.extractAndSanitizeUserData(additionalData)
    const sanitizedData = this.config.sanitizeSensitiveData
      ? DataSanitizer.sanitizeData(
        additionalData,
        this.config.sanitizePercentage
      )
      : additionalData

    const logText = this.createLogText(sanitizedMessage, userData, event)

    // Формат лог-записи приведён в соответствие с рабочей интеграцией
    // СС Журналирование + Ключ-Астром (см. рабочий сервис).
    // Ключевые отличия от предыдущей версии:
    //   - @timestamp: UNIX-секунды с дробной частью (Date.now() / 1000);
    //   - level выводится в нижнем регистре (совместимо с TSLG Agent);
    //   - eventOutcome вместо event (семантическое имя);
    //   - workerId: 0 (обязательное поле для appType=NODEJS);
    //   - дублирующее поле timestamp в формате ISO 8601;
    //   - trace-поля dt.trace_id / dt.span_id (Dynatrace/Ключ-Астром).
    const logEntry: any = {
      '@timestamp': timestamp.getTime() / 1000,
      eventId: uuidv4(),
      appName: this.config.appName,
      level: normalizedLevel.toLowerCase(),
      text: logText,
      localTime: timestamp.toISOString(),
      timestamp: timestamp.toISOString(),
      PID: process.pid,
      workerId: 0,
      appType: this.config.appType,
      envType: this.config.envType,
      projectCode: this.config.projectCode,
      risCode: this.config.risCode,
      namespace: this.config.namespace,
      podName: this.config.podName,
      tec: {
        podIp: this.config.podIp,
        nodeName: this.config.nodeName
      },
      tslgClientVersion: this.config.tslgClientVersion,
      eventOutcome: event,
      loggerName: callerInfo.loggerName || 'application',
      threadName: `node-${process.pid}`
    }

    this.addOptionalBaseAttributes(logEntry, additionalData)
    this.addTracingContext(logEntry, additionalData)
    this.addUserData(logEntry, userData)
    this.addCallerInfo(logEntry, callerInfo)
    this.addErrorInfo(logEntry, error, additionalData)
    this.addAdditionalData(logEntry, sanitizedData)

    return logEntry
  }

  /**
   * Заполняет опциональные базовые атрибуты:
   * extEventId, parentId, encProvider.
   */
  private addOptionalBaseAttributes(
    logEntry: any,
    additionalData: any
  ): void {
    if (
      typeof additionalData?.extEventId === 'string' &&
      additionalData.extEventId.length > 0 &&
      additionalData.extEventId.length <= 100
    ) {
      logEntry.extEventId = additionalData.extEventId
    }

    if (
      typeof additionalData?.parentId === 'string' &&
      additionalData.parentId.length > 0 &&
      additionalData.parentId.length <= 100
    ) {
      logEntry.parentId = additionalData.parentId
    }

    if (
      typeof additionalData?.encProvider === 'string' &&
      additionalData.encProvider.length > 0
    ) {
      logEntry.encProvider = additionalData.encProvider
    }
  }

  /**
   * Заполняет поля трассировки для интеграции с Ключ-Астром (Dynatrace).
   *
   * Имена полей — `dt.trace_id` и `dt.span_id` (с точкой в имени).
   * Эти имена используются как плоские ключи в JSON-документе и корректно
   * индексируются в Elasticsearch как nested-поля.
   *
   * Поля заполняются только при наличии обоих обязательных значений —
   * trace_id и span_id.
   *
   * Источник данных — RequestContext (сформирован в middleware из
   * заголовка x-dynatrace либо из W3C traceparent).
   */
  private addTracingContext(logEntry: any, additionalData: any): void {
    const traceId = additionalData?.traceId
    const spanId = additionalData?.spanId

    if (
      typeof traceId === 'string' &&
      traceId.length > 0 &&
      traceId.length <= 64
    ) {
      logEntry['dt.trace_id'] = traceId
    }

    if (
      typeof spanId === 'string' &&
      spanId.length > 0 &&
      spanId.length <= 64
    ) {
      logEntry['dt.span_id'] = spanId
    }
  }

  private sanitizeMessage(message: string): string {
    if (typeof message !== 'string') return message

    const jwtPattern = /eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g
    const matches = message.match(jwtPattern)

    if (matches) {
      let sanitizedMessage = message
      matches.forEach((jwt) => {
        sanitizedMessage = sanitizedMessage.replace(
          jwt,
          UserDataExtractor.sanitizeJwtToken(
            jwt,
            this.config.sanitizePercentage
          )
        )
      })
      return sanitizedMessage
    }

    return message
  }

  private extractAndSanitizeUserData(additionalData: any): UserData {
    if (!this.config.enableUserData) {
      return {}
    }

    let userData: UserData = {}

    if (additionalData.user && typeof additionalData.user === 'object') {
      userData = UserDataExtractor.extractUserDataFromPayload(
        additionalData.user,
        this.config.userFieldsMapping
      )
    } else if (additionalData.jwt || additionalData.token) {
      const token = additionalData.jwt || additionalData.token
      if (typeof token === 'string') {
        userData = UserDataExtractor.extractFromToken(
          token,
          this.config.userFieldsMapping
        )
      }
    } else if (additionalData.userId || additionalData.username) {
      userData = {
        userId: additionalData.userId,
        username: additionalData.username,
        firstName: additionalData.firstName,
        lastName: additionalData.lastName
      }
    }

    return UserDataExtractor.sanitizeUserData(
      userData,
      this.config.sanitizePercentage
    )
  }

  private createLogText(
    message: string,
    userData: UserData,
    event: string
  ): string {
    let text =
      typeof message === 'string' ? message : JSON.stringify(message, null, 2)

    if (this.config.enableUserData) {
      const userInfo = UserDataExtractor.getSanitizedUserInfo(userData)
      if (userInfo) {
        text = `[${userInfo}] ${text}`
      }
    }

    if (event && event !== 'Информация' && this.config.enableFullContext) {
      text += ` | Событие: ${event}`
    }

    return text
  }

  private addUserData(logEntry: any, userData: UserData) {
    if (this.config.enableUserData && userData.userId) {
      logEntry.userId = userData.userId
      if (userData.username) logEntry.username = userData.username
      if (userData.firstName) logEntry.firstName = userData.firstName
      if (userData.lastName) logEntry.lastName = userData.lastName
      if (userData.email) logEntry.email = userData.email
      if (userData.roles && userData.roles.length > 0)
        logEntry.userRoles = userData.roles
      if (userData.groups && userData.groups.length > 0)
        logEntry.userGroups = userData.groups
    }
  }

  private addCallerInfo(logEntry: any, callerInfo: any) {
    if (callerInfo.callerClass && callerInfo.callerClass !== 'unknown') {
      logEntry.callerClass = callerInfo.callerClass
    }
    if (callerInfo.callerMethod && callerInfo.callerMethod !== 'anonymous') {
      logEntry.callerMethod = callerInfo.callerMethod
    }
    if (callerInfo.callerLine) {
      logEntry.callerLine = callerInfo.callerLine
    }
  }

  private addErrorInfo(
    logEntry: any,
    error: Error | null,
    additionalData: any
  ) {
    if (error) {
      logEntry.errorMessage = error.message
      logEntry.stack = this.cleanStack(error.stack)
      logEntry.errorType = error.constructor.name

      if (additionalData.errorCode) {
        logEntry.errorCode = additionalData.errorCode
      }
    }
  }

  private addAdditionalData(logEntry: any, sanitizedData: any) {
    if (
      sanitizedData === null ||
      typeof sanitizedData !== 'object' ||
      Array.isArray(sanitizedData)
    ) {
      return
    }

    const excludedFields = [
      'context',
      'params',
      'stack',
      'errorMessage',
      'user',
      'jwt',
      'token',
      'errorCode',
      'httpStatus',
      'userId',
      'username',
      'firstName',
      'lastName',
      'email',
      // Опциональные базовые и агрегационные атрибуты — обработаны явно.
      'extEventId',
      'parentId',
      'encProvider',
      // Поля трассировки — обрабатываются в addTracingContext()
      'traceId',
      'spanId'
    ]

    Object.keys(sanitizedData).forEach((key) => {
      if (!logEntry.hasOwnProperty(key) && !excludedFields.includes(key)) {
        logEntry[key] = sanitizedData[key]
      }
    })

    if (sanitizedData.params && Array.isArray(sanitizedData.params)) {
      sanitizedData.params.forEach((param: any, index: number) => {
        if (typeof param === 'string' && param.length > 0) {
          logEntry[`param${index}`] = param
        }
      })
    }
  }

  /**
   * Очищает стектрейс: удаляет первую строку (сообщение об ошибке),
   * нормализует отступы, ограничивает максимальную длину согласно
   * лимиту MAX_STACK_LENGTH, чтобы не превысить общий размер лога.
   */
  private cleanStack(stack?: string): string {
    if (!stack) return ''

    const cleaned = stack
      .split('\n')
      .slice(1)
      .map((line) => line.trim())
      .join('\n')

    if (cleaned.length > MAX_STACK_LENGTH) {
      return cleaned.substring(0, MAX_STACK_LENGTH) + ' ... [STACK TRUNCATED]'
    }

    return cleaned
  }
}