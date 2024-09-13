import { Module } from '@nestjs/common'
import { AllocationSumService } from './allocation.sum.service'
import { AllocationSumRmService } from './allocation.sum.rm.service'
import { SumDatabaseModule } from 'src/system/sum-database/database.module'
import { MrmDatabaseModule } from 'src/system/mrm-database/database.module'

@Module({
  providers: [AllocationSumService, AllocationSumRmService],
  imports: [SumDatabaseModule, MrmDatabaseModule],
  exports: [AllocationSumService, AllocationSumRmService]
})
export class AllocationModule {
}
