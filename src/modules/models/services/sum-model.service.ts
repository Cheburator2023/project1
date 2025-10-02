import { Injectable } from '@nestjs/common'
import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { BaseModelService } from './base-model.service'
import { SUM_TABLES } from '../constants'
import { LoggerService } from 'src/system/logger/logger.service'

@Injectable()
export class SumModelService extends BaseModelService {
  protected modelsTableName = SUM_TABLES.MODELS

  constructor(
    databaseService: SumDatabaseService,
    logger: LoggerService
  ) {
    super(databaseService, logger)
  }
}
