import { LoggerInterface } from './LoggerInterface'
import { LogEntryBuilder } from './LogEntryBuilder'
import { ConnectionManager } from './ConnectionManager'
import { BufferManager } from './BufferManager'

/**
 * Максимальный размер лога в байтах согласно требованиям
 * ИС 1404 «Журналирование» (раздел 3.3, Требования к логированию):
 * «Максимальный размер лога не должен превышать 995 328 Байт (972 КБайт)».
 */
const MAX_LOG_SIZE_BYTES = 995328

/**
 * Маркер, добавляемый в усечённое поле text.
 */
const TRUNCATION_SUFFIX = ' [TRUNCATED]'

/**
 * Снимок методов console.* сделан на этапе загрузки модуля — до того,
 * как любые сторонние библиотеки могут переопределить console.*.
 * Используется для передачи в ConnectionManager.
 */
const ORIGINAL_CONSOLE = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console)
}

/**
 * Прямая запись в stdout. Не зависит от переопределений console.log
 * и гарантирует отображение логов в консоли при TSLG_CONSOLE_OUTPUT=true.
 */
function writeStdout(message: string): void {
  process.stdout.write(message + '\n')
}

/**
 * Прямая запись в stderr. Используется для уровней error и warn.
 */
function writeStderr(message: string): void {
  process.stderr.write(message + '\n')
}

export class TSLGLogger extends LoggerInterface {
  private connectionManager: ConnectionManager
  private bufferManager: BufferManager
  private logEntryBuilder: LogEntryBuilder
  private ttlInterval: NodeJS.Timeout | null = null
  private flushInterval: NodeJS.Timeout | null = null

  private config: any
  private metrics: any

  private originalConsole = ORIGINAL_CONSOLE

  constructor(config: any = {}) {
    super()
    this.config = this.mergeWithDefaults(config)
    this.metrics = this.initializeMetrics()

    this.connectionManager = new ConnectionManager(
      {
        host: this.config.host,
        port: this.config.port,
        socketTimeout: this.config.socketTimeout,
        reconnectionDelay: this.config.reconnectionDelay,
        maxConnectionAttempts: this.config.maxConnectionAttempts
      },
      this.originalConsole
    )

    this.bufferManager = new BufferManager(
      this.config.maxBufferSize,
      this.metrics
    )

    this.logEntryBuilder = new LogEntryBuilder({
      appName: this.config.appName,
      risCode: this.config.risCode,
      projectCode: this.config.projectCode,
      appType: this.config.appType,
      envType: this.config.envType,
      namespace: this.config.namespace,
      podName: this.config.podName,
      podIp: this.config.podIp,
      nodeName: this.config.nodeName,
      tslgClientVersion: this.config.tslgClientVersion,
      enableUserData: this.config.enableUserData,
      sanitizeSensitiveData: this.config.sanitizeSensitiveData,
      enableFullContext: this.config.enableFullContext,
      sanitizePercentage: this.config.sanitizePercentage,
      userFieldsMapping: this.config.userFieldsMapping
    })

    const consoleEnabled = this.isConsoleOutputEnabled()
    writeStdout(
      `[TSLG] Initialized | consoleOutput=${consoleEnabled} | logLevel=${this.config.logLevel} | env.TSLG_CONSOLE_OUTPUT=${String(
        process.env.TSLG_CONSOLE_OUTPUT
      )} | env.NODE_ENV=${String(process.env.NODE_ENV)}`
    )

    this.connectionManager.connect()

    if (this.config.connectionTTL > 0) {
      this.startTTLMonitor()
    }

    this.startBufferFlushMonitor()
  }

  private mergeWithDefaults(config: any): any {
    const defaults = {
      host:
        process.env.TSLG_AGENT_HOST ||
        'tslg-agent-svc-main.dk1-sumd01-sumd-core.svc.cluster.local',
      port: parseInt(process.env.TSLG_AGENT_PORT || '5170', 10),
      appName: process.env.APP_NAME || 'surm-backend',
      projectCode: process.env.PROJECT_CODE || 'SURM',
      risCode: process.env.RIS_CODE || '1404',
      appType: 'NODEJS',
      envType: 'K8S',
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
      maxConnectionAttempts: parseInt(
        process.env.TSLG_MAX_CONNECTION_ATTEMPTS || '10',
        10
      ),
      namespace: process.env.KUBERNETES_NAMESPACE || 'dk1-sumd01-sumd-core',
      podName: process.env.POD_NAME || 'surm-backend-7c8b5d9f6-abc123',
      podIp: process.env.POD_IP || '10.244.1.25',
      nodeName: process.env.NODE_NAME || 'dk1-sumd01-node-05',
      enableTraceFields:
        this.parseBoolean(process.env.TSLG_ENABLE_TRACE_FIELDS) ?? false,
      consoleOutput:
        this.parseBoolean(process.env.TSLG_CONSOLE_OUTPUT) ??
        process.env.NODE_ENV !== 'production',
      debugJson: this.parseBoolean(process.env.DEBUG_JSON) ?? false,
      enableUserData:
        this.parseBoolean(process.env.TSLG_ENABLE_USER_DATA) ?? false,
      sanitizeSensitiveData:
        this.parseBoolean(process.env.TSLG_SANITIZE_SENSITIVE_DATA) ?? true,
      enableFullContext:
        this.parseBoolean(process.env.TSLG_ENABLE_FULL_CONTEXT) ?? false,
      bufferFlushInterval: parseInt(
        process.env.TSLG_BUFFER_FLUSH_INTERVAL_MS || '500',
        10
      ),
      sanitizePercentage: parseInt(
        process.env.TSLG_SANITIZE_PERCENTAGE || '60',
        10
      ),
      logLevel: process.env.TSLG_LOG_LEVEL || 'info',
      userFieldsMapping: {
        userId: process.env.TSLG_USER_ID || 'sub',
        username: process.env.TSLG_USER_USERNAME || 'preferred_username',
        email: process.env.TSLG_USER_EMAIL || 'email',
        firstName: process.env.TSLG_USER_FIRSTNAME || 'given_name',
        lastName: process.env.TSLG_USER_LASTNAME || 'family_name'
      }
    }

    return { ...defaults, ...config }
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
   * Определяет, следует ли выводить логи в консоль.
   *
   * Приоритет:
   *  1. Явное значение env-переменной TSLG_CONSOLE_OUTPUT:
   *     'true'/'1'/'yes' → включено,
   *     'false'/'0'/'no' → выключено.
   *  2. Значение из конфига (this.config.consoleOutput).
   *
   * Прямая проверка env обеспечивает работоспособность флага даже
   * при возможных проблемах с чтением конфига на этапе инициализации.
   */
  private isConsoleOutputEnabled(): boolean {
    const envValue = process.env.TSLG_CONSOLE_OUTPUT
    if (typeof envValue === 'string') {
      const lower = envValue.toLowerCase().trim()
      if (lower === 'true' || lower === '1' || lower === 'yes') {
        return true
      }
      if (lower === 'false' || lower === '0' || lower === 'no') {
        return false
      }
    }
    return this.config.consoleOutput === true
  }

  private initializeMetrics() {
    return {
      sentLogs: 0,
      failedLogs: 0,
      reconnections: 0,
      bufferFlushes: 0,
      connectionErrors: 0,
      ttlReconnections: 0,
      sanitizedDataCount: 0,
      bufferOverflows: 0,
      forcedFlushes: 0,
      truncatedLogs: 0
    }
  }

  private shouldLog(level: string): boolean {
    const levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      verbose: 4
    }

    const currentLevel = levels[level as keyof typeof levels] || 2
    const configuredLevel =
      levels[this.config.logLevel as keyof typeof levels] || 2

    return currentLevel <= configuredLevel
  }

  log(
    level: string,
    message: string,
    event = 'Информация',
    error: Error | null = null,
    additionalData: any = {}
  ): void {
    if (!this.shouldLog(level)) {
      return
    }

    try {
      const logEntry = this.logEntryBuilder.buildLogEntry(
        level,
        message,
        event,
        error,
        additionalData
      )
      const logData = this.prepareLogData(logEntry)

      // Вывод в консоль выполняется ДО отправки в TSLG Agent,
      // чтобы логи были видны даже при проблемах с сетью.
      this.writeToConsole(level, message, event, error, additionalData)

      if (this.config.debugJson) {
        writeStdout(`[TSLG DEBUG JSON]: ${logData}`)
      }

      this.sendLogData(logData)
    } catch (logError) {
      // Гарантированно выводим ошибку сборки лога в консоль,
      // чтобы не потерять информацию о проблеме.
      writeStderr(
        `[TSLG] Error building log entry: ${
          logError instanceof Error ? logError.message : String(logError)
        }`
      )
      this.writeToConsole(level, message, event, error, additionalData)
    }
  }

  /**
   * Приводит лог-запись к максимально допустимому размеру согласно
   * требованиям ИС 1404 «Журналирование» (995 328 байт / 972 КБайт).
   */
  private prepareLogData(logEntry: any): string {
    const entry: any = { ...logEntry }

    let data = JSON.stringify(entry)
    let size = Buffer.byteLength(data, 'utf8')

    if (size <= MAX_LOG_SIZE_BYTES) {
      return data
    }

    this.metrics.truncatedLogs++

    writeStderr(
      `[TSLG] Log entry exceeds max size (${size} > ${MAX_LOG_SIZE_BYTES} bytes), truncating`
    )

    // Шаг 1: усечение text
    if (typeof entry.text === 'string' && entry.text.length > 0) {
      const suffixBytes = Buffer.byteLength(TRUNCATION_SUFFIX, 'utf8')
      const excessBytes = size - MAX_LOG_SIZE_BYTES + suffixBytes
      const textBytes = Buffer.byteLength(entry.text, 'utf8')
      const targetTextBytes = Math.max(100, textBytes - excessBytes)

      while (
        Buffer.byteLength(entry.text, 'utf8') > targetTextBytes &&
        entry.text.length > 100
        ) {
        entry.text = entry.text.substring(
          0,
          Math.floor(entry.text.length * 0.8)
        )
      }
      entry.text = entry.text + TRUNCATION_SUFFIX

      data = JSON.stringify(entry)
      size = Buffer.byteLength(data, 'utf8')

      if (size <= MAX_LOG_SIZE_BYTES) {
        return data
      }
    }

    // Шаг 2: удаление опциональных «тяжёлых» полей
    delete entry.stack
    delete entry.tec
    delete entry.mdc

    data = JSON.stringify(entry)
    size = Buffer.byteLength(data, 'utf8')

    if (size <= MAX_LOG_SIZE_BYTES) {
      return data
    }

    // Шаг 3: жёсткое усечение text
    if (typeof entry.text === 'string') {
      entry.text = entry.text.substring(0, 100) + TRUNCATION_SUFFIX
      data = JSON.stringify(entry)
    }

    return data
  }

  private sendLogData(logData: string): void {
    if (!this.connectionManager.isConnected()) {
      this.bufferManager.bufferLog(logData)
      return
    }

    try {
      const success = this.connectionManager.write(logData + '\n')
      if (!success) {
        this.bufferManager.bufferLog(logData)
      } else {
        this.metrics.sentLogs++
      }
    } catch (error) {
      writeStderr(
        `[TSLG] Failed to send log to TSLG: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
      this.bufferManager.bufferLog(logData)
    }
  }

  /**
   * Выводит лог-сообщение в консоль. Использует прямой write в
   * process.stdout / process.stderr для гарантированного отображения
   * в терминале независимо от возможных переопределений console.*.
   */
  private writeToConsole(
    level: string,
    message: string,
    event: string,
    error: Error | null,
    additionalData: any = {}
  ): void {
    if (!this.isConsoleOutputEnabled()) {
      return
    }

    const timestamp = new Date().toISOString()
    const levelUpper = level.toUpperCase()

    let logMessage = `[${timestamp}] [${levelUpper}] [${event}] ${this.safeStringify(
      message
    )}`

    if (error) {
      logMessage += ` | Error: ${this.safeStringify(error)}`
    }

    if (
      additionalData &&
      typeof additionalData === 'object' &&
      Object.keys(additionalData).length > 0
    ) {
      logMessage += ` | Data: ${this.safeStringify(additionalData)}`
    }

    switch (level) {
      case 'error':
        writeStderr(logMessage)
        if (error && error.stack) {
          writeStderr(error.stack)
        }
        break
      case 'warn':
        writeStderr(logMessage)
        break
      case 'info':
      default:
        writeStdout(logMessage)
    }
  }

  private safeStringify(obj: any, depth = 0): string {
    if (depth > 10) return '[Circular]'

    try {
      if (obj === null || obj === undefined) return String(obj)
      if (typeof obj === 'string') return obj
      if (typeof obj === 'number' || typeof obj === 'boolean')
        return String(obj)
      if (obj instanceof Error) return obj.toString()
      if (typeof obj === 'object') {
        return JSON.stringify(obj, null, 2)
      }
      return String(obj)
    } catch (error) {
      return `[Stringification error: ${
        error instanceof Error ? error.message : String(error)
      }]`
    }
  }

  info(message: string, event = 'Информация', additionalData: any = {}): void {
    this.log('info', message, event, null, additionalData)
  }

  warn(
    message: string,
    event = 'Предупреждение',
    additionalData: any = {}
  ): void {
    this.log('warn', message, event, null, additionalData)
  }

  error(
    message: string,
    event = 'Ошибка',
    error: Error | null = null,
    additionalData: any = {}
  ): void {
    this.log('error', message, event, error, additionalData)
  }

  sys(message: string, additionalData: any = {}): void {
    this.log('info', message, 'Системное', null, additionalData)
  }

  debug(message: string, event = 'Отладка', additionalData: any = {}): void {
    this.log('debug', message, event, null, additionalData)
  }

  verbose(message: string, event = 'Подробно', additionalData: any = {}): void {
    this.log('verbose', message, event, null, additionalData)
  }

  close(): void {
    if (this.ttlInterval) {
      clearInterval(this.ttlInterval)
      this.ttlInterval = null
    }

    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }

    if (this.bufferManager.getBufferSize() > 0) {
      writeStdout(
        `[TSLG] Attempting to flush ${this.bufferManager.getBufferSize()} buffered logs before shutdown`
      )
      this.bufferManager.flushBufferSync((data) =>
        this.connectionManager.write(data + '\n')
      )
    }

    this.connectionManager.close()
    writeStdout('[TSLG] Logger closed')
  }

  getStatus(): any {
    return {
      type: 'TSLGLogger',
      isProduction: process.env.NODE_ENV === 'production',
      isConnected: this.connectionManager.isConnected(),
      config: {
        host: this.config.host,
        port: this.config.port,
        appName: this.config.appName,
        consoleOutput: this.config.consoleOutput,
        consoleOutputEffective: this.isConsoleOutputEnabled(),
        connectionTTL: this.config.connectionTTL,
        reconnectionDelay: this.config.reconnectionDelay,
        enableUserData: this.config.enableUserData,
        sanitizeSensitiveData: this.config.sanitizeSensitiveData,
        enableFullContext: this.config.enableFullContext,
        sanitizePercentage: this.config.sanitizePercentage,
        logLevel: this.config.logLevel,
        userFieldsMapping: this.config.userFieldsMapping
      },
      metrics: { ...this.metrics },
      bufferSize: this.bufferManager.getBufferSize(),
      connectionAttempts: this.connectionManager.getConnectionAttempts(),
      lastConnectionTime: this.connectionManager.getLastConnectionTime()
    }
  }

  private startTTLMonitor(): void {
    if (this.ttlInterval) {
      clearInterval(this.ttlInterval)
    }

    this.ttlInterval = setInterval(async () => {
      if (!this.connectionManager.isConnected()) {
        return
      }

      const now = Date.now()
      const timeSinceReconnect =
        now - this.connectionManager.getLastConnectionTime()

      if (timeSinceReconnect >= this.config.connectionTTL) {
        writeStdout(
          `[TSLG] TTL ${this.config.connectionTTL}ms expired, scheduling reconnection for load balancing`
        )
        await this.performGracefulReconnect()
      }
    }, 1000)
  }

  private startBufferFlushMonitor(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }

    this.flushInterval = setInterval(() => {
      if (
        this.bufferManager.getBufferSize() > 0 &&
        this.connectionManager.isConnected() &&
        !this.bufferManager['isFlushing']
      ) {
        this.metrics.forcedFlushes++
        this.bufferManager.flushBuffer((data) =>
          this.connectionManager.write(data + '\n')
        )
      }
    }, this.config.bufferFlushInterval)
  }

  private async performGracefulReconnect(): Promise<void> {
    try {
      writeStdout('[TSLG] Starting graceful reconnection for load balancing')

      if (this.connectionManager.isConnected()) {
        const status = this.getStatus()

        if (status.bufferSize > 0) {
          writeStdout(
            `[TSLG] Waiting for ${status.bufferSize} buffered logs to be sent`
          )
          await this.waitForBufferFlush(status.bufferSize)
        }

        this.connectionManager.close()
      }

      this.connectionManager.connect()
      this.metrics.ttlReconnections++

      writeStdout('[TSLG] Graceful reconnection completed successfully')
    } catch (error) {
      writeStderr(
        `[TSLG] Graceful reconnection failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  private async waitForBufferFlush(initialBufferSize: number): Promise<void> {
    return new Promise((resolve) => {
      let attempts = 0
      const maxAttempts = 10

      const checkBuffer = () => {
        attempts++

        const status = this.getStatus()

        if (status.bufferSize === 0 || attempts >= maxAttempts) {
          if (status.bufferSize > 0) {
            writeStderr(
              `[TSLG] Buffer not fully flushed after ${attempts} attempts, ${status.bufferSize} logs remaining`
            )
          }
          resolve()
        } else {
          setTimeout(checkBuffer, 500)
        }
      }

      setTimeout(checkBuffer, 500)
    })
  }
}
