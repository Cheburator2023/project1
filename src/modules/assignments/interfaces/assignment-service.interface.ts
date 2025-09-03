import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { AssignmentsWithRolesEntity } from '../entities'

export interface IAssignmentService {
  databaseService: SumDatabaseService

  getAssignmentsWithRolesByModelId(
    modelIds?: string[],
    daysOfDelay?: number
  ): Promise<AssignmentsWithRolesEntity[]>
}
