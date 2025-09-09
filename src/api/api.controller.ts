import {
  Controller,
  Query,
  Body,
  Param,
  Get,
  Post,
  Put,
  Delete,
  Req,
  Res,
  ParseArrayPipe,
  HttpStatus,
  HttpException,
  NotFoundException
} from '@nestjs/common'
import * as os from 'os'
import { Response } from 'express'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody
} from '@nestjs/swagger'
import { MODEL_SOURCES } from 'src/system/common'
import { ApiService } from './api.service'
import { ModelsService } from 'src/modules/models/models.service'
import { ModelsCacheService } from 'src/modules/models/models-cache.service'
import { CacheFactoryService } from 'src/modules/cache/cache-factory.service'
import { ArtefactService } from 'src/modules/artefacts/artefact.services'
import { User } from 'src/decorators'
import { MetricsAggregator } from 'src/modules/metrics/aggregators'
import { ReportService } from 'src/modules/report/report.service'
import { BiDatamartService } from 'src/modules/bi-datamart/bi-datamart.service'
import { TasksDatamartService } from 'src/modules/bi-datamart/tasks-datamart.service'
import {
  ModelsDto,
  ModelWithRelationsDto,
  CompareModelsDto,
  ModelCreateDto,
  ModelsUpdateDto,
  ModelArtefactHistoryDto,
  TemplateCreateDto,
  TemplateUpdateDto,
  FilterDto,
  MetricsDto
} from './dto/index.dto'

@ApiTags('API')
@Controller()
export class ApiController {
  constructor(
    private readonly apiService: ApiService,
    private readonly modelsService: ModelsService,
    private readonly modelsCacheService: ModelsCacheService,
    private readonly cacheFactory: CacheFactoryService,
    private readonly metricsAggregator: MetricsAggregator,
    private readonly reportService: ReportService,
    private readonly artefactService: ArtefactService,
    private readonly biDatamartService: BiDatamartService,
    private readonly tasksDatamartService: TasksDatamartService
  ) {}

  // === МОДЕЛИ ===

  @ApiTags('Модели')
  @ApiOperation({
    summary: 'Получить связи модели',
    description:
      'Возвращает информацию о связях указанной модели с другими объектами системы'
  })
  @ApiResponse({ status: 200, description: 'Связи модели успешно получены' })
  @ApiResponse({ status: 400, description: 'Некорректные параметры запроса' })
  @Get('/model/relations/')
  async getModelWithRelations(
    @Query() query: ModelWithRelationsDto,
    @Res() response
  ) {
    const data = await this.modelsService.getModelWithRelations(query)

    return response.status(HttpStatus.OK).json(data)
  }

  @ApiTags('Модели')
  @ApiOperation({
    summary: 'Сравнить модели по датам',
    description: 'Сравнивает состояние моделей между двумя указанными датами'
  })
  @ApiResponse({
    status: 200,
    description: 'Сравнение моделей выполнено успешно'
  })
  @ApiResponse({ status: 400, description: 'Некорректные параметры запроса' })
  @Get('/models/compare/')
  async compareModels(
    @Query() query: CompareModelsDto,
    @Res() response,
    @Req() req
  ) {
    const data = await this.modelsService.getModelsByDates(
      query,
      req.user?.groups
    )

    return response.status(HttpStatus.OK).json(data)
  }

  @ApiTags('Модели')
  @ApiOperation({
    summary: 'Получить список моделей',
    description:
      'Возвращает список всех доступных моделей с возможностью фильтрации. Использует кеширование для повышения производительности.'
  })
  @ApiResponse({ status: 200, description: 'Список моделей успешно получен' })
  @ApiResponse({ status: 500, description: 'Внутренняя ошибка сервера' })
  @Get('/models/')
  async models(@Query() query: ModelsDto, @Res() response, @Req() req) {
    // Ждем загрузки кеша, если он еще обновляется
    while (this.modelsCacheService.isUpdatingCache()) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    // Получаем модели из кеша
    const cachedModels = this.modelsCacheService.getCachedModels()

    // Если кеш пуст, используем fallback к прямому запросу
    const models =
      cachedModels.length > 0
        ? cachedModels
        : await this.modelsService.getModels(query, req.user?.groups)

    const result = {
      data: {
        cards: models
      },
      fromCache: cachedModels.length > 0
    }

    return response.status(HttpStatus.OK).json(result)
  }

  @ApiTags('Модели')
  @ApiOperation({
    summary: 'Создать новую модель',
    description: 'Создает новую модель в системе с указанными артефактами'
  })
  @ApiBody({
    type: [ModelCreateDto],
    description: 'Массив артефактов для создания модели'
  })
  @ApiResponse({ status: 201, description: 'Модель успешно создана' })
  @ApiResponse({
    status: 400,
    description: 'Некорректные данные для создания модели'
  })
  @ApiResponse({ status: 500, description: 'Внутренняя ошибка сервера' })
  @Post('/model/create/')
  async modelCreate(
    @Body(new ParseArrayPipe({ items: ModelCreateDto, whitelist: true }))
    artefacts: ModelCreateDto[],
    @Res() response,
    @User() user
  ) {
    const result = await this.modelsService.modelCreate(artefacts, user)

    return response.status(HttpStatus.CREATED).json(result[0])
  }

  @ApiTags('Модели')
  @ApiOperation({
    summary: 'Обновить модели',
    description: 'Обновляет существующие модели с новыми значениями артефактов'
  })
  @ApiBody({
    type: [ModelsUpdateDto],
    description: 'Массив обновлений для моделей'
  })
  @ApiResponse({ status: 202, description: 'Модели успешно обновлены' })
  @ApiResponse({
    status: 400,
    description: 'Некорректные данные для обновления'
  })
  @ApiResponse({ status: 500, description: 'Внутренняя ошибка сервера' })
  @Put('/models/update/')
  async modelsUpdate(
    @Body(new ParseArrayPipe({ items: ModelsUpdateDto, whitelist: true }))
    modelsArtefacts: ModelsUpdateDto[],
    @Res() response,
    @User() user
  ) {
    const result = {
      data: {
        cards: await this.modelsService.modelsUpdate(modelsArtefacts, user)
      }
    }

    return response.status(HttpStatus.ACCEPTED).json(result)
  }

  @ApiTags('Модели')
  @ApiOperation({
    summary: 'Получить историю артефактов модели',
    description: 'Возвращает историю изменений артефактов для указанной модели'
  })
  @ApiResponse({
    status: 202,
    description: 'История артефактов успешно получена'
  })
  @ApiResponse({ status: 400, description: 'Некорректные параметры запроса' })
  @Get('/model/artefact/history/')
  async getModelHistory(
    @Query() query: ModelArtefactHistoryDto,
    @Res() response
  ) {
    const result = await this.apiService.getModelHistory(query)

    return response.status(HttpStatus.ACCEPTED).json(result)
  }

  // === ШАБЛОНЫ ===

  @ApiTags('Шаблоны')
  @ApiOperation({
    summary: 'Создать новый шаблон',
    description: 'Создает новый шаблон в системе'
  })
  @ApiBody({
    type: TemplateCreateDto,
    description: 'Данные для создания шаблона'
  })
  @ApiResponse({ status: 200, description: 'Шаблон успешно создан' })
  @ApiResponse({
    status: 409,
    description: 'Шаблон с таким названием уже существует'
  })
  @ApiResponse({ status: 500, description: 'Внутренняя ошибка сервера' })
  @Post('/template/create/')
  async createTemplate(
    @Body() templateCreateDto: TemplateCreateDto,
    @Res() response,
    @Req() req
  ) {
    try {
      const createdTemplate = await this.apiService.createTemplate(
        templateCreateDto,
        req.user
      )
      return response.status(HttpStatus.OK).json(createdTemplate[0])
    } catch (error) {
      if (error.message === 'Template name already exists!') {
        throw new HttpException(
          {
            message: 'Такое название шаблона уже существует!',
            statusCode: HttpStatus.CONFLICT,
            stack: error.stack
          },
          HttpStatus.CONFLICT
        )
      }

      throw error
    }
  }

  @ApiTags('Шаблоны')
  @ApiOperation({
    summary: 'Обновить шаблон',
    description: 'Обновляет существующий шаблон'
  })
  @ApiBody({
    type: TemplateUpdateDto,
    description: 'Данные для обновления шаблона'
  })
  @ApiResponse({ status: 200, description: 'Шаблон успешно обновлен' })
  @ApiResponse({ status: 409, description: 'Конфликт при обновлении шаблона' })
  @Put('/template/update/')
  async updateTemplate(
    @Body() templateUpdateDto: TemplateUpdateDto,
    @Res() response,
    @Req() req
  ) {
    try {
      const updatedTemplate = await this.apiService.updateTemplate(
        templateUpdateDto,
        req.user
      )
      return response.status(HttpStatus.OK).json(updatedTemplate)
    } catch (error) {
      throw new HttpException(
        {
          message: error.message,
          statusCode: HttpStatus.CONFLICT,
          stack: error.stack
        },
        HttpStatus.CONFLICT
      )
    }
  }

  @ApiTags('Шаблоны')
  @ApiOperation({
    summary: 'Получить список шаблонов',
    description:
      'Возвращает список всех доступных шаблонов для текущего пользователя'
  })
  @ApiResponse({ status: 202, description: 'Список шаблонов успешно получен' })
  @Get('/templates/')
  async getTemplates(@Res() response, @Req() req) {
    const result = await this.apiService.getTemplates(req.user)

    return response.status(HttpStatus.ACCEPTED).json(result)
  }

  @ApiTags('Шаблоны')
  @ApiOperation({
    summary: 'Получить шаблон по ID',
    description:
      'Возвращает информацию о конкретном шаблоне по его идентификатору'
  })
  @ApiParam({
    name: 'id',
    description: 'Идентификатор шаблона',
    type: 'number'
  })
  @ApiResponse({ status: 200, description: 'Шаблон найден и возвращен' })
  @ApiResponse({ status: 404, description: 'Шаблон не найден' })
  @Get('/template/:id/')
  async getTemplate(@Param('id') id: number, @Res() response, @Req() req) {
    const result = await this.apiService.getTemplate(id, req.user)

    if (result.length) {
      return response.status(HttpStatus.OK).json(result[0])
    } else {
      response.status(HttpStatus.NOT_FOUND).json([])
    }
  }

  @ApiTags('Шаблоны')
  @ApiOperation({
    summary: 'Удалить шаблон',
    description: 'Удаляет шаблон из системы по его идентификатору'
  })
  @ApiParam({
    name: 'id',
    description: 'Идентификатор шаблона',
    type: 'number'
  })
  @ApiResponse({ status: 202, description: 'Шаблон успешно удален' })
  @ApiResponse({ status: 404, description: 'Шаблон не найден' })
  @Delete('/template/delete/:id/')
  async deleteTemplate(@Param('id') id: number, @Res() response) {
    await this.apiService.deleteTemplate(id)

    return response.status(HttpStatus.ACCEPTED).json({ result: true })
  }

  // === АРТЕФАКТЫ ===

  @ApiTags('Артефакты')
  @ApiOperation({
    summary: 'Получить список артефактов',
    description:
      'Возвращает список всех доступных артефактов для текущего пользователя'
  })
  @ApiResponse({
    status: 200,
    description: 'Список артефактов успешно получен'
  })
  @ApiResponse({ status: 500, description: 'Внутренняя ошибка сервера' })
  @Get('/artefacts/')
  async getArtefacts(@Res() response, @User() user) {
    const result = await this.artefactService.getArtefacts(
      MODEL_SOURCES.MRM,
      user
    )
    return response.status(HttpStatus.OK).json(result)
  }

  @Get('/metrics/')
  async getMetrics(@Query() query: MetricsDto, @Res() response) {
    try {
      const { startDate, endDate, stream, useDatamart } = query
      const result = await this.metricsAggregator.getMetrics(
        startDate,
        endDate,
        stream,
        useDatamart || false
      )

      return response.status(HttpStatus.OK).json({
        ...result,
        source: useDatamart ? 'datamart' : 'live',
        message: useDatamart
          ? 'Метрики получены из BI витрин'
          : 'Метрики получены из живых данных (без витрин)'
      })
    } catch (error) {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Внутренняя ошибка сервера',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        stack: error.stack
      })
    }
  }

  @Get('/metrics/export')
  async exportMetricsToExcel(@Query() query: MetricsDto, @Res() res: Response) {
    const { metric, startDate, endDate, stream, dataType, useDatamart } = query

    if (!metric) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Метрика обязательна для выгрузки Excel-файла'
      })
    }

    try {
      const excelBuffer = await this.reportService.exportMetricToExcel(
        metric,
        startDate || null,
        endDate || null,
        stream || [],
        useDatamart || false,
        dataType || 'current'
      )

      const filename = useDatamart
        ? `${metric}_datamart.xlsx`
        : `${metric}_live.xlsx`

      res.setHeader('Content-Disposition', `attachment; filename=${filename}`)
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      return res.send(excelBuffer)
    } catch (error) {
      if (error instanceof NotFoundException) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: error.message
        })
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Ошибка при формировании Excel-файла',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        stack: error.stack
      })
    }
  }

  @Post('report')
  async getReport(
    @Body() { filters, mode }: FilterDto,
    @Res() res: Response,
    @Req() req
  ) {
    const response = await this.reportService.getReport(
      filters,
      req.user?.groups,
      mode
    )

    res.setHeader('Content-Disposition', 'attachment; filename=report.xlsx')
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    res.send(response)
  }

  // === BI Datamart API ===

  @Post('bi-datamart/sync/models')
  async syncModelsDatamart() {
    const result = await this.biDatamartService.syncAllModelsToDatamart()
    return {
      success: result.success,
      data: result,
      message: 'Синхронизация витрины моделей завершена'
    }
  }

  @Post('bi-datamart/sync/tasks')
  async syncTasksDatamart() {
    const result = await this.tasksDatamartService.syncAllTasksToDatamart()
    return {
      success: result.success,
      data: result,
      message: 'Синхронизация витрины задач завершена'
    }
  }

  @Get('models-cache/status')
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

  @Post('models-cache/refresh')
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

  @Get('models-cache/column-values/:columnName')
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

  @Get('monitoring/system')
  async getSystemMonitoring() {
    const memoryUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()
    const totalSystemMemory = os.totalmem()

    // Convert bytes to MB and format with suffixes
    const rssValue = Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100
    const heapTotalValue =
      Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100
    const heapUsedValue =
      Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100
    const externalValue =
      Math.round((memoryUsage.external / 1024 / 1024) * 100) / 100
    const arrayBuffersValue =
      Math.round((memoryUsage.arrayBuffers / 1024 / 1024) * 100) / 100

    const serverMemoryMB = {
      rss: `${rssValue}MB`,
      heapTotal: `${heapTotalValue}MB`,
      heapUsed: `${heapUsedValue}MB`,
      external: `${externalValue}MB`,
      arrayBuffers: `${arrayBuffersValue}MB`
    }

    // Calculate server memory usage percentage relative to total system memory
    const serverMemoryPercentValue =
      Math.round((memoryUsage.rss / totalSystemMemory) * 100 * 100) / 100
    const serverMemoryPercent = `${serverMemoryPercentValue}%`

    // Calculate heap usage percentage
    const heapUsagePercentValue =
      Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100 * 100) /
      100
    const heapUsagePercent = `${heapUsagePercentValue}%`

    // Get available heap memory
    const heapFreeValue =
      Math.round(
        ((memoryUsage.heapTotal - memoryUsage.heapUsed) / 1024 / 1024) * 100
      ) / 100
    const heapFree = `${heapFreeValue}MB`

    // Format total system memory
    const totalSystemMemoryValue =
      Math.round((totalSystemMemory / 1024 / 1024) * 100) / 100
    const totalSystemMemoryMB = `${totalSystemMemoryValue}MB`

    return {
      timestamp: new Date().toISOString(),
      memory: {
        serverUsage: {
          ...serverMemoryMB,
          totalSystemMemory: totalSystemMemoryMB,
          serverMemoryPercent,
          heapUsagePercent,
          heapFree
        }
      },
      cpu: {
        user: `${cpuUsage.user}μs`,
        system: `${cpuUsage.system}μs`
      },
      uptime: {
        seconds: `${Math.round(process.uptime())}s`,
        formatted: this.formatUptime(process.uptime())
      }
    }
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${secs}s`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  @Get('cache/all')
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

  @Get('cache/:key')
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
