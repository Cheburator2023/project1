import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus
} from '@nestjs/common'

interface RateLimitInfo {
  count: number
  windowStart: number
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly limit = 3 // 3 запроса в минуту
  private readonly windowMs = 60 * 1000 // 1 минута
  private requestCounts = new Map<string, RateLimitInfo>()

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const key = 'json_report_global'

    const now = Date.now()
    const windowInfo = this.requestCounts.get(key)

    if (!windowInfo || now - windowInfo.windowStart > this.windowMs) {
      // Сброс окна
      this.requestCounts.set(key, { count: 1, windowStart: now })
      return true
    }

    if (windowInfo.count >= this.limit) {
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
}