import { Controller, Get, Res, HttpStatus, Param } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import { ArtefactService } from 'src/modules/artefacts/artefact.services'
import { User } from 'src/decorators'

@ApiTags('Артефакты')
@Controller('artefacts')
export class ArtefactsController {
  constructor(private readonly artefactService: ArtefactService) {}

  @ApiOperation({
    summary: 'Получить список артефактов',
    description:
      'Возвращает список всех доступных артефактов для текущего пользователя. Права (is_editable_by_role_sum / is_editable_by_role_sum_rm) считаются по артефактной матрице и группам пользователя, поэтому разделение по source не требуется.'
  })
  @ApiResponse({
    status: 200,
    description: 'Список артефактов успешно получен'
  })
  @ApiResponse({ status: 500, description: 'Внутренняя ошибка сервера' })
  @Get('/')
  async getArtefacts(@Res() response, @User() user) {
    const result = await this.artefactService.getArtefacts(user)
    return response.status(HttpStatus.OK).json(result)
  }

  @ApiOperation({
    summary: 'Получить список артефактов, заблокированных для редактирования',
    description:
      'Возвращает список всех артефактов, которые заблокированы для редактирования согласно текущей задаче из СУМ'
  })
  @ApiParam({
    name: 'model-id',
    description: 'Идентификатор версии модели',
    type: 'string'
  })
  @ApiResponse({
    status: 200,
    description: 'Список заблокированных артефактов успешно получен'
  })
  @ApiResponse({ status: 500, description: 'Внутренняя ошибка сервера' })
  @ApiResponse({ status: 404, description: 'Модель не найдена' })
  @Get('/block-list/:modelId')
  async getBlockListByModel(
    @Param('modelId') modelId: string,
    @Res() response
  ) {
    const result = await this.artefactService.getBlockListByModel(modelId)

    return response.status(HttpStatus.OK).json(result)
  }
}
