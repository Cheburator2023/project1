import { Injectable, Logger } from '@nestjs/common'
import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { BaseModelService } from './base-model.service'
import { SUM_TABLES } from '../constants'

@Injectable()
export class SumModelService extends BaseModelService {
  protected modelsTableName = SUM_TABLES.MODELS
  protected logger = new Logger(SumModelService.name)

  constructor(
    databaseService: SumDatabaseService
  ) {
    super(databaseService)
  }
}
