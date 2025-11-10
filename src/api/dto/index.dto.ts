import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  IsDateString,
  ValidateIf,
  ValidateNested
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { ApiModelPropertyOptional } from '@nestjs/swagger/dist/decorators/api-model-property.decorator'
import { MetricsEnum } from 'src/modules/metrics/enums'

export enum ModelSource {
  SUM = 'sum',
  SUM_RM = 'sum-rm'
}

export class ModelsDto {
  @ApiModelPropertyOptional({
    example: 'YYYY-MM-DD'
  })
  @IsOptional()
  @IsDateString()
  date: string

  @ApiModelPropertyOptional({
    example: '3009b53c-507d-11ed-9b68-0a5801020704',
    format: 'uuid'
  })
  @IsOptional()
  @IsUUID()
  model_id: string

  @ApiModelPropertyOptional({
    example: ['Архив', 'Разработка']
  })
  @Transform(({ value }) => {
    if (!value) return []
    if (Array.isArray(value)) {
      // Если массив, обрабатываем каждый элемент
      return value.flatMap((item) =>
        typeof item === 'string' ? item.split(',').map((s) => s.trim()) : item
      )
    }
    // Если строка, разделяем по запятым
    return typeof value === 'string'
      ? value.split(',').map((s) => s.trim())
      : [value]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mode: string[]

  @ApiModelPropertyOptional({
    example: true,
    description: 'Использовать кеш для получения моделей. По умолчанию false'
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  useCache?: boolean = false
}

export class ModelWithRelationsDto {
  @ApiProperty({
    example: '3009b53c-507d-11ed-9b68-0a5801020704',
    format: 'uuid'
  })
  @IsUUID()
  model_id: string
}

export class CompareModelsDto {
  @ApiModelPropertyOptional({
    example: 'YYYY-MM-DD'
  })
  @IsDateString()
  firstDate: string

  @ApiModelPropertyOptional({
    example: 'YYYY-MM-DD'
  })
  @IsDateString()
  secondDate: string

  @ApiModelPropertyOptional({
    example: ['Архив', 'Разработка']
  })
  @Transform(({ value }) => {
    if (!value) return []
    if (Array.isArray(value)) {
      return value.flatMap((item) =>
        typeof item === 'string' ? item.split(',').map((s) => s.trim()) : item
      )
    }
    return typeof value === 'string'
      ? value.split(',').map((s) => s.trim())
      : [value]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mode: string[]
}

export class ModelCreateDto {
  @ApiProperty({
    example: 'record_id'
  })
  @IsNotEmpty()
  @IsString()
  artefact_tech_label: string

  @ApiProperty({
    type: Number,
    nullable: true,
    example: null
  })
  @IsNumber()
  @IsPositive()
  @ValidateIf((object, value) => value !== null)
  artefact_value_id: number | null

  @ApiProperty({
    example: 'new value'
  })
  @IsString()
  artefact_string_value: string
}

class ArtefactDto {
  @ApiProperty({
    example: 'record_id'
  })
  @IsNotEmpty()
  @IsString()
  artefact_tech_label: string

  @ApiProperty({
    type: Number,
    nullable: true,
    example: null
  })
  @IsNumber()
  @IsPositive()
  @ValidateIf((object, value) => value !== null)
  artefact_value_id: number | null

  @ApiProperty({
    example: 'new value'
  })
  @IsString()
  artefact_string_value: string
}

export class ModelsUpdateDto {
  @ApiProperty({
    example: '3009b53c-507d-11ed-9b68-0a5801020704',
    format: 'uuid'
  })
  @IsUUID()
  model_id: string

  @IsEnum(ModelSource)
  model_source: string

  @ApiProperty({
    type: ArtefactDto
  })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayNotEmpty()
  @Type(() => ArtefactDto)
  artefacts: ArtefactDto[]
}

export class ArtefactsUpdateDto {
  @ApiProperty({
    example: '3009b53c-507d-11ed-9b68-0a5801020704',
    format: 'uuid'
  })
  @IsUUID()
  model_id: string

  @ApiProperty({
    example: 'record_id'
  })
  @IsNotEmpty()
  @IsString()
  artefact_tech_label: string

  @ApiProperty({
    type: Number,
    nullable: true,
    example: null
  })
  @IsNumber()
  @IsPositive()
  @ValidateIf((object, value) => value !== null)
  artefact_value_id: number | null

  @ApiProperty({
    example: 'new value'
  })
  @IsString()
  artefact_string_value: string
}

export class ModelArtefactHistoryDto {
  @ApiProperty({
    example: 'record_id'
  })
  @IsNotEmpty()
  @IsString()
  artefact_tech_label: string

  @ApiProperty({
    example: '3009b53c-507d-11ed-9b68-0a5801020704',
    format: 'uuid'
  })
  @IsUUID()
  model_id: string

  @ApiPropertyOptional({
    example: 'sum-rm',
    enum: ModelSource,
    description: 'Источник модели: sum или sum-rm. По умолчанию sum-rm'
  })
  @IsOptional()
  @IsEnum(ModelSource)
  model_source?: string = ModelSource.SUM_RM
}

type SetFilter = {
  values: (string | null)[]
  filterType: string
}

type DateFilter = {
  dateFrom: string
  dateTo: string
  filterType: string
  type: string
}

type FilterModel = {
  [key: string]: SetFilter | DateFilter
}

export class SortStateDto {
  @IsString()
  colId: string

  @IsEnum(['asc', 'desc'])
  sort: 'asc' | 'desc'

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const num = parseInt(value, 10)
      return isNaN(num) ? 0 : num
    }
    return Number(value) || 0
  })
  @IsNumber()
  sortIndex: number
}

type SortState = {
  colId: string
  sort: 'asc' | 'desc'
  sortIndex: number
}

type ColumnState = {
  colId: string
  hide?: boolean
}

export class TemplateCreateDto {
  @ApiProperty({
    example: 'Название шаблона'
  })
  @IsNotEmpty()
  @IsString()
  template_name: string

  @ApiProperty({
    example: true
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true'
    }
    return Boolean(value)
  })
  @IsBoolean()
  public: boolean

  @ApiProperty({
    example: {
      record_id: { values: ['value1', 'value2'], filterType: 'set' },
      created_date: {
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        filterType: 'date',
        type: 'inRange'
      }
    }
  })
  @IsObject()
  @IsOptional()
  filterModel?: FilterModel

  @ApiModelPropertyOptional({
    example: [{ colId: 'record_id', sort: 'asc', sortIndex: 0 }]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SortStateDto)
  @IsOptional()
  sortState?: SortStateDto[]

  @ApiProperty({
    example: [{ colId: 'model_desc', hide: true }]
  })
  @IsArray()
  @IsOptional()
  columnState?: ColumnState[]

  @ApiModelPropertyOptional({
    example: ['model-1', 'model-2']
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  selectedIds?: string[]
}

export class TemplateUpdateDto {
  @ApiProperty({
    example: 1
  })
  @IsNumber()
  @IsPositive()
  template_id: number

  @ApiModelPropertyOptional({
    example: 'Название шаблона'
  })
  @IsNotEmpty()
  @IsString()
  @IsOptional()
  template_name?: string

  @ApiModelPropertyOptional({
    example: true
  })
  @IsBoolean()
  @IsOptional()
  public?: boolean

  @ApiModelPropertyOptional({
    example: {
      record_id: { values: ['value1', 'value2'], filterType: 'set' },
      created_date: {
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        filterType: 'date',
        type: 'inRange'
      }
    }
  })
  @IsObject()
  @IsOptional()
  filterModel?: FilterModel

  @ApiModelPropertyOptional({
    example: [{ colId: 'record_id', sort: 'asc', sortIndex: 0 }]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SortStateDto)
  @IsOptional()
  sortState?: SortStateDto[]

  @ApiModelPropertyOptional({
    example: [{ colId: 'model_desc', hide: true }]
  })
  @IsArray()
  @IsOptional()
  columnState?: ColumnState[]

  @ApiModelPropertyOptional({
    example: ['model-1', 'model-2']
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  selectedIds?: string[]
}

export class FilterDto {
  @ApiProperty({
    type: 'object',
    example: {
      record_id: { values: ['value1', 'value2'], filterType: 'set' },
      created_date: {
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        filterType: 'date',
        type: 'inRange'
      }
    }
  })
  @IsObject()
  filters: FilterModel

  @ApiModelPropertyOptional({
    example: ['Архив', 'Разработка']
  })
  @Transform(({ value }) => {
    if (!value) return []
    if (Array.isArray(value)) {
      return value.flatMap((item) =>
        typeof item === 'string' ? item.split(',').map((s) => s.trim()) : item
      )
    }
    return typeof value === 'string'
      ? value.split(',').map((s) => s.trim())
      : [value]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mode: string[]

  @ApiModelPropertyOptional({
    example: 'YYYY-MM-DD',
    description: 'Дата отчета, влияет на расчеты устаревания КМР'
  })
  @IsOptional()
  @IsDateString()
  reportDate?: string
}

export class MetricsDto {
  @ApiModelPropertyOptional({
    example: 'YYYY-MM-DD'
  })
  @IsOptional()
  @IsDateString()
  startDate: string

  @ApiModelPropertyOptional({
    example: 'YYYY-MM-DD'
  })
  @IsOptional()
  @IsDateString()
  endDate: string

  @ApiModelPropertyOptional({
    example: ['stream_name1', 'stream_name2']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stream: string[]

  @ApiModelPropertyOptional({ example: MetricsEnum.DevelopedModelsMetric })
  @IsOptional()
  @IsEnum(MetricsEnum)
  metric: MetricsEnum

  @ApiModelPropertyOptional({
    example: true,
    description: 'Использовать BI витрину вместо обычного источника данных'
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  useDatamart = false

  @ApiModelPropertyOptional({
    example: 'current',
    description: 'Тип данных для экспорта: current или delta'
  })
  @IsOptional()
  @IsString()
  dataType?: string
}
