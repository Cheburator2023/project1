import { forwardRef, Module } from '@nestjs/common'
import { SumDatabaseModule } from 'src/system/sum-database/database.module'
import { MrmDatabaseModule } from 'src/system/mrm-database/database.module'
import { AllocationService } from './allocation.service'
import { AllocationServiceFactory } from './factories'
import { MrmAllocationService, SumAllocationService } from './services'
import { ModelsModule } from '../models/models.module'

@Module({
  imports: [
    forwardRef(() => ModelsModule),
    SumDatabaseModule,
    MrmDatabaseModule
  ],
  providers: [
    AllocationServiceFactory,
    MrmAllocationService,
    SumAllocationService,
    AllocationService
  ],
  exports: [AllocationService]
})
export class AllocationModule {}
