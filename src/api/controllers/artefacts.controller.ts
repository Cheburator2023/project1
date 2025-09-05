import { Controller, Get, Res, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { ArtefactService } from 'src/modules/artefacts/artefact.services'
import { User } from 'src/decorators'
import { MODEL_SOURCES } from 'src/system/common'

@ApiTags('Артефакты')
@Controller('artefacts')
export class ArtefactsController {
  constructor(private readonly artefactService: ArtefactService) {}

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
  @Get('/')
  async getArtefacts(@Res() response, @User() user) {
    const result = await this.artefactService.getArtefacts(
      MODEL_SOURCES.MRM,
      user
    )
    return response.status(HttpStatus.OK).json(result)
  }
}
