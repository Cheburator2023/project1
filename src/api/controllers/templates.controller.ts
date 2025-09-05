import {
  Controller,
  Body,
  Param,
  Get,
  Post,
  Put,
  Delete,
  Req,
  Res,
  HttpStatus,
  HttpException
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody
} from '@nestjs/swagger'
import { ApiService } from '../api.service'
import { TemplateCreateDto, TemplateUpdateDto } from '../dto/index.dto'

@ApiTags('Шаблоны')
@Controller('templates')
export class TemplatesController {
  constructor(private readonly apiService: ApiService) {}

  @ApiOperation({
    summary: 'Получить список шаблонов',
    description:
      'Возвращает список всех доступных шаблонов для текущего пользователя'
  })
  @ApiResponse({ status: 202, description: 'Список шаблонов успешно получен' })
  @Get('/')
  async getTemplates(@Res() response, @Req() req) {
    const result = await this.apiService.getTemplates(req.user)

    return response.status(HttpStatus.ACCEPTED).json(result)
  }

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
  @Get('/:id')
  async getTemplate(@Param('id') id: number, @Res() response, @Req() req) {
    const result = await this.apiService.getTemplate(id, req.user)

    if (result.length) {
      return response.status(HttpStatus.OK).json(result[0])
    } else {
      response.status(HttpStatus.NOT_FOUND).json([])
    }
  }

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
  @Post('/create')
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
            statusCode: HttpStatus.CONFLICT,
            message: 'Такое название шаблона уже существует!'
          },
          HttpStatus.CONFLICT
        )
      }

      throw error
    }
  }

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
  @Put('/update')
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
          statusCode: HttpStatus.CONFLICT,
          message: error.message
        },
        HttpStatus.CONFLICT
      )
    }
  }

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
  @Delete('/:id')
  async deleteTemplate(@Param('id') id: number, @Res() response) {
    await this.apiService.deleteTemplate(id)

    return response.status(HttpStatus.ACCEPTED).json({ result: true })
  }
}
