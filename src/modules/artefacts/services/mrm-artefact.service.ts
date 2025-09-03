import { Inject, Injectable, Logger } from '@nestjs/common'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { BaseArtefactService } from './base-artefact.service'
import { MRM_TABLES } from '../constants'
import { IArtefactService, IArtefactHandler } from '../interfaces'
import { UpdateArtefactDto } from '../dto'

@Injectable()
export class MrmArtefactService
  extends BaseArtefactService
  implements IArtefactService
{
  protected modelsTableName = MRM_TABLES.MODELS
  protected artefactsTableName = MRM_TABLES.ARTEFACTS
  protected artefactValuesTableName = MRM_TABLES.ARTEFACT_VALUES
  protected artefactRealizationsTableName = MRM_TABLES.ARTEFACT_REALIZATIONS
  protected logger = new Logger(MrmArtefactService.name)

  constructor(
    databaseService: MrmDatabaseService,
    @Inject('MrmArtefactHandlers')
    private readonly handlers: IArtefactHandler[]
  ) {
    super(databaseService)
  }

  async handleUpdateArtefact(
    artefactData: UpdateArtefactDto
  ): Promise<boolean> {
    const handler = this.handlers.find((handler) =>
      handler.supports(artefactData.artefact_tech_label)
    )
    let result

    if (handler) {
      result = await handler.handle(artefactData)
    } else {
      result = await super.handleUpdateArtefact(artefactData)
    }

    return result
  }
}
