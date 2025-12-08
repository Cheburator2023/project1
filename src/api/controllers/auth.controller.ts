import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  UseGuards,
  Headers,
  Get
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger'
import { AuthService } from '../services/auth.service'
import { TokenRequestDto, TokenResponseDto, IntrospectRequestDto } from '../dto/auth.dto'
import { RateLimit } from '../guards/rate-limit.guard'
import { Public } from 'src/decorators/public.decorator'

@ApiTags('Аутентификация')
@Controller('auth')
@Public()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('token')
  @RateLimit({ limit: 10, windowMs: 60 * 1000, useIP: true })
  @ApiOperation({
    summary: 'Получение токенов доступа',
    description: 'Получение access и refresh токенов по логину и паролю'
  })
  @ApiBody({
    type: TokenRequestDto,
    description: 'Данные для получения токенов'
  })
  @ApiResponse({
    status: 200,
    description: 'Токены успешно получены',
    type: TokenResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Неверные параметры запроса',
    schema: {
      example: {
        error: {
          code: '400',
          message: 'Неверные параметры запроса'
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Некорректная пара логин - пароль',
    schema: {
      example: {
        error: {
          code: '401',
          message: 'Некорректная пара логин - пароль'
        }
      }
    }
  })
  async getToken(@Body() request: TokenRequestDto): Promise<TokenResponseDto> {
    try {
      return await this.authService.getToken(request)
    } catch (error) {
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

      if (error.response?.status === 400) {
        throw new HttpException(
          {
            error: {
              code: '400',
              message: 'Неверные параметры запроса'
            }
          },
          HttpStatus.BAD_REQUEST
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

  @Post('refresh')
  @RateLimit({ limit: 10, windowMs: 60 * 1000, useIP: true })
  @ApiOperation({
    summary: 'Обновление токена доступа',
    description: 'Обновление access токена с использованием refresh токена'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        grant_type: { type: 'string', example: 'refresh_token' },
        client_id: { type: 'string', example: 'surm-api' },
        client_secret: { type: 'string', example: 'CLIENT_SECRET' },
        refresh_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUI...' }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Токен успешно обновлен',
    type: TokenResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Неверные параметры запроса',
    schema: {
      example: {
        error: {
          code: '400',
          message: 'Неверные параметры запроса'
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Недействительный refresh token',
    schema: {
      example: {
        error: {
          code: '401',
          message: 'Недействительный refresh token'
        }
      }
    }
  })
  async refreshToken(@Body() request: any): Promise<TokenResponseDto> {
    try {
      return await this.authService.refreshToken(request)
    } catch (error) {
      if (error.response?.status === 401) {
        throw new HttpException(
          {
            error: {
              code: '401',
              message: 'Недействительный refresh token'
            }
          },
          HttpStatus.UNAUTHORIZED
        )
      }

      if (error.response?.status === 400) {
        throw new HttpException(
          {
            error: {
              code: '400',
              message: 'Неверные параметры запроса'
            }
          },
          HttpStatus.BAD_REQUEST
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

  @Post('introspect')
  @RateLimit({ limit: 10, windowMs: 60 * 1000, useIP: true })
  @ApiOperation({
    summary: 'Интроспекция токена',
    description: 'Проверка валидности access токена'
  })
  @ApiBody({
    type: IntrospectRequestDto,
    description: 'Данные для проверки токена'
  })
  @ApiResponse({
    status: 200,
    description: 'Результат проверки токена',
    schema: {
      type: 'object',
      properties: {
        active: { type: 'boolean' },
        exp: { type: 'number' },
        iat: { type: 'number' },
        sub: { type: 'string' },
        username: { type: 'string' },
        email: { type: 'string' },
        roles: { type: 'array', items: { type: 'string' } },
        groups: { type: 'array', items: { type: 'string' } }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Неверные параметры запроса',
    schema: {
      example: {
        error: {
          code: '400',
          message: 'Неверные параметры запроса'
        }
      }
    }
  })
  async introspectToken(@Body() request: IntrospectRequestDto): Promise<any> {
    try {
      return await this.authService.introspectToken(request)
    } catch (error) {
      if (error.response?.status === 400) {
        throw new HttpException(
          {
            error: {
              code: '400',
              message: 'Неверные параметры запроса'
            }
          },
          HttpStatus.BAD_REQUEST
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

  @Get('status')
  @RateLimit({ limit: 10, windowMs: 60 * 1000, useIP: true })
  @ApiOperation({
    summary: 'Проверка статуса сервиса',
    description: 'Проверка доступности сервиса аутентификации'
  })
  @ApiResponse({
    status: 200,
    description: 'Сервис доступен',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  getStatus() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString()
    }
  }
}