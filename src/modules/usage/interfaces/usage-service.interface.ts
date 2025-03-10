import { UpdateUsageDto } from '../dto'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { SumDatabaseService } from 'src/system/sum-database/database.service'

export interface IUsageService {
  databaseService: MrmDatabaseService | SumDatabaseService

  handleUpdateUsage(data: UpdateUsageDto): Promise<boolean>
}
