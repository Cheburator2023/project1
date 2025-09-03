import { Injectable, Logger } from '@nestjs/common'
import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { BaseBpmnService } from './base-bpmn.service'
import { IBpmnService } from '../interfaces'

@Injectable()
export class SumBpmnService extends BaseBpmnService implements IBpmnService {
  protected logger = new Logger(SumBpmnService.name)

  constructor(databaseService: SumDatabaseService) {
    super(databaseService)
  }
}
