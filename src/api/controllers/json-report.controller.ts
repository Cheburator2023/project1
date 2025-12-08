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
  Headers
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger'
import { ReportService } from 'src/modules/report/report.service'
import { JsonReportRequestDto, JsonReportResponseDto } from '../dto/json-report-request.dto'
import { Roles } from 'src/decorators/roles.decorator'
import { RolesGuard } from 'src/api/guards/roles.guard'
import { User, UserType } from 'src/decorators/user.decorator'
import { RateLimit } from '../guards/rate-limit.guard'

@ApiTags('JSON Отчеты')
// @ApiBearerAuth()
@Controller('report')
// @UseGuards(RolesGuard)
export class JsonReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post('json')
  // @Roles('model_read')
  @RateLimit({ limit: 3, windowMs: 60 * 1000 })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5 минут кэширования
  @ApiOperation({
    summary: 'Выгрузка отчета в формате JSON',
    description: 'Выгружает отчет ПУРС, ПУМР или общий реестр моделей в формате JSON'
  })
  @ApiBody({
    type: JsonReportRequestDto,
    description: 'Параметры для формирования отчета'
  })
  @ApiResponse({
    status: 200,
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
      return await this.reportService.getJsonReport(
        request.template_id,
        request.date,
        user.groups
      )
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }

      // Обработка внутренних ошибок
      if (error.message?.includes('Шаблон не найден') || error.message?.includes('template_id')) {
        throw new HttpException(
          {
            error: {
              code: '400',
              message: 'Неверно указан template_id/дата'
            }
          },
          HttpStatus.BAD_REQUEST
        )
      }

      // Обработка ошибок аутентификации Keycloak
      if (error.response?.status === 401) {
        throw new HttpException(
          {
            error: {
              code: '401',
              message: 'Некорректная пара логин - пароль'
            }
          },
          HttpStatus.UNAUTHORIZED
        )
      }

      throw new HttpException(
        {
          error: {
            code: '503',
            message: 'Сервис недоступен'
          }
        },
        HttpStatus.SERVICE_UNAVAILABLE
      )
    }
  }
}