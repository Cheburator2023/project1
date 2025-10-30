import { Injectable } from '@nestjs/common'
import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { BaseArtefactService } from './base-artefact.service'
import { SUM_TABLES } from '../constants'
import { IArtefactService } from '../interfaces'
import { LoggerService } from 'src/system/logger/logger.service'

@Injectable()
export class SumArtefactService
  extends BaseArtefactService
  implements IArtefactService
{
  protected modelsTableName = SUM_TABLES.MODELS
  protected artefactsTableName = SUM_TABLES.ARTEFACTS
  protected artefactValuesTableName = SUM_TABLES.ARTEFACT_VALUES
  protected artefactRealizationsTableName = SUM_TABLES.ARTEFACT_REALIZATIONS

  constructor(databaseService: SumDatabaseService, logger: LoggerService) {
    super(databaseService, logger)
  }
}
