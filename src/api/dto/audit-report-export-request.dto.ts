import { ApiPropertyOptional } from '@nestjs/swagger';

export class AuditReportExportRequestDto {
  @ApiPropertyOptional({ description: 'Идентификатор шаблона отчета (если применимо)' })
  template_id?: number;

  @ApiPropertyOptional({ description: 'Дата отчета (если применимо)' })
  date?: string;

  @ApiPropertyOptional({ description: 'Фильтры таблицы' })
  filters?: Record<string, any>;
}