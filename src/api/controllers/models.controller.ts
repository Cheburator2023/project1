import {
  Controller,
  Query,
  Body,
  Get,
  Post,
  Put,
  Req,
  Res,
  ParseArrayPipe,
  HttpStatus
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger'
import { ModelsService } from 'src/modules/models/models.service'
import { ModelsCacheService } from 'src/modules/models/models-cache.service'
import { ModelDisplayModeService } from 'src/modules/models/services'
import { ApiService } from '../api.service'
import { User } from 'src/decorators'
import {
  ModelsDto,
  ModelWithRelationsDto,
  CompareModelsDto,
  ModelCreateDto,
  ModelsUpdateDto,
  ModelArtefactHistoryDto
} from '../dto/index.dto'
import { AuditService } from '../../modules/audit/audit.service'
import {
  AUDIT_EVENT_SUMD_MRMSCREATEMODEL,
  AUDIT_EVENT_SUMD_MRMSREMOVEMODEL,
  AUDIT_EVENT_SUMD_MRMSEDITMODEL
} from '../../modules/audit/audit.constants'
import { v4 as uuidv4 } from 'uuid'

@ApiTags('Модели')
@Controller('models')
export class ModelsController {
  constructor(
    private readonly modelsService: ModelsService,
    private readonly modelDisplayModeService: ModelDisplayModeService,
    private readonly modelsCacheService: ModelsCacheService,
    private readonly apiService: ApiService,
    private readonly auditService: AuditService
  ) {}

  private filterCachedModels(
    models: any[],
    query: ModelsDto,
    userGroups?: string[]
  ): any[] {
    let filteredModels = models

    // Фильтрация по model_id
    if (query.model_id) {
      filteredModels = filteredModels.filter(
        (model) => model.model_id === query.model_id
      )
    }

    // Фильтрация по дате - показываем состояние реестра на выбранную дату
    if (query.date) {
      const filterDate = new Date(query.date)
      filteredModels = filteredModels.filter((model) => {
        // Проверяем, что модель была создана до или в выбранную дату
        if (!model.create_date) return false
        const createDate = new Date(model.create_date)
        return createDate <= filterDate
      })
    }

    // Фильтрация по режиму
    if (query.mode && query.mode.length > 0) {
      filteredModels = this.modelDisplayModeService.filterModels(
        filteredModels,
        query.mode
      )
    }

    // Фильтрация по группам пользователя
    if (userGroups && userGroups.length > 0) {
      filteredModels = this.filterModelsByUserGroups(filteredModels, userGroups)
    }

    return filteredModels
  }

  private filterModelsByUserGroups(models: any[], userGroups: string[]): any[] {
    // Используем ту же логику, что и в ModelsService
    return this.modelsService.filterModelsByUserGroups(models, userGroups)
  }

  @ApiOperation({
    summary: 'Получить список моделей',
    description:
      'Возвращает список всех доступных моделей с возможностью фильтрации. По умолчанию использует кеширование для повышения производительности. Параметр useCache=false позволяет получить актуальные данные напрямую из базы данных.'
  })
  @ApiResponse({ status: 200, description: 'Список моделей успешно получен' })
  @ApiResponse({ status: 500, description: 'Внутренняя ошибка сервера' })
  @Get('/')
  async getModels(@Query() query: ModelsDto, @Res() response, @Req() req) {
    const models = await this.modelsService.getModels(query, req.user?.groups)
    const result = {
      data: {
        cards: models
      },
      fromCache: false
    }
    return response.status(HttpStatus.OK).json(result)

    // Ждем загрузки кеша, если он еще обновляется (максимум 10 секунд)
    // const maxWaitTime = 10000 // 10 seconds
    // const startTime = Date.now()
    // while (this.modelsCacheService.isUpdatingCache()) {
    //   if (Date.now() - startTime > maxWaitTime) {
    //     this.logger.warn(
    //       'Cache update timeout reached, falling back to direct database query'
    //     )
    //     const models = await this.modelsService.getModels(
    //       query,
    //       req.user?.groups
    //     )
    //     const result = {
    //       data: {
    //         cards: models
    //       },
    //       fromCache: false
    //     }
    //     return response.status(HttpStatus.OK).json(result)
    //   }
    //   await new Promise((resolve) => setTimeout(resolve, 100))
    // }

    // // Получаем модели из кеша
    // const cachedModels = await this.modelsCacheService.getCachedModels()

    // let models: any[]
    // let fromCache = false

    // if (cachedModels.length > 0) {
    //   // Применяем фильтрацию к кешированным данным
    //   models = this.filterCachedModels(cachedModels, query, req.user?.groups)
    //   fromCache = true
    // } else {
    //   // Если кеш пуст, используем fallback к прямому запросу
    //   models = await this.modelsService.getModels(query, req.user?.groups)
    // }

    // const result = {
    //   data: {
    //     cards: models
    //   },
    //   fromCache
    // }

    // return response.status(HttpStatus.OK).json(result)
  }

  @ApiOperation({
    summary: 'Сравнить модели по датам',
    description: 'Сравнивает состояние моделей между двумя указанными датами'
  })
  @ApiResponse({
    status: 200,
    description: 'Сравнение моделей выполнено успешно'
  })
  @ApiResponse({ status: 400, description: 'Некорректные параметры запроса' })
  @Get('/compare')
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
  @Post('/create')
  async createModel(
    @Body(new ParseArrayPipe({ items: ModelCreateDto, whitelist: true }))
    artefacts: ModelCreateDto[],
    @Res() response,
    @User() user,
  ) {
    const correlationId = uuidv4();
    const initiator = {
      sub: user?.preferred_username ?? user?.sub ?? 'unknown',
      channel: 'internal',
      realm: user?.realm ?? '',
    };
    this.auditService.sendEvent(
      AUDIT_EVENT_SUMD_MRMSCREATEMODEL,
      'START',
      correlationId,
      initiator,
      { artefactsCount: artefacts.length },
    );

    try {
      const result = await this.modelsService.modelCreate(artefacts, user);
      this.auditService.sendEvent(
        AUDIT_EVENT_SUMD_MRMSCREATEMODEL,
        'SUCCESS',
        correlationId,
        initiator,
        { modelId: result[0]?.model_id },
      );
      // Invalidate cache after successful creation to ensure fresh data
      // await this.modelsCacheService.forceUpdateCache()
      return response.status(HttpStatus.CREATED).json(result[0]);
    } catch (error) {
      this.auditService.sendEvent(
        AUDIT_EVENT_SUMD_MRMSCREATEMODEL,
        'FAILURE',
        correlationId,
        initiator,
        { errorMessage: error.message },
      );
      throw error;
    }
  }

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
  @Put('/update')
  async updateModels(
    @Body(new ParseArrayPipe({ items: ModelsUpdateDto, whitelist: true }))
    modelsArtefacts: ModelsUpdateDto[],
    @Res() response,
    @User() user
  ) {
    const startTime = Date.now()

    const initiator = {
      sub: user?.preferred_username ?? user?.sub ?? 'unknown',
      channel: 'internal',
      realm: user?.realm ?? ''
    }

    // Определяем модели, которые будут удалены (переведены в статус "Архив")
    const removalModelIds: string[] = []
    const removalCorrelationIds: string[] = []

    for (const modelItem of modelsArtefacts) {
      const deleteArtefact = modelItem.artefacts.find(
        (a) =>
          a.artefact_tech_label === 'delete_status' &&
          a.artefact_string_value === 'Архив'
      )
      if (deleteArtefact) {
        removalModelIds.push(modelItem.model_id)
        const corrId = uuidv4()
        removalCorrelationIds.push(corrId)
        // START для удаления
        this.auditService.sendEvent(
          AUDIT_EVENT_SUMD_MRMSREMOVEMODEL,
          'START',
          corrId,
          initiator,
          { modelId: modelItem.model_id }
        )
      }
    }

    // START для редактирования (общее событие)
    const editCorrelationId = uuidv4()
    this.auditService.sendEvent(
      AUDIT_EVENT_SUMD_MRMSEDITMODEL,
      'START',
      editCorrelationId,
      initiator,
      { modelsCount: modelsArtefacts.length }
    )

    try {
      // Create timeout promise (30 seconds)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(new Error('Update operation timed out after 15 seconds')),
          15000
        )
      )

      // Race between the actual update and timeout
      const updatePromise = this.modelsService.modelsUpdate(
        modelsArtefacts,
        user
      )
      const cards = (await Promise.race([updatePromise, timeoutPromise])) as any[]

      // SUCCESS для удаления для каждой удалённой модели
      for (const corrId of removalCorrelationIds) {
        this.auditService.sendEvent(
          AUDIT_EVENT_SUMD_MRMSREMOVEMODEL,
          'SUCCESS',
          corrId,
          initiator,
          {}
        )
      }

      // SUCCESS для редактирования
      this.auditService.sendEvent(
        AUDIT_EVENT_SUMD_MRMSEDITMODEL,
        'SUCCESS',
        editCorrelationId,
        initiator,
        { updatedModelsCount: cards?.length || 0 }
      )

      const result = {
        data: {
          cards
        }
      }

      // Invalidate cache after successful update to ensure fresh data
      // await this.modelsCacheService.forceUpdateCache()

      return response.status(HttpStatus.ACCEPTED).json(result)
    } catch (error) {
      const duration = Date.now() - startTime

      // FAILURE для удаления для каждой удалённой модели
      for (const corrId of removalCorrelationIds) {
        this.auditService.sendEvent(
          AUDIT_EVENT_SUMD_MRMSREMOVEMODEL,
          'FAILURE',
          corrId,
          initiator,
          { errorMessage: error.message }
        )
      }

      // FAILURE для редактирования
      this.auditService.sendEvent(
        AUDIT_EVENT_SUMD_MRMSEDITMODEL,
        'FAILURE',
        editCorrelationId,
        initiator,
        { errorMessage: error.message }
      )

      if (error.message.includes('timed out')) {
        return response.status(HttpStatus.REQUEST_TIMEOUT).json({
          error: 'Update operation timed out',
          message:
            'The update operation took too long to complete. Please try again or contact support.',
          duration
        })
      }

      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to update models',
        message: error.message,
        duration
      })
    }
  }

  @ApiOperation({
    summary: 'Получить связи модели',
    description:
      'Возвращает информацию о связях указанной модели с другими объектами системы'
  })
  @ApiResponse({ status: 200, description: 'Связи модели успешно получены' })
  @ApiResponse({ status: 400, description: 'Некорректные параметры запроса' })
  @Get('/relations')
  async getModelWithRelations(
    @Query() query: ModelWithRelationsDto,
    @Res() response
  ) {
    const data = await this.modelsService.getModelWithRelations(query)

    return response.status(HttpStatus.OK).json(data)
  }

  @ApiOperation({
    summary: 'Получить историю артефактов модели',
    description: 'Возвращает историю изменений артефактов для указанной модели'
  })
  @ApiResponse({
    status: 202,
    description: 'История артефактов успешно получена'
  })
  @ApiResponse({ status: 400, description: 'Некорректные параметры запроса' })
  @Get('/artefact/history')
  async getModelHistory(
    @Query() query: ModelArtefactHistoryDto,
    @Res() response
  ) {
    const result = await this.apiService.getModelHistory(query)

    return response.status(HttpStatus.ACCEPTED).json(result)
  }
}
