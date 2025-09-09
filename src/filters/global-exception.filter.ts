import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus
} from '@nestjs/common'
import { Response } from 'express'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'Внутренняя ошибка сервера'
    let stack: string | undefined

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const exceptionResponse = exception.getResponse()

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = (exceptionResponse as any).message || exception.message
        stack = (exceptionResponse as any).stack
      } else {
        message = exceptionResponse as string
      }
    } else if (exception instanceof Error) {
      message = exception.message || 'Внутренняя ошибка сервера'
      stack = exception.stack
    }

    const errorResponse = {
      message,
      statusCode: status,
      ...(stack && { stack })
    }

    response.status(status).json(errorResponse)
  }
}
