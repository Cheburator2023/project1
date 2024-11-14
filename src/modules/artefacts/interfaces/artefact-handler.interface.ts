import { UpdateArtefactDto } from '../dto'
import { IArtefactService } from './artefact-service.interface'

export interface IArtefactHandler {
  supports(artefactTechLabel: UpdateArtefactDto['artefact_tech_label']): boolean

  handle(artefactData: UpdateArtefactDto): Promise<void>

  setArtefactService(service: IArtefactService): void
}
