import { Injectable, Logger } from '@nestjs/common'
import { UniversalCacheService, CacheConfig } from './universal-cache.service'

export interface CacheInstance<T = any> {
  name: string
  cache: UniversalCacheService<T>
  config: CacheConfig<T>
}

@Injectable()
export class CacheFactoryService {
  private readonly logger = new Logger(CacheFactoryService.name)
  private caches = new Map<string, CacheInstance>()

  /**
   * Создать новый экземпляр кеша
   */
  createCache<T>(
    name: string,
    config: CacheConfig<T>
  ): UniversalCacheService<T> {
    if (this.caches.has(name)) {
      this.logger.warn(`Кеш с именем "${name}" уже существует`)
      return this.caches.get(name)!.cache as UniversalCacheService<T>
    }

    const cache = new UniversalCacheService<T>(config)
    const instance: CacheInstance<T> = {
      name,
      cache,
      config
    }

    this.caches.set(name, instance)
    this.logger.log(`✅ Создан кеш "${name}"`)

    return cache
  }

  /**
   * Получить экземпляр кеша по имени
   */
  getCache<T>(name: string): UniversalCacheService<T> | null {
    const instance = this.caches.get(name)
    return instance ? (instance.cache as UniversalCacheService<T>) : null
  }

  /**
   * Удалить кеш
   */
  async removeCache(name: string): Promise<boolean> {
    const instance = this.caches.get(name)
    if (!instance) {
      return false
    }

    await instance.cache.onModuleDestroy()
    this.caches.delete(name)
    this.logger.log(`🗑️ Удален кеш "${name}"`)
    return true
  }

  /**
   * Получить список всех кешей
   */
  getAllCaches(): CacheInstance[] {
    return Array.from(this.caches.values())
  }

  /**
   * Получить статистику всех кешей
   */
  getAllCacheStats(): Record<string, any> {
    const stats: Record<string, any> = {}

    for (const [name, instance] of this.caches) {
      stats[name] = instance.cache.getStatus()
    }

    return stats
  }

  /**
   * Принудительно обновить все кеши
   */
  async refreshAllCaches(): Promise<void> {
    const promises = Array.from(this.caches.values()).map((instance) =>
      instance.cache.forceUpdateCache().catch((error) => {
        this.logger.error(
          `Ошибка обновления кеша "${instance.name}": ${error.message}`
        )
      })
    )

    await Promise.all(promises)
    this.logger.log('🔄 Все кеши обновлены')
  }

  /**
   * Очистить все кеши
   */
  clearAllCaches(): void {
    for (const instance of this.caches.values()) {
      instance.cache.clearCache()
    }
    this.logger.log('🗑️ Все кеши очищены')
  }

  /**
   * Проверить существование кеша
   */
  hasCache(name: string): boolean {
    return this.caches.has(name)
  }

  /**
   * Получить количество кешей
   */
  getCacheCount(): number {
    return this.caches.size
  }
}
