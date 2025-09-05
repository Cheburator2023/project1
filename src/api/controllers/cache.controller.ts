import {
  Controller,
  Param,
  Get,
  Post,
  HttpStatus,
  HttpException,
  NotFoundException
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import { ModelsCacheService } from 'src/modules/models/models-cache.service'
import { CacheFactoryService } from 'src/modules/cache/cache-factory.service'

@ApiTags('Кеширование')
@Controller('cache')
export class CacheController {
  constructor(
    private readonly modelsCacheService: ModelsCacheService,
    private readonly cacheFactory: CacheFactoryService
  ) {}

  @ApiOperation({
    summary: 'Получить статус кеша моделей',
    description: 'Возвращает информацию о состоянии кеша моделей'
  })
  @ApiResponse({ status: 200, description: 'Статус кеша успешно получен' })
  @ApiResponse({ status: 500, description: 'Внутренняя ошибка сервера' })
  @Get('/models/status')
  async getModelsCacheStatus() {
    try {
      const cachedModels = this.modelsCacheService.getCachedModels()
      const isUpdating = this.modelsCacheService.isUpdatingCache()

      return {
        success: true,
        data: {
          modelsCount: cachedModels.length,
          isUpdating,
          lastUpdate: cachedModels.length > 0 ? 'Кеш загружен' : 'Кеш пуст'
        }
      }
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @ApiOperation({
    summary: 'Обновить кеш моделей',
    description: 'Принудительно обновляет кеш моделей'
  })
  @ApiResponse({ status: 200, description: 'Кеш моделей успешно обновлен' })
  @ApiResponse({ status: 500, description: 'Внутренняя ошибка сервера' })
  @Post('/models/refresh')
  async refreshModelsCache() {
    try {
      await this.modelsCacheService.forceUpdateCache()
      return {
        success: true,
        message: 'Кеш моделей успешно обновлен'
      }
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @ApiOperation({
    summary: 'Получить значения колонки из кеша',
    description:
      'Возвращает уникальные значения указанной колонки из кеша моделей'
  })
  @ApiParam({
    name: 'columnName',
    description: 'Название колонки',
    type: 'string'
  })
  @ApiResponse({
    status: 200,
    description: 'Значения колонки успешно получены'
  })
  @ApiResponse({ status: 500, description: 'Внутренняя ошибка сервера' })
  @Get('/models/column-values/:columnName')
  async getColumnValuesFromCache(@Param('columnName') columnName: string) {
    try {
      const values = this.modelsCacheService.getNonEmptyColumnValues(columnName)
      return {
        success: true,
        data: {
          columnName,
          values,
          count: values.length
        }
      }
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @ApiOperation({
    summary: 'Получить содержимое всех кешей',
    description:
      'Возвращает информацию о всех активных кешах в системе с превью данных'
  })
  @ApiResponse({
    status: 200,
    description: 'Содержимое кешей успешно получено'
  })
  @ApiResponse({ status: 500, description: 'Внутренняя ошибка сервера' })
  @Get('/all')
  async getAllCacheContents() {
    try {
      const allCaches = this.cacheFactory.getAllCaches()
      const cacheContents = {}

      for (const cacheInstance of allCaches) {
        const { name, cache } = cacheInstance
        const status = cache.getStatus()
        const data = cache.getCachedData()

        cacheContents[name] = {
          status,
          data: data ? (Array.isArray(data) ? data.slice(0, 10) : data) : null,
          dataPreview:
            Array.isArray(data) && data.length > 10
              ? `Показано 10 из ${data.length} элементов`
              : null
        }
      }

      return {
        success: true,
        data: {
          totalCaches: allCaches.length,
          caches: cacheContents
        }
      }
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @ApiOperation({
    summary: 'Получить кеш по ключу',
    description: 'Возвращает полное содержимое кеша по указанному ключу'
  })
  @ApiParam({
    name: 'key',
    description: 'Ключ кеша',
    type: 'string'
  })
  @ApiResponse({ status: 200, description: 'Кеш найден и возвращен' })
  @ApiResponse({ status: 404, description: 'Кеш с указанным ключом не найден' })
  @ApiResponse({ status: 500, description: 'Внутренняя ошибка сервера' })
  @Get('/:key')
  async getCacheByKey(@Param('key') key: string) {
    try {
      const cache = this.cacheFactory.getCache(key)

      if (!cache) {
        throw new NotFoundException(`Кеш с ключом "${key}" не найден`)
      }

      const status = cache.getStatus()
      const data = cache.getCachedData()

      return {
        success: true,
        data: {
          key,
          status,
          data
        }
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}
