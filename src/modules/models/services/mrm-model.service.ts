import { Injectable } from '@nestjs/common'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { BaseModelService } from './base-model.service'
import { MRM_TABLES } from '../constants'
import { LoggerService } from 'src/system/logger/logger.service'

@Injectable()
export class MrmModelService extends BaseModelService {
  protected modelsTableName = MRM_TABLES.MODELS

  constructor(databaseService: MrmDatabaseService, logger: LoggerService) {
    super(databaseService, logger)
  }
}
