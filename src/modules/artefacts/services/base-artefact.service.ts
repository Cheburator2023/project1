import { Logger } from '@nestjs/common'
import { ARTEFACT_TYPES_REQUIRING_VALUES } from '../constants'
import { ArtefactEntity, ArtefactValueEntity, ArtefactRealizationEntity } from '../entities'
import { UpdateArtefactDto } from '../dto'
import { IArtefactService } from '../interfaces'

export abstract class BaseArtefactService implements IArtefactService {
  protected abstract modelsTableName: string
  protected abstract artefactsTableName: string
  protected abstract artefactValuesTableName: string
  protected abstract artefactRealizationsTableName: string
  protected abstract logger: Logger

  protected constructor(public readonly databaseService) {}

  async handleUpdateArtefact (data: UpdateArtefactDto) {
    return await this.updateArtefact(data)
  }

  async updateArtefact(artefactData: UpdateArtefactDto): Promise<void> {
    const { model_id, artefact_tech_label, artefact_string_value } = artefactData

    const model = await this.getModelById(model_id)
    if (!model) {
      return
    }

    const artefact: ArtefactEntity | null = await this.getArtefactByTechLabel(artefact_tech_label)
    if (!artefact) {
      return
    }

    const isSelectType: boolean = ARTEFACT_TYPES_REQUIRING_VALUES.has(artefact.artefact_type_id)
    const artefactValues: ArtefactValueEntity[] | null = isSelectType ? await this.getArtefactValues(artefact.artefact_id) : null
    const resolvedArtefactValueId = this.resolveArtefactValueId(artefactData, artefactValues)
    const latestArtefactRealization: ArtefactRealizationEntity | null = await this.getLatestArtefactRealization(model_id, artefact.artefact_id)

    if (this.shouldSkipUpdate(latestArtefactRealization, resolvedArtefactValueId, artefact_string_value, isSelectType)) return

    if (latestArtefactRealization) {
      await this.setEffectiveToArtefactRealization(latestArtefactRealization, isSelectType)
    }

    await this.insertArtefactRealization(
      model_id,
      artefact.artefact_id,
      resolvedArtefactValueId,
      artefact_string_value,
      artefact,
      artefactValues
    )
  }

  //@TODO: вынести в модуль models
  private async getModelById(model_id: string): Promise<any> {
    const [model] = await this.databaseService.query(
      `
      SELECT * FROM ${ this.modelsTableName } WHERE model_id = :model_id
      `,
      {
        model_id
      }
    )

    return model || null
  }

  async getArtefactByTechLabel(artefact_tech_label: UpdateArtefactDto['artefact_tech_label']): Promise<ArtefactEntity | null> {
    const [artefact] = await this.databaseService.query(
      `
      SELECT * FROM ${ this.artefactsTableName } WHERE artefact_tech_label = :artefact_tech_label
      `,
      {
        artefact_tech_label
      }
    )

    return artefact || null
  }

  async getArtefactValues(artefact_id: ArtefactEntity['artefact_id']): Promise<ArtefactValueEntity[]> {
    const artefactValues = this.databaseService.query(
      `
      SELECT * FROM ${ this.artefactValuesTableName } WHERE artefact_id = :artefact_id
      `,
      {
        artefact_id
      }
    )

    return artefactValues || null
  }

  async getLatestArtefactRealization(
    model_id: string,
    artefact_id: ArtefactEntity['artefact_id']
  ): Promise<ArtefactRealizationEntity | null> {
    const [artefactRealization] = await this.databaseService.query(
      `
      SELECT *
        FROM (
          SELECT 
            *,
            ROW_NUMBER() OVER (
              PARTITION BY model_id, artefact_id
              ORDER BY effective_from DESC
            ) AS rn
          FROM ${ this.artefactRealizationsTableName }
        ) ar
        WHERE model_id = :model_id
          AND artefact_id = :artefact_id
          AND ar.rn = 1;
        `,
      {
        model_id,
        artefact_id
      }
    )

    return artefactRealization || null
  }

  private async setEffectiveToArtefactRealization(
    latestArtefactRealization: ArtefactRealizationEntity,
    isSelectType: boolean
  ): Promise<void> {
    const conditions = isSelectType
      ? (latestArtefactRealization.artefact_value_id === null)
        ? `AND artefact_value_id IS NULL`
        : `AND artefact_value_id = :artefact_value_id`
      : `AND artefact_string_value = '${ latestArtefactRealization.artefact_string_value }'`
    const queryParams = {
      model_id: latestArtefactRealization.model_id,
      artefact_id: latestArtefactRealization.artefact_id,
      ...(latestArtefactRealization.artefact_value_id !== null
        ? { artefact_value_id: latestArtefactRealization.artefact_value_id }
        : {})
    }
    await this.databaseService.query(
      `
      UPDATE ${ this.artefactRealizationsTableName }
      SET effective_to = CURRENT_TIMESTAMP(0)
      WHERE model_id = :model_id
        AND artefact_id = :artefact_id
        ${ conditions }
      `,
      queryParams
    )
  }

  resolveArtefactValueId(
    artefactData: UpdateArtefactDto,
    artefactValues: ArtefactValueEntity[] | null
  ): number | null {
    const { artefact_value_id, artefact_string_value } = artefactData

    if (!artefactValues) return artefact_value_id

    const matchingValue = artefactValues.find(value => value.artefact_value_id === artefact_value_id)
    if (matchingValue) return artefact_value_id

    const valueByString = artefactValues.find(value => value.artefact_value.toLowerCase() === artefact_string_value.toLowerCase())
    if (valueByString) return valueByString.artefact_value_id

    return artefact_value_id
  }

  async insertArtefactRealization(
    model_id: string,
    artefact_id: ArtefactEntity['artefact_id'],
    artefact_value_id: ArtefactValueEntity['artefact_value_id'] | null,
    artefact_string_value: ArtefactRealizationEntity['artefact_string_value'],
    artefact: ArtefactEntity,
    artefactValues: ArtefactValueEntity[] | null
  ): Promise<void> {
    const finalStringValue = this.determineFinalStringValue(
      artefact,
      artefactValues,
      artefact_value_id,
      artefact_string_value
    )
    await this.databaseService.query(
      `
        INSERT INTO ${ this.artefactRealizationsTableName } (model_id, artefact_id, artefact_value_id, artefact_string_value)
        SELECT :model_id, :artefact_id, :artefact_value_id, :artefact_string_value;
        `,
      {
        model_id,
        artefact_id,
        artefact_value_id,
        artefact_string_value: finalStringValue
      }
    )
  }

  private shouldSkipUpdate(
    latestArtefactRealization: ArtefactRealizationEntity | null,
    artefact_value_id: ArtefactValueEntity['artefact_value_id'] | null,
    artefact_string_value: ArtefactRealizationEntity['artefact_string_value'],
    isSelectType: boolean
  ): boolean {
    if (!latestArtefactRealization) return false
    if (isSelectType && latestArtefactRealization.artefact_value_id === artefact_value_id) return true
    if (!isSelectType && latestArtefactRealization.artefact_string_value === artefact_string_value) return true
    return false
  }

  private determineFinalStringValue(
    artefact: ArtefactEntity,
    artefactValues: ArtefactValueEntity[] | null,
    artefact_value_id: ArtefactValueEntity['artefact_value_id'] | null,
    artefact_string_value: ArtefactRealizationEntity['artefact_string_value']
  ): string | null {
    if (ARTEFACT_TYPES_REQUIRING_VALUES.has(artefact.artefact_type_id) && artefactValues) {
      const value = artefactValues.find(val => val.artefact_value_id === artefact_value_id)
      return value ? value.artefact_value : null
    }
    return artefact_string_value
  }
}
