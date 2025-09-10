import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { memorySizeOf } from '../../utils/memorySizeOf'

export interface CacheConfig<T> {
  maxSize?: number
  updateInterval?: number
  dataLoader: () => Promise<T>
  onError?: (error: Error) => void
  enableMemoryMonitoring?: boolean
}

export interface CacheStatus<T> {
  isUpdating: boolean
  lastUpdate: Date | null
  dataSize: number
  memoryUsage?: {
    totalSize: number
    formattedSize: string
  }
  hasData: boolean
}

@Injectable()
export class UniversalCacheService<T = any> implements OnModuleDestroy {
  private readonly logger = new Logger(UniversalCacheService.name)
  private cache: T | null = null
  private updateInterval: NodeJS.Timeout | null = null
  private isUpdating = false
  private lastUpdate: Date | null = null
  private config: CacheConfig<T>

  constructor(config: CacheConfig<T>) {
    this.config = {
      maxSize: 100 * 1024 * 1024, // 100MB по умолчанию
      updateInterval: 2 * 60 * 1000, // 2 минуты
      enableMemoryMonitoring: true,
      ...config
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('🛑 Остановка универсального кеша')
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
    this.cache = null
  }

  /**
   * Инициализировать кеш с автоматическим обновлением
   */
  async initialize(): Promise<void> {
    this.logger.log('🚀 Инициализация универсального кеша')
    try {
      await this.updateCache()
    } catch (error) {
      this.logger.warn(
        `⚠️ Не удалось загрузить кеш при инициализации: ${error.message}`
      )
      if (this.config.onError) {
        this.config.onError(error)
      }
    }
    this.startPeriodicUpdate()
  }

  /**
   * Получить данные из кеша
   */
  getCachedData(): T | null {
    return this.cache
  }

  /**
   * Проверить, обновляется ли кеш в данный момент
   */
  isUpdatingCache(): boolean {
    return this.isUpdating
  }

  /**
   * Получить статус кеша
   */
  getStatus(): CacheStatus<T> {
    const status: CacheStatus<T> = {
      isUpdating: this.isUpdating,
      lastUpdate: this.lastUpdate,
      dataSize: this.cache ? this.getDataSize() : 0,
      hasData: this.cache !== null
    }

    if (this.config.enableMemoryMonitoring && this.cache) {
      status.memoryUsage = memorySizeOf(this.cache)
    }

    return status
  }

  /**
   * Принудительно обновить кеш
   */
  async forceUpdateCache(): Promise<void> {
    // Если кеш уже обновляется, ждем завершения текущего обновления
    while (this.isUpdating) {
      await new Promise((resolve) => setTimeout(resolve, 10))
    }

    // Запускаем обновление кеша
    await this.updateCache()
  }

  /**
   * Очистить кеш
   */
  clearCache(): void {
    this.cache = null
    this.lastUpdate = null
    this.logger.log('🗑️ Кеш очищен')
  }

  /**
   * Установить данные в кеш вручную
   */
  setCachedData(data: T): void {
    this.cache = data
    this.lastUpdate = new Date()
    this.checkCacheSize(data)
    this.logger.log('📝 Данные установлены в кеш вручную')
  }

  /**
   * Обновить конфигурацию кеша
   */
  updateConfig(newConfig: Partial<CacheConfig<T>>): void {
    this.config = { ...this.config, ...newConfig }

    // Перезапустить периодическое обновление если изменился интервал
    if (newConfig.updateInterval && this.updateInterval) {
      this.stopPeriodicUpdate()
      this.startPeriodicUpdate()
    }
  }

  /**
   * Остановить периодическое обновление
   */
  stopPeriodicUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
      this.logger.log('⏹️ Периодическое обновление остановлено')
    }
  }

  private async updateCache(): Promise<void> {
    if (this.isUpdating) {
      this.logger.warn('Обновление кеша уже выполняется, пропускаем')
      return
    }

    this.isUpdating = true
    const startTime = Date.now()

    try {
      this.logger.log('📥 Начинаем обновление кеша')

      const data = await this.config.dataLoader()
      this.checkCacheSize(data)

      this.cache = data
      this.lastUpdate = new Date()

      const duration = Date.now() - startTime
      this.logger.log(`✅ Кеш обновлен за ${duration}мс`)
    } catch (error) {
      this.logger.error(`❌ Ошибка при обновлении кеша: ${error.message}`)
      if (this.config.onError) {
        this.config.onError(error)
      }
    } finally {
      this.isUpdating = false
    }
  }

  private checkCacheSize(data: T): void {
    if (!this.config.enableMemoryMonitoring) return

    const memoryUsage = memorySizeOf(data)

    if (memoryUsage.totalSize > this.config.maxSize!) {
      this.logger.warn(
        `⚠️ Размер кеша (${
          memoryUsage.formattedSize
        }) превышает лимит (${this.formatBytes(this.config.maxSize!)})`
      )
    }

    const processMemory = process.memoryUsage()
    const heapUsedMB = Math.round(processMemory.heapUsed / 1024 / 1024)
    this.logger.log(
      `📊 Кеш: ${memoryUsage.formattedSize}, Heap: ${heapUsedMB}MB`
    )
  }

  private startPeriodicUpdate(): void {
    if (!this.config.updateInterval) return

    this.updateInterval = setInterval(async () => {
      try {
        await this.updateCache()
      } catch (error) {
        this.logger.error(
          'Ошибка при периодическом обновлении кеша:',
          error.message
        )
        if (this.config.onError) {
          this.config.onError(error)
        }
      }
    }, this.config.updateInterval)

    this.logger.log(
      `⏰ Периодическое обновление настроено на ${
        this.config.updateInterval / 1000 / 60
      } минут`
    )
  }

  private getDataSize(): number {
    if (!this.cache) return 0

    if (Array.isArray(this.cache)) {
      return this.cache.length
    }

    if (typeof this.cache === 'object') {
      return Object.keys(this.cache).length
    }

    return 1
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' bytes'
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB'
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB'
    else return (bytes / 1073741824).toFixed(2) + ' GB'
  }
}
