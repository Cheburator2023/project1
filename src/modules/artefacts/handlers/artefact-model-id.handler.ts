import { Injectable } from '@nestjs/common'
import { IArtefactHandler, IArtefactService } from '../interfaces'
import { UpdateArtefactDto } from '../dto'
import { ArtefactEntity } from '../entities'
import { ArtefactExecutionContextService } from '../services'

/**
 * Handler for processing artefacts related to "Model Identifier".
 * Fills the "Model Identifier/ID" attribute based on specific logic.
 */
@Injectable()
export class ArtefactModelIdHandler implements IArtefactHandler {
  private artefactService: IArtefactService

  constructor(private readonly artefactExecutionContextService: ArtefactExecutionContextService) {
  }

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
    'identifier_model_algorithm_for_rwa',
    'model_alias',
    'system_model_id'
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

    if (artefactData.artefact_tech_label !== 'model_alias' && artefactData.artefact_tech_label !== 'system_model_id') {
      // Perform the artefact update via the main service
      const result = await this.artefactService.updateArtefact(artefactData)
      if (!result) {
        return result
      }
    }

    // Retrieve the artefact for "Model Identifier/ID"
    const modelIdArtefact: ArtefactEntity | null = await this.artefactService.getArtefactByTechLabel('model_id')
    if (!modelIdArtefact) {
      return false
    }

    const artefactsBatch = this.artefactExecutionContextService.getBatch()
    const { currentModelIdValue, priorityValues } = await this.getExistingArtefactValuesForModel(artefactData.model_id)
    const combinedArtefacts = this.combineArtefacts(artefactsBatch, priorityValues)
    const preferredValue = this.resolvePreferredValue(combinedArtefacts)
    const needUpdate = preferredValue !== currentModelIdValue

    if (needUpdate) {
      return await this.artefactService.updateArtefact({
        model_id: artefactData.model_id,
        artefact_tech_label: 'model_id',
        artefact_string_value: preferredValue,
        artefact_value_id: null,
        creator: artefactData.creator
      })
    }

    return true
  }

  private async getExistingArtefactValuesForModel(modelId: string): Promise<{
    currentModelIdValue: string | null;
    priorityValues: { artefact_tech_label: string; value: string | null }[];
  }> {
    const results: { artefact_tech_label: string; value: string | null }[] = []
    const modelIdArtefact = await this.artefactService.getArtefactByTechLabel('model_id')
    const modelIdRealization = await this.artefactService.getLatestArtefactRealization(modelId, modelIdArtefact.artefact_id)
    const currentModelIdValue = modelIdRealization?.artefact_string_value ?? null

    for (const techLabel of this.priorityAttributes) {
      const artefact: ArtefactEntity | null = await this.artefactService.getArtefactByTechLabel(techLabel)
      if (artefact) {
        const realization = await this.artefactService.getLatestArtefactRealization(modelId, artefact.artefact_id)
        results.push({
          artefact_tech_label: artefact.artefact_tech_label,
          value: realization?.artefact_string_value ?? null
        })
      }
    }

    return {
      currentModelIdValue,
      priorityValues: results
    }
  }

  private combineArtefacts(
    batchArtefacts,
    existingArtefacts: { artefact_tech_label: string; value: string | null }[]
  ): { artefact_tech_label: string; value: string | null }[] {
    const combinedMap = new Map<string, string | null>()

    // Сначала добавляем то, что есть в БД
    for (const artefact of existingArtefacts) {
      combinedMap.set(artefact.artefact_tech_label, artefact.value)
    }

    // Перезаписываем значениями из batch (batch имеет приоритет)
    for (const artefact of batchArtefacts) {
      combinedMap.set(artefact.artefact_tech_label, artefact.artefact_string_value)
    }

    return Array.from(combinedMap.entries()).map(([artefact_tech_label, value]) => ({
      artefact_tech_label,
      value
    }))
  }

  private resolvePreferredValue(artefacts: { artefact_tech_label: string; value: string | null }[]): string | null {
    for (const attr of this.priorityAttributes) {
      const artefact = artefacts.find(a => a.artefact_tech_label === attr && a.value !== null)
      if (artefact) {
        return artefact.value
      }
    }
    return null
  }
}
