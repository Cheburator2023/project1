import { forwardRef, Module } from '@nestjs/common'
import { SumDatabaseModule } from 'src/system/sum-database/database.module'
import { MrmDatabaseModule } from 'src/system/mrm-database/database.module'
import { ModelsModule } from '../models/models.module'
import { UsageServiceFactory } from './factories'
import { MrmUsageService, SumUsageService } from './services'
import { UsageService } from './usage.service'

@Module({
  imports: [
    forwardRef(() => ModelsModule),
    SumDatabaseModule,
    MrmDatabaseModule
  ],
  providers: [
    UsageServiceFactory,
    MrmUsageService,
    SumUsageService,
    UsageService
  ],
  exports: [UsageService]
})
export class UsageModule {}
