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
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ApiModelPropertyOptional } from "@nestjs/swagger/dist/decorators/api-model-property.decorator";

export class ModelsDto {
  @ApiModelPropertyOptional({
    example: 'YYYY-MM-DD'
  })
  @IsOptional()
  @IsDateString()
  date: string
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
}

export class ModelCreateDto {
  @ApiProperty({
    example: "record_id"
  })
  @IsNotEmpty()
  @IsString()
  artefact_tech_label: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: null
  })
  @IsNumber()
  @IsPositive()
  @ValidateIf((object, value) => value !== null)
  artefact_value_id: number | null;

  @ApiProperty({
    example: "new value"
  })
  @IsString()
  artefact_string_value: string;
}

class ArtefactDto {
  @ApiProperty({
    example: "record_id"
  })
  @IsNotEmpty()
  @IsString()
  artefact_tech_label: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: null
  })
  @IsNumber()
  @IsPositive()
  @ValidateIf((object, value) => value !== null)
  artefact_value_id: number | null;

  @ApiProperty({
    example: "new value"
  })
  @IsString()
  artefact_string_value: string;
}

export class ModelsUpdateDto {
  @ApiProperty({
    example: "3009b53c-507d-11ed-9b68-0a5801020704",
    format: "uuid"
  })
  @IsUUID()
  model_id: string;

  @ApiProperty({
    type: ArtefactDto
  })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayNotEmpty()
  @Type(() => ArtefactDto)
  artefacts: ArtefactDto[];
}

export class ArtefactsUpdateDto {
  @ApiProperty({
    example: "3009b53c-507d-11ed-9b68-0a5801020704",
    format: "uuid"
  })
  @IsUUID()
  model_id: string;

  @ApiProperty({
    example: "record_id"
  })
  @IsNotEmpty()
  @IsString()
  artefact_tech_label: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: null
  })
  @IsNumber()
  @IsPositive()
  @ValidateIf((object, value) => value !== null)
  artefact_value_id: number | null;

  @ApiProperty({
    example: "new value"
  })
  @IsString()
  artefact_string_value: string;
}

export enum ModelSource {
  SUM = "sum",
  SUM_RM = "sum-rm"
}

export class ModelArtefactHistoryDto {
  @ApiProperty({
    example: "record_id"
  })
  @IsNotEmpty()
  @IsString()
  artefact_tech_label: string;

  @ApiProperty({
    example: "3009b53c-507d-11ed-9b68-0a5801020704",
    format: "uuid"
  })
  @IsUUID()
  model_id: string;

  @IsEnum(ModelSource)
  model_source: string;
}

type TemplateValueType = {
  [key: string]: string[]
}

export class TemplateCreateDto {
  @ApiProperty({
    example: "Template Name"
  })
  @IsNotEmpty()
  @IsString()
  template_name: string;

  @ApiProperty({
    example: true
  })
  @IsBoolean()
  public: boolean;

  @ApiProperty({
    example: { "target": [], "record_id": ["not-null"], "model_desc": [] }
  })
  @IsObject()
  template_value: TemplateValueType;
}

export class TemplateUpdateDto {
  @ApiProperty({
    example: 1
  })
  @IsNumber()
  @IsPositive()
  template_id: number;

  @ApiModelPropertyOptional({
    example: "Template Name"
  })
  @IsNotEmpty()
  @IsString()
  @IsOptional()
  template_name: string;

  @ApiModelPropertyOptional({
    example: true
  })
  @IsBoolean()
  @IsOptional()
  @IsOptional()
  public?: boolean;

  @ApiModelPropertyOptional({
    example: { "target": [], "record_id": ["not-null"], "model_desc": [] }
  })
  @IsObject()
  @IsOptional()
  template_value: TemplateValueType;
}

type FilterValueType = {
  [key: string]: string[]
}

export class FilterDto {
  @ApiProperty({
    type: "object",
    additionalProperties: {
      type: "array",
      items: { type: "string" }
    },
    example: {
      "target": [],
      "record_id": ["not-null"],
      "model_desc": []
    }
  })

  @IsObject()
  filters: FilterValueType;
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
    example: 'stream_mame'
  })
  @IsOptional()
  @IsString()
  stream: string
}
