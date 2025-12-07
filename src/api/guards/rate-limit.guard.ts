import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
  applyDecorators,
  UseGuards
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'

interface RateLimitInfo {
  count: number
  windowStart: number
}

interface RateLimitOptions {
  limit?: number
  windowMs?: number
}

export const RATE_LIMIT_OPTIONS = 'RATE_LIMIT_OPTIONS'

export function RateLimit(options?: RateLimitOptions) {
  return applyDecorators(
    SetMetadata(RATE_LIMIT_OPTIONS, options || {}),
    UseGuards(RateLimitGuard)
  )
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private defaultLimit = 3 // 3 запроса в минуту по умолчанию
  private defaultWindowMs = 60 * 1000 // 1 минута
  private requestCounts = new Map<string, RateLimitInfo>()

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_OPTIONS,
      context.getHandler()
    ) || {}

    const limit = options.limit || this.defaultLimit
    const windowMs = options.windowMs || this.defaultWindowMs

    const request = context.switchToHttp().getRequest()
    const key = this.getRateLimitKey(request, context)

    const now = Date.now()
    const windowInfo = this.requestCounts.get(key)

    if (!windowInfo || now - windowInfo.windowStart > windowMs) {
      this.requestCounts.set(key, { count: 1, windowStart: now })
      return true
    }

    if (windowInfo.count >= limit) {
      throw new HttpException(
        {
          error: {
            code: '429',
            message: 'Превышен лимит запросов'
          }
        },
        HttpStatus.TOO_MANY_REQUESTS
      )
    }

    windowInfo.count++
    this.requestCounts.set(key, windowInfo)
    return true
  }

  private getRateLimitKey(request: any, context: ExecutionContext): string {
    const handler = context.getHandler()
    const className = context.getClass().name
    const methodName = handler.name

    if (className === 'AuthController') {
      return `auth_${methodName}`
    }

    return 'json_report_global'
  }
}