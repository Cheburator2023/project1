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
  GetModelsQueryDto
} from 'src/modules/quarterly-confirmation/dto/quarterly-confirmation.dto'

@ApiTags('Подтверждение аллокации за квартал')
@Controller('quarterly-confirmation')
export class QuarterlyConfirmationController {
  constructor(
    private readonly quarterlyConfirmationService: QuarterlyConfirmationService
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
    const userFullName = `${user.family_name} ${user.given_name}`.trim()
    const userDepartment =
      user.groups && user.groups.length > 0 ? user.groups[0] : ''

    const models =
      await this.quarterlyConfirmationService.getModelsForConfirmation(
        userFullName,
        userDepartment,
        query
      )

    return response.status(HttpStatus.OK).json({ data: { models } })
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

    return response.status(HttpStatus.OK).json({ data: { success: result } })
  }
}
