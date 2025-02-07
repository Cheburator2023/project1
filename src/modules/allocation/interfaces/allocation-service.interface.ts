import { UserType } from 'src/decorators'
import { UpdateAllocationDto } from '../dto'
import { AllocationEntity } from '../entities'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { SumDatabaseService } from 'src/system/sum-database/database.service'

export interface IAllocationService {
  databaseService: MrmDatabaseService | SumDatabaseService

  handleUpdateAllocation(data: UpdateAllocationDto): Promise<boolean>
}
