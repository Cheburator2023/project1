import { UpdateArtefactDto } from '../dto'

export interface IArtefactService {
  updateArtefact(data: UpdateArtefactDto): Promise<void>
}
