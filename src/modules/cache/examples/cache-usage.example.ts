import { Injectable } from '@nestjs/common'
import { CacheFactoryService, CacheConfig } from '../index'

// Пример интерфейса для пользователей
interface User {
  id: string
  name: string
  email: string
}

// Пример интерфейса для настроек
interface AppSettings {
  theme: string
  language: string
  notifications: boolean
}

@Injectable()
export class CacheUsageExample {
  constructor(private readonly cacheFactory: CacheFactoryService) {}

  /**
   * Пример создания кеша для пользователей
   */
  async createUsersCache() {
    const usersConfig: CacheConfig<User[]> = {
      maxSize: 50 * 1024 * 1024, // 50MB
      updateInterval: 10 * 60 * 1000, // 10 минут
      dataLoader: async () => {
        // Здесь должна быть логика загрузки пользователей из БД
        return [
          { id: '1', name: 'Иван Иванов', email: 'ivan@example.com' },
          { id: '2', name: 'Петр Петров', email: 'petr@example.com' }
        ]
      },
      onError: (error) => {
        console.error('Ошибка кеша пользователей:', error.message)
      }
    }

    const usersCache = this.cacheFactory.createCache('users', usersConfig)
    await usersCache.initialize()

    return usersCache
  }

  /**
   * Пример создания кеша для настроек приложения
   */
  async createSettingsCache() {
    const settingsConfig: CacheConfig<AppSettings> = {
      maxSize: 1 * 1024 * 1024, // 1MB
      updateInterval: 60 * 60 * 1000, // 1 час
      dataLoader: async () => {
        // Здесь должна быть логика загрузки настроек
        return {
          theme: 'dark',
          language: 'ru',
          notifications: true
        }
      },
      enableMemoryMonitoring: false // Отключаем мониторинг для небольших данных
    }

    const settingsCache = this.cacheFactory.createCache(
      'settings',
      settingsConfig
    )
    await settingsCache.initialize()

    return settingsCache
  }

  /**
   * Пример создания кеша без автоматического обновления
   */
  async createStaticCache() {
    const staticConfig: CacheConfig<string[]> = {
      updateInterval: 0, // Отключаем автоматическое обновление
      dataLoader: async () => {
        return ['статичные', 'данные', 'которые', 'редко', 'меняются']
      }
    }

    const staticCache = this.cacheFactory.createCache('static', staticConfig)
    await staticCache.initialize()

    return staticCache
  }

  /**
   * Пример использования кешей
   */
  async demonstrateUsage() {
    // Создаем кеши
    const usersCache = await this.createUsersCache()
    const settingsCache = await this.createSettingsCache()
    const staticCache = await this.createStaticCache()

    // Получаем данные из кешей
    const users = usersCache.getCachedData()
    const settings = settingsCache.getCachedData()
    const staticData = staticCache.getCachedData()

    console.log('Пользователи:', users)
    console.log('Настройки:', settings)
    console.log('Статичные данные:', staticData)

    // Проверяем статус кешей
    console.log('Статус кеша пользователей:', usersCache.getStatus())
    console.log('Статус кеша настроек:', settingsCache.getStatus())

    // Принудительно обновляем кеш
    await usersCache.forceUpdateCache()

    // Устанавливаем данные вручную
    settingsCache.setCachedData({
      theme: 'light',
      language: 'en',
      notifications: false
    })

    // Получаем статистику всех кешей
    const allStats = this.cacheFactory.getAllCacheStats()
    console.log('Статистика всех кешей:', allStats)
  }
}
