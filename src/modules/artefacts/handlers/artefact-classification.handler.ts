import { Injectable } from '@nestjs/common'
import { IArtefactHandler, IArtefactService } from '../interfaces'
import { UpdateArtefactDto } from '../dto'
import { ArtefactEntity, ArtefactValueEntity } from '../entities'

/**
 * Handler for processing artefacts of type "classification_of_rs_by_order_of_application_within_pvr".
 */
@Injectable()
export class ArtefactClassificationHandler implements IArtefactHandler {
  private artefactService: IArtefactService

  /**
   * Configurable list of artefact labels that can be edited programmatically.
   * This can be expanded or replaced via Dependency Injection.
   */
  private readonly editableArtefactLabels: string[] = ['pvr']

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
   *
   * @param {IArtefactService} service - An instance of the artefact service.
   */
  setArtefactService(service: IArtefactService) {
    this.artefactService = service
  }

  /**
   * Checks if the handler supports the given artefact type.
   *
   * @param {UpdateArtefactDto['artefact_tech_label']} artefactTechLabel - The technical label of the artefact.
   * @returns {boolean} - true if the handler supports the specified type, otherwise false.
   */
  supports(
    artefactTechLabel: UpdateArtefactDto['artefact_tech_label']
  ): boolean {
    return (
      artefactTechLabel ===
      'classification_of_rs_by_order_of_application_within_pvr'
    )
  }

  /**
   * Executes the processing logic for an artefact of type "classification_of_rs_by_order_of_application_within_pvr".
   * This includes updating the artefact and setting the value of the "PVR" artefact based on conditions.
   *
   * @param {UpdateArtefactDto} artefactData - The data of the artefact to be updated.
   * @returns {Promise<boolean>} - true if the operation was successful, otherwise false.
   */
  async handle(artefactData: UpdateArtefactDto): Promise<boolean> {
    this.artefactService.canEditArtefact = this.canEditArtefact.bind(this)

    // Perform the artefact update via the main service
    const result = await this.artefactService.updateArtefact(artefactData)
    if (!result) {
      return result
    }

    // Retrieve the artefact for "PVR"
    const pvrArtefact: ArtefactEntity | null =
      await this.artefactService.getArtefactByTechLabel('pvr')
    if (!pvrArtefact) {
      return false
    }

    // Determine the value for "PVR" based on the classification attribute
    const isRegulatorApprovalRequired =
      await this.checkIfArtefactHasSpecificValue(
        artefactData,
        'Рейтинговые системы, подлежащие согласованию Регулятором'
      )

    const pvrValue = isRegulatorApprovalRequired ? '1' : '0'

    return await this.artefactService.updateArtefact({
      model_id: artefactData.model_id,
      artefact_tech_label: 'pvr',
      artefact_string_value: pvrValue,
      artefact_value_id: null,
      creator: artefactData.creator
    })
  }

  /**
   * Checks if the given artefact has the specified value.
   *
   * @param {UpdateArtefactDto} artefactData - The data of the artefact.
   * @param {string} valueToCheck - The value to check in the artefact.
   * @returns {Promise<boolean>} - true if the specified value is present, otherwise false.
   */
  private async checkIfArtefactHasSpecificValue(
    artefactData: UpdateArtefactDto,
    valueToCheck: string
  ): Promise<boolean> {
    const classificationArtefact: ArtefactEntity | null =
      await this.artefactService.getArtefactByTechLabel(
        artefactData.artefact_tech_label
      )
    if (!classificationArtefact) {
      return false
    }
    const artefactValues: ArtefactValueEntity[] =
      await this.artefactService.getArtefactValues(
        classificationArtefact.artefact_id
      )
    const resolvedArtefactValueId = this.artefactService.resolveArtefactValueId(
      artefactData,
      artefactValues
    )

    return (
      Array.isArray(artefactValues) &&
      artefactValues.some(
        (value) =>
          value.artefact_value_id === resolvedArtefactValueId &&
          value.artefact_value === valueToCheck
      )
    )
  }
}
