import {
  Controller,
  Get,
  Post,
  Body,
  Res,
  HttpStatus,
  Query
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { User, UserType } from 'src/decorators'
import { QuarterlyConfirmationService } from 'src/modules/quarterly-confirmation/quarterly-confirmation.service'
import {
  SaveQuarterlyConfirmationDto,
  GetModelsQueryDto,
  SeedPimUsageDto
} from 'src/modules/quarterly-confirmation/dto/quarterly-confirmation.dto'
import { PimUsageService } from 'src/modules/pim-usage/pim-usage.service'

@ApiTags('Подтверждение аллокации за квартал')
@Controller('quarterly-confirmation')
export class QuarterlyConfirmationController {
  constructor(
    private readonly quarterlyConfirmationService: QuarterlyConfirmationService,
    private readonly pimUsageService: PimUsageService
  ) {}

  @ApiOperation({
    summary: 'Получить активный квартал',
    description:
      'Возвращает информацию об активном квартале для подтверждения использования модели'
  })
  @ApiResponse({
    status: 200,
    description: 'Информация об активном квартале'
  })
  @Get('/active-quarter')
  async getActiveQuarter(@Res() response) {
    const quarterInfo = this.quarterlyConfirmationService.getActiveQuarter()

    console.log(
      '[ALLOC_DEBUG] /active-quarter response:',
      JSON.stringify(quarterInfo)
    )

    return response.status(HttpStatus.OK).json({ data: quarterInfo })
  }

  @ApiOperation({
    summary: 'Получить модели для подтверждения',
    description:
      'Возвращает список моделей бизнес-заказчика для подтверждения использования за квартал с поддержкой поиска и фильтрации'
  })
  @ApiResponse({
    status: 200,
    description: 'Список моделей для подтверждения'
  })
  @Get('/models')
  async getModelsForConfirmation(
    @Query() query: GetModelsQueryDto,
    @Res() response,
    @User() user: UserType
  ) {
    let userFamilyName = (user.family_name || '').trim()
    let userGivenName = (user.given_name || '').trim()
    const display = (user.display_name || '').trim()
    const login = (user.preferred_username || '').trim()
    // Access token иногда без given_name/family_name; claim `name` или display_name — «Имя Фамилия».
    if ((!userFamilyName || !userGivenName) && display && display !== login) {
      const parts = display.split(/\s+/).filter(Boolean)
      if (parts.length === 2) {
        if (!userGivenName) userGivenName = parts[0]
        if (!userFamilyName) userFamilyName = parts[1]
      }
    }
    // Те же группы Keycloak, что и GET /models (`req.user.groups`): полные пути
    // `/departament_business_customer/...`, а не один «первый» департамент.
    const userGroups = user.keycloakGroups || []

    console.log(
      '[ALLOC_DEBUG] /models user info:',
      JSON.stringify({
        userFamilyName,
        userGivenName,
        userGroups,
        displayName: user.display_name ?? user.name,
        keycloakGroups: user.keycloakGroups,
        preferred_username: user.preferred_username
      })
    )

    const models =
      await this.quarterlyConfirmationService.getModelsForConfirmation(
        userFamilyName,
        userGivenName,
        userGroups,
        user.preferred_username || '',
        query
      )

    return response.status(HttpStatus.OK).json({
      data: {
        models,
        _debug: {
          userFamilyName,
          userGivenName,
          userGroups,
          displayName: user.display_name ?? user.name,
          preferred_username: user.preferred_username,
          modelsCount: models.length
        }
      }
    })
  }

  @ApiOperation({
    summary: 'Сохранить подтверждение использования за квартал',
    description:
      'Сохраняет данные подтверждения использования моделей за квартал'
  })
  @ApiResponse({
    status: 200,
    description: 'Подтверждение успешно сохранено'
  })
  @Post('/save')
  async saveConfirmation(
    @Body() data: SaveQuarterlyConfirmationDto,
    @Res() response,
    @User() user: UserType
  ) {
    const result = await this.quarterlyConfirmationService.saveConfirmation(
      data,
      user.preferred_username
    )

    return response.status(HttpStatus.OK).json({ data: result })
  }

  @ApiOperation({
    summary: 'Список records models_pim_usage (диагностика)',
    description:
      'Возвращает все строки таблицы использования модели из ПИМ по кварталам для страницы seed'
  })
  @ApiResponse({ status: 200, description: 'Массив записей из models_pim_usage' })
  @Get('/pim-usage')
  async listPimUsage(@Res() response) {
    const rows = await this.pimUsageService.listAllPimUsageOrdered()
    return response.status(HttpStatus.OK).json({ data: { rows } })
  }

  @ApiOperation({
    summary: 'Засеять данные об использовании модели из ПИМ',
    description:
      'Добавляет/обновляет записи в таблицу models_pim_usage для тестирования логики приоритетов предзаполнения'
  })
  @ApiResponse({
    status: 200,
    description: 'Данные ПИМ успешно добавлены'
  })
  @Post('/seed-pim-usage')
  async seedPimUsage(@Body() data: SeedPimUsageDto, @Res() response) {
    const results = []

    for (const model of data.models) {
      const result = await this.pimUsageService.insertPimUsage(
        model.system_model_id,
        data.quarter,
        data.year,
        model.is_used
      )
      results.push({
        system_model_id: model.system_model_id,
        pim_usage_id: result?.pim_usage_id ?? null,
        is_used: model.is_used
      })
    }

    return response.status(HttpStatus.OK).json({
      data: {
        success: true,
        quarter: data.quarter,
        year: data.year,
        seeded: results
      }
    })
  }
}
