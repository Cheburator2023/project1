import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  forwardRef,
  CACHE_MANAGER
} from '@nestjs/common'
import { Cache } from 'cache-manager'
import { ModelsService } from './models.service'
import { Model } from './interfaces'

@Injectable()
export class ModelsCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ModelsCacheService.name)
  private readonly CACHE_KEY = 'models'
  private updateInterval: NodeJS.Timeout | null = null
  private isUpdating = false

  constructor(
    @Inject(forwardRef(() => ModelsService))
    private readonly modelsService: ModelsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('🚀 Инициализация кеша моделей')
    await this.loadModelsToCache()
    this.startPeriodicUpdate()
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('🛑 Остановка кеша моделей')
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
  }

  private async loadModelsToCache(): Promise<void> {
    try {
      this.isUpdating = true
      const models = await this.modelsService.getModels()
      await this.cacheManager.set(this.CACHE_KEY, models, 300000) // 5 minutes TTL
      this.logger.log(`✅ Кеш моделей обновлен: ${models.length} моделей`)
    } catch (error) {
      this.logger.error(`Ошибка кеша моделей: ${error.message}`)
    } finally {
      this.isUpdating = false
    }
  }

  private startPeriodicUpdate(): void {
    this.updateInterval = setInterval(async () => {
      await this.loadModelsToCache()
    }, 2 * 60 * 1000) // 2 minutes
  }

  /**
   * Получить все модели из кеша
   */
  async getCachedModels(): Promise<Model[]> {
    const models = await this.cacheManager.get<Model[]>(this.CACHE_KEY)
    return models || []
  }

  /**
   * Получить уникальные значения для указанной колонки из кеша
   */
  async getColumnValues(columnName: string): Promise<string[]> {
    const models = await this.getCachedModels()
    const values = models.map((model) => model[columnName])
    return values
  }

  /**
   * Получить уникальные значения для указанной колонки, исключая пустые и null
   */
  async getNonEmptyColumnValues(columnName: string): Promise<string[]> {
    const values = await this.getColumnValues(columnName)
    return values.filter(
      (value) => value !== null && value !== undefined && value.trim() !== ''
    )
  }

  /**
   * Проверить, обновляется ли кеш в данный момент
   */
  isUpdatingCache(): boolean {
    return this.isUpdating
  }

  /**
   * Принудительно обновить кеш
   */
  async forceUpdateCache(): Promise<void> {
    await this.loadModelsToCache()
  }
}
