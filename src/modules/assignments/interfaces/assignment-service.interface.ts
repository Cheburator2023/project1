import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { AssigneeHistWithStreamEntity } from '../entities'

export interface IAssignmentService {
  databaseService: SumDatabaseService

  getAssigneeHistWithStream(): Promise<AssigneeHistWithStreamEntity[]>
}
