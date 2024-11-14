import { UpdateArtefactDto } from '../dto'
import { ArtefactEntity, ArtefactRealizationEntity, ArtefactValueEntity } from '../entities'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { SumDatabaseService } from 'src/system/sum-database/database.service'

export interface IArtefactService {
  databaseService: MrmDatabaseService | SumDatabaseService

  handleUpdateArtefact(data: UpdateArtefactDto): Promise<void>

  updateArtefact(data: UpdateArtefactDto): Promise<void>

  getLatestArtefactRealization(
    model_id: UpdateArtefactDto['model_id'],
    artefact_id: ArtefactEntity['artefact_id']
  ): Promise<ArtefactRealizationEntity | null>

  getArtefactByTechLabel(artefact_tech_label: UpdateArtefactDto['artefact_tech_label']): Promise<ArtefactEntity | null>

  getArtefactValues(artefact_id: ArtefactEntity['artefact_id']): Promise<ArtefactValueEntity[]>

  resolveArtefactValueId(
    artefactData: UpdateArtefactDto,
    artefactValues: ArtefactValueEntity[] | null
  ): number | null

  insertArtefactRealization(
    model_id: string,
    artefact_id: number,
    artefact_value_id: number | null,
    artefact_string_value: string,
    artefact: ArtefactEntity,
    artefactValues: ArtefactValueEntity[] | null
  ): Promise<void>
}
