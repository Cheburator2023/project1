import {
  Controller,
  Query,
  Get,
  Res,
  HttpStatus,
  NotFoundException,
  RequestTimeoutException
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { Response } from 'express'
import { MetricsAggregator } from 'src/modules/metrics/aggregators'
import { ReportService } from 'src/modules/report/report.service'
import { MetricsDto } from '../dto/index.dto'

@ApiTags('Метрики')
@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly metricsAggregator: MetricsAggregator,
    private readonly reportService: ReportService
  ) {}

  @ApiOperation({
    summary: 'Получить метрики',
    description:
      'Возвращает метрики системы за указанный период с возможностью использования BI витрин'
  })
  @ApiResponse({ status: 200, description: 'Метрики успешно получены' })
  @ApiResponse({ status: 408, description: 'Превышено время ожидания запроса' })
  @ApiResponse({ status: 500, description: 'Внутренняя ошибка сервера' })
  @Get('/')
  async getMetrics(@Query() query: MetricsDto, @Res() response) {
    const TIMEOUT_MS = 10000 // 10 seconds timeout

    try {
      const { startDate, endDate, stream, useDatamart } = query

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(
            new RequestTimeoutException(
              'Превышено время ожидания получения метрик'
            )
          )
        }, TIMEOUT_MS)
      })

      // Race between actual operation and timeout
      const result = await Promise.race([
        this.metricsAggregator.getMetrics(
          startDate,
          endDate,
          stream,
          useDatamart || false
        ),
        timeoutPromise
      ])

      return response.status(HttpStatus.OK).json({
        ...(result && typeof result === 'object' ? result : {}),
        source: useDatamart ? 'datamart' : 'live',
        message: useDatamart
          ? 'Метрики получены из BI витрин'
          : 'Метрики получены из живых данных (без витрин)'
      })
    } catch (error) {
      if (error instanceof RequestTimeoutException) {
        return response.status(HttpStatus.REQUEST_TIMEOUT).json({
          message: error.message,
          statusCode: HttpStatus.REQUEST_TIMEOUT
        })
      }

      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Внутренняя ошибка сервера',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        stack: error.stack
      })
    }
  }

  @ApiOperation({
    summary: 'Экспорт метрик в Excel',
    description: 'Экспортирует метрики в Excel файл для скачивания'
  })
  @ApiResponse({
    status: 200,
    description: 'Excel файл успешно сгенерирован',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: {
          type: 'string',
          format: 'binary'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Метрика обязательна для экспорта' })
  @ApiResponse({ status: 404, description: 'Метрика не найдена' })
  @ApiResponse({
    status: 408,
    description: 'Превышено время ожидания экспорта'
  })
  @ApiResponse({
    status: 500,
    description: 'Ошибка при формировании Excel-файла'
  })
  @Get('/export')
  async exportMetricsToExcel(@Query() query: MetricsDto, @Res() res: Response) {
    const TIMEOUT_MS = 10000 // 10 seconds timeout for Excel generation
    const { metric, startDate, endDate, stream, dataType, useDatamart } = query

    if (!metric) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Метрика обязательна для выгрузки Excel-файла'
      })
    }

    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(
            new RequestTimeoutException(
              'Превышено время ожидания экспорта в Excel'
            )
          )
        }, TIMEOUT_MS)
      })

      // Race between actual operation and timeout
      const excelBuffer = await Promise.race([
        this.reportService.exportMetricToExcel(
          metric,
          startDate || null,
          endDate || null,
          stream || [],
          useDatamart || false,
          dataType || 'current'
        ),
        timeoutPromise
      ])

      const filename = useDatamart
        ? `${metric}_datamart.xlsx`
        : `${metric}_live.xlsx`

      res.setHeader('Content-Disposition', `attachment; filename=${filename}`)
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      return res.send(excelBuffer)
    } catch (error) {
      if (error instanceof RequestTimeoutException) {
        return res.status(HttpStatus.REQUEST_TIMEOUT).json({
          message: error.message,
          statusCode: HttpStatus.REQUEST_TIMEOUT
        })
      }

      if (error instanceof NotFoundException) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: error.message
        })
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Ошибка при формировании Excel-файла',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        stack: error.stack
      })
    }
  }
}
