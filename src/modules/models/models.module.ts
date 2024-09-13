import { Module } from '@nestjs/common'
import { ModelsService } from './models.service'
import { AllocationModule } from 'src/modules/allocation/allocation.module'
import { UsageModule } from 'src/modules/usage/usage.module'
import { SumDatabaseModule } from 'src/system/sum-database/database.module'
import { MrmDatabaseModule } from 'src/system/mrm-database/database.module'

@Module({
  providers: [ModelsService],
  imports: [SumDatabaseModule, MrmDatabaseModule, AllocationModule, UsageModule],
  exports: [ModelsService]
})
export class ModelsModule {
}
