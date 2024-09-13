import { Module } from '@nestjs/common'
import { UsageSumService } from './usage.sum.service'
import { UsageSumRmService } from './usage.sum.rm.service'
import { SumDatabaseModule } from 'src/system/sum-database/database.module'
import { MrmDatabaseModule } from 'src/system/mrm-database/database.module'

@Module({
  providers: [UsageSumService, UsageSumRmService],
  imports: [SumDatabaseModule, MrmDatabaseModule],
  exports: [UsageSumService, UsageSumRmService]
})
export class UsageModule {
}
