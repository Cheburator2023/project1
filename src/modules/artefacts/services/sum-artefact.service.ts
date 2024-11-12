import { Injectable, Logger } from '@nestjs/common'
import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { BaseArtefactService } from './base-artefact.service'
import { SUM_TABLES } from '../constants'

@Injectable()
export class SumArtefactService extends BaseArtefactService {
  protected modelsTableName = SUM_TABLES.MODELS
  protected artefactsTableName = SUM_TABLES.ARTEFACTS
  protected artefactValuesTableName = SUM_TABLES.ARTEFACT_VALUES
  protected artefactRealizationsTableName = SUM_TABLES.ARTEFACT_REALIZATIONS
  protected logger = new Logger(SumArtefactService.name)

  constructor(
    databaseService: SumDatabaseService
  ) {
    super(databaseService)
  }
}
