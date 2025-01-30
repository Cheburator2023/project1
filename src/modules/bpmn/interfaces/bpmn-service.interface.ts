import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { BpmnInstanceEntity } from '../entities'

export interface IBpmnService {
  databaseService: SumDatabaseService

  getInstances(bpmnIds?: string[]): Promise<BpmnInstanceEntity[]>
}
