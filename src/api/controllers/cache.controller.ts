import {
  Controller,
  Param,
  Get,
  Post,
  HttpStatus,
  HttpException,
  NotFoundException,
  Inject,
  CACHE_MANAGER
} from '@nestjs/common'
import { Cache } from 'cache-manager'
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import { ModelsCacheService } from 'src/modules/models/models-cache.service'

@ApiTags('Кеширование')
@Controller('cache')
export class CacheController {
  constructor(
    private readonly modelsCacheService: ModelsCacheService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
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
      const cachedModels = await this.modelsCacheService.getCachedModels()
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
      throw new HttpException(
        {
          message: 'Внутренняя ошибка сервера',
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          stack: error.stack
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      )
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
      throw new HttpException(
        {
          message: 'Внутренняя ошибка сервера',
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          stack: error.stack
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      )
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
      const values = await this.modelsCacheService.getNonEmptyColumnValues(
        columnName
      )
      return {
        success: true,
        data: {
          columnName,
          values,
          count: values.length
        }
      }
    } catch (error) {
      throw new HttpException(
        {
          message: 'Внутренняя ошибка сервера',
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          stack: error.stack
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      )
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
      // With native cache manager, we can only access the models cache through the service
      const cachedModels = await this.modelsCacheService.getCachedModels()
      const isUpdating = this.modelsCacheService.isUpdatingCache()

      return {
        success: true,
        data: {
          totalCaches: 1,
          caches: {
            models: {
              status: {
                isUpdating,
                dataCount: cachedModels.length,
                lastUpdate:
                  cachedModels.length > 0 ? 'Кеш загружен' : 'Кеш пуст'
              },
              data: cachedModels.slice(0, 10),
              dataPreview:
                cachedModels.length > 10
                  ? `Показано 10 из ${cachedModels.length} элементов`
                  : null
            }
          }
        }
      }
    } catch (error) {
      throw new HttpException(
        {
          message: 'Внутренняя ошибка сервера',
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          stack: error.stack
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      )
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
      // With native cache manager, we only support the 'models' key
      if (key !== 'models') {
        throw new NotFoundException(`Кеш с ключом "${key}" не найден`)
      }

      const cachedModels = await this.modelsCacheService.getCachedModels()
      const isUpdating = this.modelsCacheService.isUpdatingCache()

      return {
        success: true,
        data: {
          key,
          status: {
            isUpdating,
            dataCount: cachedModels.length,
            lastUpdate: cachedModels.length > 0 ? 'Кеш загружен' : 'Кеш пуст'
          },
          data: cachedModels
        }
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      }
      throw new HttpException(
        {
          message: 'Внутренняя ошибка сервера',
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          stack: error.stack
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }
}
