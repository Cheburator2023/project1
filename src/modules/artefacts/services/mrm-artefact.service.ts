import { Injectable, Logger } from '@nestjs/common'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { BaseArtefactService } from './base-artefact.service'
import { MRM_TABLES } from '../constants'

@Injectable()
export class MrmArtefactService extends BaseArtefactService {
  protected modelsTableName = MRM_TABLES.MODELS
  protected artefactsTableName = MRM_TABLES.ARTEFACTS
  protected artefactValuesTableName = MRM_TABLES.ARTEFACT_VALUES
  protected artefactRealizationsTableName = MRM_TABLES.ARTEFACT_REALIZATIONS
  protected logger = new Logger(MrmArtefactService.name)

  constructor(
    databaseService: MrmDatabaseService
  ) {
    super(databaseService)
  }
}
