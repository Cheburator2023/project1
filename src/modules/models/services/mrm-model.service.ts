import { Injectable } from '@nestjs/common'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { BaseModelService } from './base-model.service'
import { MRM_TABLES } from '../constants'
import { LoggerService } from 'src/system/logger/logger.service'
import { MrmArtefactService } from 'src/modules/artefacts/services'

@Injectable()
export class MrmModelService extends BaseModelService {
  protected modelsTableName = MRM_TABLES.MODELS

  constructor(artefactService: MrmArtefactService, databaseService: MrmDatabaseService, logger: LoggerService) {
    super(artefactService, databaseService, logger)
  }
}
