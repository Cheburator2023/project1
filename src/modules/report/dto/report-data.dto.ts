import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsArray, IsOptional, IsNumber } from 'class-validator'

export class ReportDataDto {
  @ApiPropertyOptional({
    example: '2025-01-01',
    description: 'Дата отчета'
  })
  @IsOptional()
  @IsString()
  date?: string

  @ApiPropertyOptional({
    example: ['/ds', '/ds/ds_lead'],
    description: 'Группы пользователя'
  })
  @IsOptional()
  @IsArray()
  groups?: string[]

  @ApiProperty({
    example: [],
    description: 'Режим эксплуатации моделей (только актуальные модели)',
    default: []
  })
  @IsArray()
  mode: string[] = []

  @ApiPropertyOptional({
    example: '2025-01-01',
    description: 'Дата для расчета устаревания КМР'
  })
  @IsOptional()
  @IsString()
  reportDate?: string

  @ApiPropertyOptional({
    example: 1,
    description: 'Идентификатор шаблона'
  })
  @IsOptional()
  @IsNumber()
  template_id?: number

  @ApiPropertyOptional({
    example: { record_id: { values: ['value1'], filterType: 'set' } },
    description: 'Фильтры для отчета'
  })
  @IsOptional()
  filters?: any

  constructor(data?: {
    date?: string
    groups?: string[]
    mode?: string[]
    reportDate?: string
    template_id?: number
    filters?: any
  }) {
    if (data) {
      this.date = data.date
      this.groups = data.groups
      this.mode = data.mode || []
      this.reportDate = data.reportDate
      this.template_id = data.template_id
      this.filters = data.filters
    }
  }
}
