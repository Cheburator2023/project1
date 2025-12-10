import { Module } from '@nestjs/common'
import { ReportService } from './report.service'
import { SumDatabaseModule } from 'src/system/sum-database/database.module'
import { MrmDatabaseModule } from 'src/system/mrm-database/database.module'
import { ModelsModule } from 'src/modules/models/models.module'
import { ExcelModule } from 'src/excel/excel.module'
import { MetricsModule } from 'src/modules/metrics/metrics.module'
import { CacheModule } from '@nestjs/common'
import { LoggerModule } from 'src/system/logger/logger.module'
import { ReportCacheService } from './report-cache.service'
import { ReportValidationService } from './report-validation.service'
import { JsonReportService } from './json-report.service'

@Module({
  providers: [
    ReportService,
    ReportCacheService,
    ReportValidationService,
    JsonReportService
  ],
  imports: [
    SumDatabaseModule,
    MrmDatabaseModule,
    ModelsModule,
    ExcelModule,
    MetricsModule,
    LoggerModule,
    CacheModule.register({
      ttl: 300, // 5 минут
      max: 100
    })
  ],
  exports: [
    ReportService,
    JsonReportService
  ]
})
export class ReportModule {}
