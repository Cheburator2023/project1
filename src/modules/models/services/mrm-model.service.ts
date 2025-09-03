import { Injectable, Logger } from '@nestjs/common'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { BaseModelService } from './base-model.service'
import { MRM_TABLES } from '../constants'

@Injectable()
export class MrmModelService extends BaseModelService {
  protected modelsTableName = MRM_TABLES.MODELS
  protected logger = new Logger(MrmModelService.name)

  constructor(databaseService: MrmDatabaseService) {
    super(databaseService)
  }
}
