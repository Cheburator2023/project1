import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common'
import { Response } from 'express'
import { ErrorHandlerService } from 'src/common/services/error-handler.service'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  constructor(private readonly errorHandler: ErrorHandlerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    // Если это уже HttpException, просто отправляем его
    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const exceptionResponse = exception.getResponse()

      response.status(status).json(
        typeof exceptionResponse === 'object'
          ? exceptionResponse
          : { message: exceptionResponse }
      )
      return
    }

    // Обрабатываем ошибку через единый обработчик
    const httpException = this.errorHandler.handleError(exception)
    const status = httpException.getStatus()
    const exceptionResponse = httpException.getResponse()

    response.status(status).json(
      typeof exceptionResponse === 'object'
        ? exceptionResponse
        : { message: exceptionResponse }
    )
  }
}
