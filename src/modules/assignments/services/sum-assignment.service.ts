import { Injectable } from '@nestjs/common'
import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { BaseAssignmentService } from './base-assignment.service'
import { IAssignmentService } from '../interfaces'
import { LoggerService } from 'src/system/logger/logger.service'

@Injectable()
export class SumAssignmentService extends BaseAssignmentService implements IAssignmentService {
  constructor(
    databaseService: SumDatabaseService,
    logger: LoggerService
  ) {
    super(databaseService, logger)
  }
}
