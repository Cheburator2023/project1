import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class AuditReportExportRequestDto {
  @ApiPropertyOptional({ description: 'Идентификатор шаблона отчета (если применимо)' })
  @IsOptional()
  template_id?: number;

  @ApiPropertyOptional({ description: 'Дата отчета (если применимо)' })
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ description: 'Фильтры таблицы' })
  @IsOptional()
  filters?: Record<string, any>;
}