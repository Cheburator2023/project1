import { Controller, Get, Res, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
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
}
