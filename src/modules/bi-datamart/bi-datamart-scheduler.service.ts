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
  private readonly SYNC_HOUR = 2 // Синхронизация в 2:00 ночи

  constructor(private readonly biDatamartService: BiDatamartService) {}

  /**
   * Запуск ежедневной синхронизации в 2:00 ночи
   */
  private startDailySync(): void {
    this.logger.log(
      `🕐 Настройка ежедневной синхронизации на ${this.SYNC_HOUR}:00`
    )

    // Рассчитываем время до следующей синхронизации
    const now = new Date()
    const nextSync = new Date()
    nextSync.setHours(this.SYNC_HOUR, 0, 0, 0)

    // Если время уже прошло сегодня, планируем на завтра
    if (nextSync <= now) {
      nextSync.setDate(nextSync.getDate() + 1)
    }

    const timeUntilNextSync = nextSync.getTime() - now.getTime()
    this.logger.log(`⏰ Следующая синхронизация: ${nextSync.toLocaleString()}`)

    // Планируем первую синхронизацию на нужное время
    setTimeout(() => {
      this.performDailySync()
      // Устанавливаем ежедневный интервал после первого запуска
      this.syncInterval = setInterval(() => {
        this.performDailySync()
      }, 24 * 60 * 60 * 1000)
    }, timeUntilNextSync)

    // В режиме разработки запускаем синхронизацию через 5 секунд
    if (process.env.NODE_ENV === 'development') {
      this.logger.log(
        '🔧 Development mode: запуск тестовой синхронизации через 5 секунд'
      )
      setTimeout(() => this.performDailySync(), 5000)
    }
  }

  /**
   * Выполнение ежедневной синхронизации
   */
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
        `💥 Критическая ошибка ежедневной синхронизации: ${error.message}`,
        error.stack
      )
    } finally {
      this.syncInProgress = false
    }
  }

  /**
   * Инициализация при старте модуля
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('🚀 Запуск планировщика BI витрины')
    this.startDailySync()
  }

  /**
   * Очистка при остановке модуля
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('�� Остановка планировщика BI витрины')
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }
}
