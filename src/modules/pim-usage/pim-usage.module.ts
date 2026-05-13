import { Module } from '@nestjs/common'
import { MrmDatabaseModule } from 'src/system/mrm-database/database.module'
import { PimUsageService } from './pim-usage.service'

@Module({
  imports: [MrmDatabaseModule],
  providers: [PimUsageService],
  exports: [PimUsageService]
})
export class PimUsageModule {}
