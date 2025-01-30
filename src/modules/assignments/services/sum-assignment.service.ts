import { Injectable, Logger } from '@nestjs/common'
import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { BaseAssignmentService } from './base-assignment.service'
import { IAssignmentService } from '../interfaces'

@Injectable()
export class SumAssignmentService extends BaseAssignmentService implements IAssignmentService {
  protected logger = new Logger(SumAssignmentService.name)

  constructor(
    databaseService: SumDatabaseService
  ) {
    super(databaseService)
  }
}
