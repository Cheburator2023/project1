import { Controller, Body, Post, Req, Res, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger'
import { Response } from 'express'
import { ReportService } from 'src/modules/report/report.service'
import { FilterDto } from '../dto/index.dto'
import { Roles } from 'src/decorators/roles.decorator'
import { RolesGuard } from 'src/api/guards/roles.guard'

@ApiTags('Отчеты')
@Controller('reports')
@UseGuards(RolesGuard)
export class ReportsController {
  constructor(private readonly reportService: ReportService) {}

  @ApiOperation({
    summary: 'Сгенерировать отчет',
    description: 'Генерирует Excel отчет на основе указанных фильтров'
  })
  @ApiBody({
    type: FilterDto,
    description: 'Фильтры для генерации отчета'
  })
  @ApiResponse({
    status: 200,
    description: 'Отчет успешно сгенерирован',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: {
          type: 'string',
          format: 'binary'
        }
      }
    }
  })
  @Post('/')
  @Roles('admin')
  async getReport(
    @Body() { filters, mode, reportDate }: FilterDto,
    @Res() res: Response,
    @Req() req
  ) {
    const response = await this.reportService.getReport(
      filters,
      req.user?.groups,
      mode,
      reportDate
    )

    res.setHeader('Content-Disposition', 'attachment; filename=report.xlsx')
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    res.send(response)
  }
}
