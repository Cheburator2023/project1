import { UpdateArtefactDto } from '../dto'
import { IArtefactService } from './artefact-service.interface'

export interface IArtefactHandler {
  supports(artefactTechLabel: UpdateArtefactDto['artefact_tech_label']): boolean

  handle(artefactData: UpdateArtefactDto): Promise<boolean>

  setArtefactService(service: IArtefactService): void
}
