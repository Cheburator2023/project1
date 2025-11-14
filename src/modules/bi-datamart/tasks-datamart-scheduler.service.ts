import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy
} from '@nestjs/common'
import { TasksDatamartService } from './tasks-datamart.service'
import { BiDatamartSafeWrapperService } from './bi-datamart-safe-wrapper.service'

@Injectable()
export class TasksDatamartSchedulerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(TasksDatamartSchedulerService.name)
  private syncInProgress = false
  private syncInterval: NodeJS.Timeout | null = null
  private readonly SYNC_HOUR = this.normalizeHour(
    process.env.BI_DATAMART_TASKS_SYNC_HOUR,
    3
  )
  private readonly SYNC_MINUTE = this.normalizeMinute(
    process.env.BI_DATAMART_TASKS_SYNC_MINUTE,
    0
  )
  private readonly SYNC_TIMEOUT = 
    parseInt(process.env.BI_DATAMART_SYNC_TIMEOUT_MS || '1800000')
  private readonly isEnabled: boolean

  constructor(
    private readonly tasksDatamartService: TasksDatamartService,
    private readonly safeWrapper: BiDatamartSafeWrapperService
  ) {
    this.isEnabled = process.env.BI_DATAMART_ENABLED !== 'false'
    
    this.logger.log(
      `🔧 TasksDatamartSchedulerService constructor: BI_DATAMART_ENABLED=${process.env.BI_DATAMART_ENABLED}, isEnabled=${this.isEnabled}, SYNC_TIMEOUT=${this.SYNC_TIMEOUT}ms`
    )
  }

  private startDailySync(): void {
    this.logger.log(
      `🕐 Настройка ежедневной синхронизации Tasks на ${this.formatTime(
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
    this.logger.log(
      `⏰ Следующая синхронизация Tasks: ${nextSync.toLocaleString()}`
    )

    setTimeout(() => {
      this.performDailySync()
      this.syncInterval = setInterval(() => {
        this.performDailySync()
      }, 24 * 60 * 60 * 1000)
    }, timeUntilNextSync)

    if (process.env.NODE_ENV === 'development') {
      this.logger.log(
        '🔧 Development mode: запуск тестовой синхронизации Tasks через 10 секунд'
      )
      setTimeout(() => this.performDailySync(), 10000)
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
      this.logger.warn('⚠️ Синхронизация Tasks уже выполняется, пропускаем')
      return
    }

    this.syncInProgress = true
    this.logger.log('🌅 Начало ежедневной синхронизации Tasks BI витрины')

    try {
      const result = await this.safeWrapper.safeExecute(
        () => this.tasksDatamartService.syncAllTasksToDatamart(),
        {
          success: false,
          totalProcessed: 0,
          inserted: 0,
          deleted: 0,
          errors: ['Синхронизация Tasks не выполнена из-за ошибки защитного механизма'],
          duration_ms: 0
        },
        'syncAllTasksToDatamart',
        this.SYNC_TIMEOUT
      )

      if (result.success) {
        this.logger.log(`✅ Ежедневная синхронизация Tasks завершена успешно`)
        this.logger.log(
          `📊 Обработано ${result.totalProcessed}, Вставлено ${result.inserted}, Удалено ${result.deleted}`
        )

        if (result.errors.length > 0) {
          this.logger.warn(
            `⚠️ Ошибки при синхронизации: ${result.errors.length}`
          )
        }
      } else {
        this.logger.error(
          `❌ Ежедневная синхронизация Tasks завершилась с ошибками: ${result.errors.join(
            ', '
          )}`
        )
      }
    } catch (error) {
      this.logger.error(
        `💥 Неожиданная критическая ошибка (прошла через safe wrapper): ${error.message}`,
        error.stack
      )
      this.logger.warn('⚠️ Основное приложение продолжает работать')
    } finally {
      this.syncInProgress = false
    }
  }

  async onModuleInit(): Promise<void> {
    this.logger.log(
      `🔍 TasksDatamartSchedulerService.onModuleInit() вызван. isEnabled=${this.isEnabled}, env=${process.env.BI_DATAMART_ENABLED}`
    )

    if (!this.isEnabled) {
      this.logger.warn(
        `⚠️ BI витрина Tasks ОТКЛЮЧЕНА (BI_DATAMART_ENABLED=${process.env.BI_DATAMART_ENABLED})`
      )
      return
    }

    this.logger.log('🚀 Запуск планировщика Tasks BI витрины')
    this.startDailySync()
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('🛑 Остановка планировщика Tasks BI витрины')
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }
}
