import { UserType } from 'src/decorators'
import { UpdateArtefactDto } from '../dto'
import { ArtefactEntity, ArtefactRealizationEntity, ArtefactValueEntity, EnrichedArtefact } from '../entities'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { SumDatabaseService } from 'src/system/sum-database/database.service'

export interface IArtefactService {
  databaseService: MrmDatabaseService | SumDatabaseService

  handleUpdateArtefact(data: UpdateArtefactDto): Promise<boolean>

  updateArtefact(data: UpdateArtefactDto): Promise<boolean>

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

  setEffectiveToArtefactRealization(
    latestArtefactRealization: ArtefactRealizationEntity,
    isSelectType: boolean
  ): Promise<void>

  insertArtefactRealization(
    model_id: string,
    artefact_id: number,
    artefact_value_id: number | null,
    artefact_string_value: string,
    artefact: ArtefactEntity,
    artefactValues: ArtefactValueEntity[] | null,
    creator: string
  ): Promise<void>

  getModelById(
    model_id: string
  ): Promise<any>

  getMaxArtefactUpdateDate(model_id: string): Promise<any>

  canEditArtefact(artefact: ArtefactEntity, user?: UserType, artefactRolesMap?: Map<number, string[]>): boolean;
  
  getArtefacts(): Promise<{ data: ArtefactEntity[] }>;

  getArtefactWithPermissions(user: UserType): Promise<{ data: EnrichedArtefact[] }>;
}
