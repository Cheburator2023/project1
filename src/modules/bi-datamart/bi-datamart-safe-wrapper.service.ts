import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class BiDatamartSafeWrapperService {
  private readonly logger = new Logger(BiDatamartSafeWrapperService.name)
  private isHealthy = true
  private consecutiveFailures = 0
  private recoveryAttempts = 0
  private readonly MAX_CONSECUTIVE_FAILURES = 
    parseInt(process.env.BI_DATAMART_MAX_FAILURES || '3')
  private readonly BASE_RECOVERY_TIMEOUT = 
    parseInt(process.env.BI_DATAMART_RECOVERY_TIMEOUT_MS || '300000')
  private readonly MAX_RECOVERY_TIMEOUT = 
    parseInt(process.env.BI_DATAMART_MAX_RECOVERY_TIMEOUT_MS || '7200000')
  private healthCheckResetTimer: NodeJS.Timeout | null = null

  async safeExecute<T>(
    operation: () => Promise<T>,
    fallbackValue: T,
    operationName: string,
    timeout = 30000
  ): Promise<T> {
    if (!this.isHealthy) {
      this.logger.warn(
        `⚠️ BI витрина временно отключена. Операция "${operationName}" пропущена`
      )
      return fallbackValue
    }

    try {
      const result = await this.executeWithTimeout(
        operation(),
        timeout,
        operationName
      )

      if (this.consecutiveFailures > 0) {
        this.logger.log(
          `✅ Операция "${operationName}" успешна. Сброс счетчика ошибок.`
        )
        this.consecutiveFailures = 0
        this.recoveryAttempts = 0
      }

      return result
    } catch (error) {
      return this.handleError(error, fallbackValue, operationName)
    }
  }

  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operationName: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `Таймаут операции "${operationName}" (${timeoutMs}мс истекло)`
          )
        )
      }, timeoutMs)
    })

    return Promise.race([promise, timeoutPromise])
  }

  private handleError<T>(
    error: Error,
    fallbackValue: T,
    operationName: string
  ): T {
    this.consecutiveFailures++

    this.logger.error(
      `❌ Ошибка в BI витрине [${operationName}]: ${error.message} (последовательных ошибок: ${this.consecutiveFailures})`,
      error.stack
    )

    if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      this.disableDatamart()
    }

    return fallbackValue
  }

  private disableDatamart(): void {
    if (this.isHealthy) {
      this.isHealthy = false
      this.logger.error(
        `🚨 BI витрина ОТКЛЮЧЕНА автоматически после ${this.consecutiveFailures} последовательных ошибок`
      )
      this.logger.warn(
        '⚠️ Основное приложение продолжает работать в обычном режиме'
      )

      this.scheduleHealthRestore()
    }
  }

  private scheduleHealthRestore(): void {
    if (this.healthCheckResetTimer) {
      clearTimeout(this.healthCheckResetTimer)
    }

    this.recoveryAttempts++
    const recoveryTimeout = Math.min(
      this.BASE_RECOVERY_TIMEOUT * Math.pow(2, this.recoveryAttempts - 1),
      this.MAX_RECOVERY_TIMEOUT
    )

    const recoveryMinutes = Math.round(recoveryTimeout / 60000)
    this.logger.log(
      `🔄 Попытка восстановления BI витрины через ${recoveryMinutes} минут (попытка #${this.recoveryAttempts})`
    )

    this.healthCheckResetTimer = setTimeout(() => {
      this.logger.log(
        `🔄 Попытка восстановления BI витрины (попытка #${this.recoveryAttempts})...`
      )
      this.isHealthy = true
      this.consecutiveFailures = 0
      this.logger.log('✅ BI витрина снова активна')
    }, recoveryTimeout)
  }

  getHealthStatus() {
    return {
      isHealthy: this.isHealthy,
      consecutiveFailures: this.consecutiveFailures,
      maxFailuresAllowed: this.MAX_CONSECUTIVE_FAILURES,
      recoveryAttempts: this.recoveryAttempts,
      nextRecoveryTimeout: this.isHealthy
        ? 0
        : Math.min(
            this.BASE_RECOVERY_TIMEOUT * Math.pow(2, this.recoveryAttempts),
            this.MAX_RECOVERY_TIMEOUT
          )
    }
  }

  forceEnable(): void {
    this.isHealthy = true
    this.consecutiveFailures = 0
    this.recoveryAttempts = 0
    if (this.healthCheckResetTimer) {
      clearTimeout(this.healthCheckResetTimer)
      this.healthCheckResetTimer = null
    }
    this.logger.log('✅ BI витрина принудительно включена администратором')
  }

  forceDisable(): void {
    this.isHealthy = false
    this.logger.warn('⚠️ BI витрина принудительно отключена администратором')
  }
}

