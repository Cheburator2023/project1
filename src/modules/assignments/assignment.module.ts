import { Module } from '@nestjs/common'
import { SumDatabaseModule } from 'src/system/sum-database/database.module'
import { AssignmentService } from './assignment.service'
import { AssignmentServiceFactory } from './factories'
import { SumAssignmentService } from './services'

@Module({
  imports: [SumDatabaseModule],
  providers: [
    SumAssignmentService,
    AssignmentServiceFactory,
    AssignmentService
  ],
  exports: [AssignmentService]
})
export class AssignmentModule {}
