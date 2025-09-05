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

@ApiTags('Модели')
@Controller('models')
export class ModelsController {
  constructor(
    private readonly modelsService: ModelsService,
    private readonly modelsCacheService: ModelsCacheService,
    private readonly apiService: ApiService
  ) {}

  @ApiOperation({
    summary: 'Получить список моделей',
    description:
      'Возвращает список всех доступных моделей с возможностью фильтрации. Использует кеширование для повышения производительности.'
  })
  @ApiResponse({ status: 200, description: 'Список моделей успешно получен' })
  @ApiResponse({ status: 500, description: 'Внутренняя ошибка сервера' })
  @Get('/')
  async getModels(@Query() query: ModelsDto, @Res() response, @Req() req) {
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
