import { Module, forwardRef } from '@nestjs/common'
import { MrmDatabaseModule } from 'src/system/mrm-database/database.module'
import { SumDatabaseModule } from 'src/system/sum-database/database.module'
import { PimUsageModule } from 'src/modules/pim-usage/pim-usage.module'
import { UsageModule } from 'src/modules/usage/usage.module'
import { ModelsModule } from 'src/modules/models/models.module'
import { QuarterlyConfirmationService } from './quarterly-confirmation.service'

@Module({
  imports: [
    MrmDatabaseModule,
    SumDatabaseModule,
    PimUsageModule,
    forwardRef(() => UsageModule),
    ModelsModule
  ],
  providers: [QuarterlyConfirmationService],
  exports: [QuarterlyConfirmationService, PimUsageModule]
})
export class QuarterlyConfirmationModule {}
