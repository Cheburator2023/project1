import { Injectable } from '@nestjs/common'
import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { BaseBpmnService } from './base-bpmn.service'
import { IBpmnService } from '../interfaces'
import { LoggerService } from 'src/system/logger/logger.service'

@Injectable()
export class SumBpmnService extends BaseBpmnService implements IBpmnService {
  constructor(databaseService: SumDatabaseService, logger: LoggerService) {
    super(databaseService, logger)
  }
}
