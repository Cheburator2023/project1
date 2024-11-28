import { Injectable } from '@nestjs/common'
import { IArtefactHandler, IArtefactService } from '../interfaces'
import { UpdateArtefactDto } from '../dto'
import { ArtefactEntity, ArtefactRealizationEntity } from '../entities'

/**
 * Handler for processing artefacts related to "Model Identifier".
 * Fills the "Model Identifier/ID" attribute based on specific logic.
 */
@Injectable()
export class ArtefactModelIdHandler implements IArtefactHandler {
  private artefactService: IArtefactService

  /**
   * Configurable list of artefact labels that can be edited programmatically.
   * This can be expanded or replaced via Dependency Injection.
   */
  private readonly editableArtefactLabels: string[] = ['model_id']

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
   * Attributes to check in priority order
   */
  private readonly priorityAttributes = [
    'regulatory_code_model_pvr',
    'model_id_from_model_owner',
    'identifier_model_algorithm_for_rwa'
  ]

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
   * @returns true if the artefact is one of the priority attributes.
   */
  supports(artefactTechLabel: UpdateArtefactDto['artefact_tech_label']): boolean {
    return this.priorityAttributes.includes(artefactTechLabel)
  }

  /**
   * Executes the processing logic for an artefact of type "Model Identifier".
   * Fills the "Model Identifier/ID" attribute based on the priority order of other attributes.
   * @param artefactData The data of the artefact to be updated.
   */
  async handle(artefactData: UpdateArtefactDto): Promise<boolean> {
    this.artefactService.canEditArtefact = this.canEditArtefact.bind(this)

    // Perform the artefact update via the main service
    const result = await this.artefactService.updateArtefact(artefactData)
    if (!result) {
      return result
    }

    // Retrieve the artefact for "Model Identifier/ID"
    const modelIdArtefact: ArtefactEntity | null = await this.artefactService.getArtefactByTechLabel('model_id')
    if (!modelIdArtefact) {
      return false
    }

    // Find the first non-empty value from the priority attributes
    let resolvedValue: string | null = null
    for (const techLabel of this.priorityAttributes) {
      const value = await this.getAttributeValue(artefactData.model_id, techLabel)
      if (value) {
        resolvedValue = value
        break
      }
    }

    // If no value is found, set to resolvedValue system id
    if (!resolvedValue) {
      resolvedValue = artefactData.model_id
    }

    return await this.artefactService.updateArtefact({
      model_id: artefactData.model_id,
      artefact_tech_label: 'model_id',
      artefact_string_value: resolvedValue,
      artefact_value_id: null
    })
  }

  /**
   * Retrieves the value of the specified attribute for a given model.
   * @param modelId The ID of the model.
   * @param techLabel The technical label of the attribute to retrieve.
   * @returns The value of the attribute or null if not found.
   */
  private async getAttributeValue(modelId: string, techLabel: string): Promise<string | null> {
    const artefact: ArtefactEntity | null = await this.artefactService.getArtefactByTechLabel(techLabel)
    if (!artefact) {
      return null
    }

    const latestRealization: ArtefactRealizationEntity | null = await this.artefactService.getLatestArtefactRealization(
      modelId,
      artefact.artefact_id
    )

    return latestRealization?.artefact_string_value || null
  }
}
