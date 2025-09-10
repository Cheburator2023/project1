import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  forwardRef
} from '@nestjs/common'
import { ModelsService } from './models.service'
import { Model } from './interfaces'
import { UniversalCacheService, CacheConfig } from '../cache'
import { CacheFactoryService } from '../cache/cache-factory.service'

@Injectable()
export class ModelsCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ModelsCacheService.name)
  private cache: UniversalCacheService<Model[]>
  private readonly CACHE_NAME = 'models'

  constructor(
    @Inject(forwardRef(() => ModelsService))
    private readonly modelsService: ModelsService,
    private readonly cacheFactory: CacheFactoryService
  ) {
    const config: CacheConfig<Model[]> = {
      maxSize: 100 * 1024 * 1024, // 100MB
      updateInterval: 2 * 60 * 1000, // 2 минуты
      dataLoader: () => this.modelsService.getModels(),
      onError: (error) => {
        this.logger.error(`Ошибка кеша моделей: ${error.message}`)
      },
      enableMemoryMonitoring: true
    }

    this.cache = this.cacheFactory.createCache(this.CACHE_NAME, config)
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('🚀 Инициализация кеша моделей')
    await this.cache.initialize()
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('🛑 Остановка кеша моделей')
    await this.cache.onModuleDestroy()
  }

  /**
   * Получить все модели из кеша
   */
  getCachedModels(): Model[] {
    return this.cache.getCachedData() || []
  }

  /**
   * Получить уникальные значения для указанной колонки из кеша
   */
  getColumnValues(columnName: string): string[] {
    const models = this.getCachedModels()
    const values = models.map((model) => model[columnName])
    return values
  }

  /**
   * Получить уникальные значения для указанной колонки, исключая пустые и null
   */
  getNonEmptyColumnValues(columnName: string): string[] {
    return this.getColumnValues(columnName).filter(
      (value) => value !== null && value !== undefined && value.trim() !== ''
    )
  }

  /**
   * Проверить, обновляется ли кеш в данный момент
   */
  isUpdatingCache(): boolean {
    return this.cache.isUpdatingCache()
  }

  /**
   * Принудительно обновить кеш
   */
  async forceUpdateCache(): Promise<void> {
    await this.cache.forceUpdateCache()
  }
}
