import { Module } from '@nestjs/common'
import { MetricsService } from './metrics.service'
import { ImplementedService } from './implemented.service'
import { DevelopedService } from './developed.service'
import { TotalService } from './total.service'
import { SumRmService } from './sum-rm.service'
import { PilotsService } from './pilots.service'
import { OutOfOperationService } from './out-of-operation.service'
import { RegistryCoverageService } from './registry-coverage.service'
import { FinalStatusService } from './final-status.service'
import { FinalStatusByMonthService } from './final-status-by-month.service'
import { RegistryCoverageFinalService } from './registry-coverage-final.service'
import { IsOnMonitoringService } from './isOnMonitoring.service'

import { SumDatabaseModule } from 'src/system/sum-database/database.module'
import { MrmDatabaseModule } from 'src/system/mrm-database/database.module'

@Module({
  providers: [
    MetricsService,
    ImplementedService,
    DevelopedService,
    TotalService,
    SumRmService,
    PilotsService,
    OutOfOperationService,
    RegistryCoverageService,
    FinalStatusService,
    FinalStatusByMonthService,
    RegistryCoverageFinalService,
    IsOnMonitoringService,
  ]
  ,
  imports: [SumDatabaseModule, MrmDatabaseModule],
  exports: [MetricsService]
})
export class MetricsModule {
}
