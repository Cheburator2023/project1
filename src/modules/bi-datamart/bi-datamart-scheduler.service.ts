import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy
} from '@nestjs/common'
import { BiDatamartService } from './bi-datamart.service'
@Injectable()
export class BiDatamartSchedulerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(BiDatamartSchedulerService.name)
  private syncInProgress = false
  private syncInterval: NodeJS.Timeout | null = null
  private readonly SYNC_HOUR = this.normalizeHour(
    process.env.BI_DATAMART_MODELS_SYNC_HOUR,
    2
  )
  private readonly SYNC_MINUTE = this.normalizeMinute(
    process.env.BI_DATAMART_MODELS_SYNC_MINUTE,
    0
  )
  private readonly isEnabled: boolean

  constructor(
    private readonly biDatamartService: BiDatamartService
  ) {
    this.isEnabled = process.env.BI_DATAMART_ENABLED !== 'false'
    
    this.logger.log(
      `🔧 BiDatamartSchedulerService constructor: BI_DATAMART_ENABLED=${process.env.BI_DATAMART_ENABLED}, isEnabled=${this.isEnabled}`
    )
  }

  private startDailySync(): void {
    this.logger.log(
      `🕐 Настройка ежедневной синхронизации на ${this.formatTime(
        this.SYNC_HOUR,
        this.SYNC_MINUTE
      )}`
    )

    const now = new Date()
    const nextSync = new Date()
    nextSync.setHours(this.SYNC_HOUR, this.SYNC_MINUTE, 0, 0)

    if (nextSync <= now) {
      nextSync.setDate(nextSync.getDate() + 1)
    }

    const timeUntilNextSync = nextSync.getTime() - now.getTime()
    this.logger.log(`⏰ Следующая синхронизация: ${nextSync.toLocaleString()}`)

    setTimeout(() => {
      this.performDailySync()
      this.syncInterval = setInterval(() => {
        this.performDailySync()
      }, 24 * 60 * 60 * 1000)
    }, timeUntilNextSync)

    if (process.env.NODE_ENV === 'development') {
      this.logger.log(
        '🔧 Development mode: запуск тестовой синхронизации через 5 секунд'
      )
      setTimeout(() => this.performDailySync(), 5000)
    }
  }

  private normalizeHour(value: string | undefined, fallback: number): number {
    const parsed = parseInt(value ?? '')
    if (isNaN(parsed)) {
      return fallback
    }
    return Math.min(Math.max(parsed, 0), 23)
  }

  private normalizeMinute(value: string | undefined, fallback: number): number {
    const parsed = parseInt(value ?? '')
    if (isNaN(parsed)) {
      return fallback
    }
    return Math.min(Math.max(parsed, 0), 59)
  }

  private formatTime(hour: number, minute: number): string {
    const h = hour.toString().padStart(2, '0')
    const m = minute.toString().padStart(2, '0')
    return `${h}:${m}`
  }

  private async performDailySync(): Promise<void> {
    if (this.syncInProgress) {
      this.logger.warn('⚠️ Синхронизация уже выполняется, пропускаем')
      return
    }

    this.syncInProgress = true
    this.logger.log('🌅 Начало ежедневной синхронизации BI витрины')

    try {
      const result = await this.biDatamartService.syncAllModelsToDatamart()

      if (result.success) {
        this.logger.log(`✅ Ежедневная синхронизация завершена успешно`)
        this.logger.log(
          `📊 Обработано ${result.totalProcessed}, Вставлено ${result.inserted}, Обновлено ${result.updated}, Пропущено ${result.skipped}`
        )

        if (result.errors.length > 0) {
          this.logger.warn(
            `⚠️ Ошибки при синхронизации: ${result.errors.length}`
          )
        }
      } else {
        this.logger.error(
          `❌ Ежедневная синхронизация завершилась с ошибками: ${result.errors.join(
            ', '
          )}`
        )
      }
    } catch (error) {
      this.logger.error(
        `💥 Критическая ошибка синхронизации: ${
          error instanceof Error ? error.message : error
        }`,
        error instanceof Error ? error.stack : undefined
      )
      this.logger.warn('⚠️ Основное приложение продолжает работать')
    } finally {
      this.syncInProgress = false
    }
  }

  async onModuleInit(): Promise<void> {
    this.logger.log(
      `🔍 BiDatamartSchedulerService.onModuleInit() вызван. isEnabled=${this.isEnabled}, env=${process.env.BI_DATAMART_ENABLED}`
    )

    if (!this.isEnabled) {
      this.logger.warn(
        `⚠️ BI витрина Models ОТКЛЮЧЕНА (BI_DATAMART_ENABLED=${process.env.BI_DATAMART_ENABLED})`
      )
      return
    }

    this.logger.log('🚀 Запуск планировщика BI витрины Models')
    this.startDailySync()
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('🛑 Остановка планировщика BI витрины')
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }
}
