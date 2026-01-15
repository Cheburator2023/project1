import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
  UseInterceptors,
  CacheInterceptor,
  CacheTTL,
  Headers,
  Inject
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger'
import { JsonReportRequestDto, JsonReportResponseDto } from '../dto/json-report-request.dto'
import { Roles } from 'src/decorators/roles.decorator'
import { RolesGuard } from 'src/api/guards/roles.guard'
import { User, UserType } from 'src/decorators/user.decorator'
import { RateLimit } from '../guards/rate-limit.guard'
import { ErrorHandlerService } from 'src/common/services/error-handler.service'
import { JsonReportService } from '../../modules/report/json-report.service'
import { ModelStatusConfigService } from '../../modules/report/model-status-config.service'

@ApiTags('JSON Отчеты')
@ApiBearerAuth('JWT-auth')
@ApiSecurity('JWT-auth')
@Controller('report')
@UseGuards(RolesGuard)
export class JsonReportController {
  constructor(
    private readonly jsonReportService: JsonReportService,
    private readonly errorHandler: ErrorHandlerService,
    @Inject(ModelStatusConfigService)
    private readonly modelStatusConfigService: ModelStatusConfigService
  ) {}

  @Post('json')
  @Roles('model_read')
  @RateLimit({ limit: 3, windowMs: 60 * 1000 })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5 минут кэширования
  @ApiOperation({
    summary: 'Выгрузка отчета в формате JSON',
    description: 'Выгружает отчет ПУРС, ПУМР или общий реестр моделей в формате JSON'
  })
  @ApiBody({
    type: JsonReportRequestDto,
    description: 'Параметры для формирования отчета',
    examples: {
      'Пример для ПУРС': {
        value: {
          template_id: 1,
          date: '2025-01-01'
        }
      },
      'Пример для ПУМР': {
        value: {
          template_id: 2,
          date: '2025-01-01'
        }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Отчет успешно сформирован',
    type: JsonReportResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Неверно указан template_id/дата',
    schema: {
      example: {
        error: {
          code: '400',
          message: 'Неверно указан template_id/дата'
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Требуется аутентификация',
    schema: {
      example: {
        error: {
          code: '401',
          message: 'Требуется аутентификация'
        }
      }
    }
  })
  @ApiResponse({
    status: 403,
    description: 'Нет прав доступа',
    schema: {
      example: {
        error: {
          code: '403',
          message: 'Нет прав доступа'
        }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Учетная запись не зарегистрирована',
    schema: {
      example: {
        error: {
          code: '404',
          message: 'Учетная запись не зарегистрирована'
        }
      }
    }
  })
  @ApiResponse({
    status: 423,
    description: 'Учетная запись заблокирована',
    schema: {
      example: {
        error: {
          code: '423',
          message: 'Учетная запись заблокирована'
        }
      }
    }
  })
  @ApiResponse({
    status: 429,
    description: 'Превышен лимит запросов',
    schema: {
      example: {
        error: {
          code: '429',
          message: 'Превышен лимит запросов'
        }
      }
    }
  })
  @ApiResponse({
    status: 503,
    description: 'Сервис недоступен',
    schema: {
      example: {
        error: {
          code: '503',
          message: 'Сервис недоступен'
        }
      }
    }
  })
  async getJsonReport(
    @Body() request: JsonReportRequestDto,
    @User() user: UserType,
    @Headers('authorization') authHeader: string
  ): Promise<JsonReportResponseDto> {
    try {
      // Проверка аутентификации через заголовок
      if (!authHeader && process.env.NO_ROLES !== 'true') {
        throw new HttpException(
          {
            error: {
              code: '401',
              message: 'Требуется аутентификация'
            }
          },
          HttpStatus.UNAUTHORIZED
        )
      }

      // Для JSON отчета используем mode из конфигурации (.env)
      const mode = this.modelStatusConfigService.getEnabledStatuses()

      // Извлекаем фильтры из запроса, если они есть
      const filters = request.filters || {}

      return await this.jsonReportService.getJsonReport(
        request.template_id,
        request.date,
        user.groups,
        mode,
        filters
      )
    } catch (error) {
      throw this.errorHandler.handleError(error)
    }
  }
}