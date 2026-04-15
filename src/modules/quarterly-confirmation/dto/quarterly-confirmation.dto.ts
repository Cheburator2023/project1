import {
  IsString,
  IsBoolean,
  IsOptional,
  IsDateString,
  ValidateNested,
  IsInt,
  Min,
  Max,
  IsArray
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class GetModelsQueryDto {
  @ApiPropertyOptional({
    description:
      'Текстовый поиск по идентификатору, алиасу, названию модели или названию в ДАДМ',
    example: 'ML-2024'
  })
  @IsOptional()
  @IsString()
  search?: string

  @ApiPropertyOptional({
    description: 'Фильтр по алиасу модели',
    example: 'model_alias_123'
  })
  @IsOptional()
  @IsString()
  model_alias?: string

  @ApiPropertyOptional({
    description: 'Фильтр по названию модели',
    example: 'Модель кредитного скоринга'
  })
  @IsOptional()
  @IsString()
  model_name?: string

  @ApiPropertyOptional({
    description: 'Фильтр по названию модели в реестре ДАДМ',
    example: 'DADM_MODEL_001'
  })
  @IsOptional()
  @IsString()
  model_name_dadm?: string

  @ApiPropertyOptional({
    description: 'Фильтр по владельцу модели',
    example: 'Иванов Иван'
  })
  @IsOptional()
  @IsString()
  business_customer?: string

  @ApiPropertyOptional({
    description: 'Фильтр по подразделению владельца',
    example: 'Департамент рисков'
  })
  @IsOptional()
  @IsString()
  business_customer_departament?: string

  @ApiPropertyOptional({
    description: 'Фильтр по источнику предзаполнения',
    enum: ['pim', 'previous_quarter', 'none'],
    example: 'pim'
  })
  @IsOptional()
  @IsString()
  prefill_source?: 'pim' | 'previous_quarter' | 'none'

  @ApiPropertyOptional({
    description: 'Фильтр по статусу использования модели',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_used?: boolean
}

export class QuarterlyConfirmationModelDto {
  @ApiProperty({
    description: 'Идентификатор модели',
    example: 'MODEL_123'
  })
  @IsString()
  model_id: string

  @ApiPropertyOptional({
    description: 'Дата подтверждения использования модели (YYYY-MM-DD)',
    example: '2024-03-15'
  })
  @IsOptional()
  @IsDateString()
  confirmation_date: string | null

  @ApiPropertyOptional({
    description: 'Модель используется заказчиком',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  is_used: boolean | null
}

export class SaveQuarterlyConfirmationDto {
  @ApiProperty({
    description: 'Номер квартала (1-4)',
    example: 1,
    minimum: 1,
    maximum: 4
  })
  @IsInt()
  @Min(1)
  @Max(4)
  quarter: number

  @ApiProperty({
    description: 'Год',
    example: 2024
  })
  @IsInt()
  @Min(2020)
  @Max(2100)
  year: number

  @ApiProperty({
    description: 'Список моделей с данными подтверждения',
    type: [QuarterlyConfirmationModelDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuarterlyConfirmationModelDto)
  models: QuarterlyConfirmationModelDto[]
}

export class SeedPimUsageItemDto {
  @ApiProperty({
    description: 'Идентификатор модели',
    example: 'MODEL_123'
  })
  @IsString()
  model_id: string

  @ApiProperty({
    description: 'Модель используется',
    example: true
  })
  @IsBoolean()
  is_used: boolean
}

export class SeedPimUsageDto {
  @ApiProperty({
    description: 'Номер квартала (1-4)',
    example: 1,
    minimum: 1,
    maximum: 4
  })
  @IsInt()
  @Min(1)
  @Max(4)
  quarter: number

  @ApiProperty({
    description: 'Год',
    example: 2026
  })
  @IsInt()
  @Min(2020)
  @Max(2100)
  year: number

  @ApiProperty({
    description: 'Список моделей с данными ПИМ',
    type: [SeedPimUsageItemDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeedPimUsageItemDto)
  models: SeedPimUsageItemDto[]
}

export type QuarterInfoDto = {
  quarter: number
  year: number
  startDate: string
  endDate: string
  maxDate: string
}

export type ConfirmationModelRow = {
  model_id: string
  model_alias: string | null
  model_name: string | null
  model_name_dadm: string | null
  business_customer: string | null
  business_customer_departament: string | null
  confirmation_date: string | null
  is_used: boolean | null
  prefill_source: 'pim' | 'previous_quarter' | null
}
