import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsNumber,
  IsOptional,
  IsString,
  IsPositive,
  Min,
  Max,
  IsDateString,
  Validate,
  IsIn,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  IsObject
} from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { parseDate, isValidDate } from 'src/system/common/utils'

@ValidatorConstraint({ name: 'isValidDateFormat', async: false })
export class IsValidDateFormatConstraint implements ValidatorConstraintInterface {
  validate(dateStr: string, args: ValidationArguments) {
    if (!dateStr) return true
    return isValidDate(dateStr)
  }

  defaultMessage(args: ValidationArguments) {
    return 'Дата должна быть в одном из форматов: ГГГГ.ММ.ДД, ГГГГ-ММ-ДД, ДД.ММ.ГГГГ, ДД-ММ-ГГГГ'
  }
}

export class JsonReportRequestDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Идентификатор шаблона отчета (1 - ПУРС, 2 - ПУМР)',
    enum: [1, 2]
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(1)
  @Max(10)
  @IsIn([1, 2], { message: 'template_id должен быть 1 (ПУРС) или 2 (ПУМР)' })
  @Type(() => Number)
  template_id?: number

  @ApiPropertyOptional({
    example: '2025-01-01',
    description: 'Дата отчета в форматах: ГГГГ.ММ.ДД, ГГГГ-ММ-ДД, ДД.ММ.ГГГГ, ДД-ММ-ГГГГ'
  })
  @IsOptional()
  @IsString()
  @Validate(IsValidDateFormatConstraint)
  @Transform(({ value }) => {
    if (!value) return null
    const date = parseDate(value)
    return date ? date.toISOString().split('T')[0] : value
  })
  date?: string

  @ApiPropertyOptional({
    example: { record_id: { values: ['not-null'], filterType: 'set' } },
    description: 'Фильтры для отчета (опционально)'
  })
  @IsOptional()
  @IsObject()
  filters?: any
}

export class JsonReportResponseDto {
  [key: string]: any[]
}