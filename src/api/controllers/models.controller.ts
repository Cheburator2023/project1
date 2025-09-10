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
import { MODEL_DISPLAY_MODES } from 'src/system/common/constants/base.constants'
import { MODEL_STATUS } from 'src/system/common/constants/model-status'
import { MODEL_SOURCES } from 'src/system/common/constants/models.constants'

@ApiTags('Модели')
@Controller('models')
export class ModelsController {
  constructor(
    private readonly modelsService: ModelsService,
    private readonly modelsCacheService: ModelsCacheService,
    private readonly apiService: ApiService
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

    // Фильтрация по дате
    if (query.date) {
      const filterDate = new Date(query.date)
      filteredModels = filteredModels.filter((model) => {
        if (!model.create_date) return false
        const modelDate = new Date(model.create_date)
        return modelDate <= filterDate
      })
    }

    // Фильтрация по режиму
    if (query.mode && query.mode.length > 0) {
      const activeModes = new Set(query.mode)
      const isArchiveMode = activeModes.has(MODEL_DISPLAY_MODES.ARCHIVE)
      const isCreationErrorMode = activeModes.has(
        MODEL_DISPLAY_MODES.CREATION_ERROR
      )
      const isPendingDeleteMode = activeModes.has(
        MODEL_DISPLAY_MODES.PENDING_DELETE
      )

      filteredModels = filteredModels.filter((model) => {
        const { model_source, models_is_active_flg, business_status } = model

        const isArchive =
          models_is_active_flg === '0' ||
          business_status === MODEL_STATUS.ARCHIVE
        const isCreationError = business_status === MODEL_STATUS.CREATION_ERROR
        const isPendingDelete = business_status === MODEL_STATUS.PENDING_DELETE

        if (model_source === MODEL_SOURCES.SUM && isArchive && isArchiveMode)
          return true
        if (model_source === MODEL_SOURCES.MRM) {
          if (isCreationError && isCreationErrorMode) return true
          if (isPendingDelete && isPendingDeleteMode) return true
        }

        const isActive = model_source === MODEL_SOURCES.SUM ? !isArchive : true
        const isValidStatus = !isCreationError && !isPendingDelete

        return isActive && isValidStatus
      })
    }

    // Фильтрация по группам пользователя
    if (userGroups && userGroups.length > 0) {
      filteredModels = this.filterModelsByUserGroups(filteredModels, userGroups)
    }

    return filteredModels
  }

  private filterModelsByUserGroups(models: any[], userGroups: string[]): any[] {
    const formattedGroups = userGroups.map((group) => group.trim())

    // Если пользователь входит в группу /business_customer
    if (
      formattedGroups.some((group) =>
        group.startsWith('/departament_business_customer')
      )
    ) {
      return models.filter((model) => {
        const modelDepartments = (model.business_customer_departament || '')
          .split(',')
          .map((dep) => dep.trim())
        return modelDepartments.length > 0
      })
    }

    // Если пользователь входит в группы /ds или /ds/ds_lead
    if (
      formattedGroups.includes('/ds') ||
      formattedGroups.includes('/ds/ds_lead')
    ) {
      return models.filter((model) => {
        return model.stream_name
      })
    }

    return models
  }

  @ApiOperation({
    summary: 'Получить список моделей',
    description:
      'Возвращает список всех доступных моделей с возможностью фильтрации. Использует кеширование для повышения производительности.'
  })
  @ApiResponse({ status: 200, description: 'Список моделей успешно получен' })
  @ApiResponse({ status: 500, description: 'Внутренняя ошибка сервера' })
  @Get('/')
  async getModels(@Query() query: ModelsDto, @Res() response, @Req() req) {
    // Если включен режим NO_ROLES, используем запрос для получения всех моделей
    if (process.env.NO_ROLES === 'true') {
      const allModels = await this.apiService.getAllModelsForGodMode(req.user)
      const result = {
        data: {
          cards: allModels
        },
        fromCache: false
      }
      return response.status(HttpStatus.OK).json(result)
    }

    // Ждем загрузки кеша, если он еще обновляется
    while (this.modelsCacheService.isUpdatingCache()) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    // Получаем модели из кеша
    const cachedModels = this.modelsCacheService.getCachedModels()

    let models: any[]
    let fromCache = false

    if (cachedModels.length > 0) {
      // Применяем фильтрацию к кешированным данным
      models = this.filterCachedModels(cachedModels, query, req.user?.groups)
      fromCache = true
    } else {
      // Если кеш пуст, используем fallback к прямому запросу
      models = await this.modelsService.getModels(query, req.user?.groups)
    }

    const result = {
      data: {
        cards: models
      },
      fromCache
    }

    return response.status(HttpStatus.OK).json(result)
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
    @User() user
  ) {
    const result = await this.modelsService.modelCreate(artefacts, user)

    return response.status(HttpStatus.CREATED).json(result[0])
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
    const result = {
      data: {
        cards: await this.modelsService.modelsUpdate(modelsArtefacts, user)
      }
    }

    return response.status(HttpStatus.ACCEPTED).json(result)
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
