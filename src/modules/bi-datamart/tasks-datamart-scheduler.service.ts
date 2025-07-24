import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { TasksDatamartService } from './tasks-datamart.service'

@Injectable()
export class TasksDatamartSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TasksDatamartSchedulerService.name)
  private syncInProgress = false
  private syncInterval: NodeJS.Timeout | null = null
  private readonly SYNC_HOUR = 3 // Синхронизация в 3:00 ночи (после моделей)

  constructor(
    private readonly tasksDatamartService: TasksDatamartService
  ) {}

  /**
   * Запуск ежедневной синхронизации в 3:00 ночи
   */
  private startDailySync(): void {
    this.logger.log(`🕐 Настройка ежедневной синхронизации Tasks на ${this.SYNC_HOUR}:00`)

    // Рассчитываем время до следующей синхронизации
    const now = new Date()
    const nextSync = new Date()
    nextSync.setHours(this.SYNC_HOUR, 0, 0, 0)

    // Если время уже прошло сегодня, планируем на завтра
    if (nextSync <= now) {
      nextSync.setDate(nextSync.getDate() + 1)
    }

    const timeUntilNextSync = nextSync.getTime() - now.getTime()
    this.logger.log(`⏰ Следующая синхронизация Tasks: ${nextSync.toLocaleString()}`)

    // Планируем первую синхронизацию на нужное время
    setTimeout(() => {
      this.performDailySync()
      // Устанавливаем ежедневный интервал после первого запуска
      this.syncInterval = setInterval(() => {
        this.performDailySync()
      }, 24 * 60 * 60 * 1000)
    }, timeUntilNextSync)

    // В режиме разработки запускаем синхронизацию через 10 секунд (после моделей)
    if (process.env.NODE_ENV === 'development') {
      this.logger.log('🔧 Development mode: запуск тестовой синхронизации Tasks через 10 секунд')
      setTimeout(() => this.performDailySync(), 10000)
    }
  }

  /**
   * Выполнение ежедневной синхронизации
   */
  private async performDailySync(): Promise<void> {
    if (this.syncInProgress) {
      this.logger.warn('⚠️ Синхронизация Tasks уже выполняется, пропускаем')
      return
    }

    this.syncInProgress = true
    this.logger.log('🌅 Начало ежедневной синхронизации Tasks BI витрины')

    try {
      const result = await this.tasksDatamartService.syncAllTasksToDatamart()
      
      if (result.success) {
        this.logger.log(`✅ Ежедневная синхронизация Tasks завершена успешно`)
        this.logger.log(`📊 Обработано ${result.totalProcessed}, Вставлено ${result.inserted}, Обновлено ${result.updated}, Удалено ${result.deleted}, Пропущено ${result.skipped}`)
        
        if (result.errors.length > 0) {
          this.logger.warn(`⚠️ Ошибки при синхронизации: ${result.errors.length}`)
        }
      } else {
        this.logger.error(`❌ Ежедневная синхронизация Tasks завершилась с ошибками: ${result.errors.join(', ')}`)
      }
    } catch (error) {
      this.logger.error(`💥 Критическая ошибка ежедневной синхронизации Tasks: ${error.message}`, error.stack)
    } finally {
      this.syncInProgress = false
    }
  }

  /**
   * Инициализация при старте модуля
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('🚀 Запуск планировщика Tasks BI витрины')
    this.startDailySync()
  }

  /**
   * Очистка при остановке модуля
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('🛑 Остановка планировщика Tasks BI витрины')
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }
} 