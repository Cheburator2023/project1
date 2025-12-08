import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { AuthService } from '../services/auth.service'

@Injectable()
export class SwaggerAuthMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Только для Swagger UI запросов
    if (req.path.startsWith('/api')) {
      const authHeader = req.headers.authorization

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)

        try {
          // Проверяем токен через интроспекцию
          const userInfo = await this.authService.introspectToken({
            token,
            client_id: 'frontend',
            client_secret: ''
          })

          if (userInfo.active) {
            // Добавляем информацию о пользователе в request
            req['user'] = {
              ...userInfo,
              preferred_username: userInfo.username,
              email: userInfo.email,
              groups: userInfo.groups,
              roles: userInfo.roles
            }
          }
        } catch (error) {
          // Игнорируем ошибки аутентификации в Swagger UI
          console.debug('Swagger auth error:', error.message)
        }
      }
    }

    next()
  }
}