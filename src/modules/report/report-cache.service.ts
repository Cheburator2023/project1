import { Injectable, Inject, CACHE_MANAGER } from '@nestjs/common'
import { Cache } from 'cache-manager'
import * as crypto from 'crypto'

@Injectable()
export class ReportCacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      return await this.cacheManager.get<T>(key)
    } catch (error) {
      return null
    }
  }

  async set<T>(key: string, value: T, ttlMs: number = 300000): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttlMs)
    } catch (error) {
      // Игнорируем ошибки кэширования, чтобы не ломать основной функционал
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key)
    } catch (error) {
      // Игнорируем ошибки
    }
  }

  generateJsonReportCacheKey(template_id?: number, date?: string, groups?: string[]): string {
    const templateKey = template_id ? template_id.toString() : 'all'
    const dateKey = date || 'current'
    const groupsHash = groups && groups.length > 0
      ? crypto.createHash('md5').update(groups.sort().join(',')).digest('hex')
      : 'no_groups'

    return `report_json:${templateKey}:${dateKey}:${groupsHash}`
  }
}
