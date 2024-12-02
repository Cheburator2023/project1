import { Injectable } from '@nestjs/common'
import { IArtefactHandler, IArtefactService } from '../interfaces'
import { UpdateArtefactDto } from '../dto'
import { ArtefactEntity, ArtefactRealizationEntity, ArtefactValueEntity } from '../entities'
import { ARTEFACT_TYPES_REQUIRING_VALUES } from '../constants'

/**
 * Handler for processing artefacts of type "rating_model".
 * Responsible for specific "rating_model" logic for updating and inserting values into the database.
 */
@Injectable()
export class ArtefactRatingModelHandler implements IArtefactHandler {
  private artefactService: IArtefactService

  /**
   * Configurable list of artefact labels that can be edited programmatically.
   * This can be expanded or replaced via Dependency Injection.
   */
  private readonly editableArtefactLabels: string[] = ['record_id']

  /**
   * Determines if the given artefact can be edited programmatically.
   *
   * @param {ArtefactEntity} artefact - The artefact entity to check.
   * @returns {boolean} - true if the artefact can be edited, otherwise false.
   */
  canEditArtefact(artefact: ArtefactEntity): boolean {
    return this.editableArtefactLabels.includes(artefact.artefact_tech_label)
  }

  /**
   * Sets the artefact service needed by the handler.
   * @param service An instance of the artefact service.
   */
  setArtefactService(service: IArtefactService) {
    this.artefactService = service
  }

  /**
   * Checks if the handler supports the given artefact type.
   * @param artefactTechLabel The technical label of the artefact.
   * @returns true if the handler supports the "rating_model" type, otherwise false.
   */
  supports(artefactTechLabel: UpdateArtefactDto['artefact_tech_label']): boolean {
    return artefactTechLabel === 'rating_model'
  }

  /**
   * Executes the processing logic for an artefact of type "rating_model".
   * This includes updating the artefact, verifying the type, and inserting a record if conditions are met.
   * @param artefactData The data of the artefact to be updated.
   */
  async handle(artefactData: UpdateArtefactDto): Promise<boolean> {
    this.artefactService.canEditArtefact = this.canEditArtefact.bind(this)

    // Perform the artefact update via the main service
    const result = await this.artefactService.updateArtefact(artefactData)
    if (!result) {
      return result
    }

    // Retrieve the "rating_model" and "record_id" artefacts
    const ratingModelArtefact: ArtefactEntity | null = await this.artefactService.getArtefactByTechLabel(artefactData.artefact_tech_label)
    const recordIdArtefact: ArtefactEntity | null = await this.artefactService.getArtefactByTechLabel('record_id')

    if (!ratingModelArtefact || !recordIdArtefact) {
      return false
    }

    // Check for the presence of the "Да" value in the "rating_model" artefact
    const isValuePresent = await this.checkIfArtefactHasValue(ratingModelArtefact, artefactData)
    if (!isValuePresent) return false

    // Check if the latest realization of the "record_id" artefact exists
    const latestRecordIdArtefactRealization: ArtefactRealizationEntity | null = await this.artefactService.getLatestArtefactRealization(
      artefactData.model_id,
      recordIdArtefact.artefact_id
    )

    if (latestRecordIdArtefactRealization) {
      return false
    }

    // Get the maximum value of "record_id" and insert a new realization
    const recordIdMaxVal = await this.getMaxValueOfRecordId()

    return await this.artefactService.updateArtefact({
      model_id: artefactData.model_id,
      artefact_tech_label: 'record_id',
      artefact_string_value: String(recordIdMaxVal + 1),
      artefact_value_id: null
    })
  }

  /**
   * Checks if the "rating_model" artefact has the "Да" value.
   * @param ratingModelArtefact The "rating_model" artefact.
   * @param artefactData The data of the artefact to be updated.
   * @returns true if the "Да" value is present, otherwise false.
   */
  private async checkIfArtefactHasValue(ratingModelArtefact: ArtefactEntity, artefactData: UpdateArtefactDto): Promise<boolean> {
    const isSelectType = ARTEFACT_TYPES_REQUIRING_VALUES.has(ratingModelArtefact.artefact_type_id)
    const artefactValues: ArtefactValueEntity[] | null = isSelectType
      ? await this.artefactService.getArtefactValues(ratingModelArtefact.artefact_id)
      : null

    const resolvedArtefactValueId = this.artefactService.resolveArtefactValueId(artefactData, artefactValues)
    return (
      Array.isArray(artefactValues) &&
      artefactValues.some((value) => value.artefact_value_id === resolvedArtefactValueId && value.artefact_value === 'Да')
    )
  }

  /**
   * Retrieves the maximum numerical value for the "record_id" artefact.
   * @returns The maximum value for "record_id".
   */
  private async getMaxValueOfRecordId(): Promise<number> {
    const [data] = await this.artefactService.databaseService.query(
      `
      SELECT MAX(
        COALESCE(
          CASE
            WHEN artefact_string_value ~ '^[0-9]+$' THEN artefact_string_value::Numeric
            ELSE 0
          END,
          0
        )
      ) AS max_value
      FROM artefact_realizations_new
      INNER JOIN artefacts a ON artefact_realizations_new.artefact_id = a.artefact_id
      WHERE artefact_tech_label = 'record_id';
      `,
      {}
    )

    return data?.max_value || 0
  }
}
