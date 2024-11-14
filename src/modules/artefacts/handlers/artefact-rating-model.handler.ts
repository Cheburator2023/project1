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
  async handle(artefactData: UpdateArtefactDto): Promise<void> {
    // Perform the artefact update via the main service
    await this.artefactService.updateArtefact(artefactData)

    // Retrieve the "rating_model" and "record_id" artefacts
    const ratingModelArtefact = await this.getArtefact(artefactData.artefact_tech_label)
    const recordIdArtefact = await this.getArtefact('record_id')

    if (!ratingModelArtefact || !recordIdArtefact) {
      return
    }

    // Check for the presence of the "Да" value in the "rating_model" artefact
    const isValuePresent = await this.checkIfArtefactHasValue(ratingModelArtefact, artefactData)
    if (!isValuePresent) return

    // Check if the latest realization of the "record_id" artefact exists
    const latestRecordIdArtefactRealization: ArtefactRealizationEntity | null = await this.artefactService.getLatestArtefactRealization(
      artefactData.model_id,
      recordIdArtefact.artefact_id
    )

    if (latestRecordIdArtefactRealization) {
      return
    }

    // Get the maximum value of "record_id" and insert a new realization
    const recordIdMaxVal = await this.getMaxValueOfRecordId()
    await this.insertRecordIdRealization(artefactData.model_id, recordIdArtefact, recordIdMaxVal + 1)
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
   * Retrieves an artefact by its technical label.
   * @param techLabel The technical label of the artefact.
   * @returns The artefact or null if not found.
   */
  private async getArtefact(techLabel: string): Promise<ArtefactEntity | null> {
    return await this.artefactService.getArtefactByTechLabel(techLabel)
  }

  /**
   * Inserts a new realization of the "record_id" artefact with the specified value.
   * @param modelId The ID of the model.
   * @param recordIdArtefact The "record_id" artefact.
   * @param newValue The new value to be inserted.
   */
  private async insertRecordIdRealization(modelId: string, recordIdArtefact: ArtefactEntity, newValue: number): Promise<void> {
    await this.artefactService.insertArtefactRealization(
      modelId,
      recordIdArtefact.artefact_id,
      null,
      String(newValue),
      recordIdArtefact,
      null
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
