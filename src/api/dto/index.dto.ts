import { ArrayNotEmpty, IsArray, IsEnum, IsNotEmpty, IsNumber, IsPositive, IsString, IsUUID, ValidateIf, ValidateNested } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";

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
  SUM = 'sum',
  SUM_RM = 'sum-rm'
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
