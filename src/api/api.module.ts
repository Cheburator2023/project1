import { Module } from '@nestjs/common'
import { ModelsModule } from 'src/modules/models/models.module'
import { ReportModule } from 'src/modules/report/report.module'
import { MetricsModule } from 'src/modules/metrics/metrics.module'
import { SumDatabaseModule } from 'src/system/sum-database/database.module'
import { MrmDatabaseModule } from 'src/system/mrm-database/database.module'
import { ArtefactModule } from 'src/modules/artefacts/artefact.module'
import { BiDatamartModule } from 'src/modules/bi-datamart/bi-datamart.module'
import { CacheModule } from '@nestjs/common'
import {
  ModelsController,
  TemplatesController,
  MetricsController,
  CacheController,
  MonitoringController,
  ArtefactsController,
  ReportsController,
  BiDatamartController
} from './controllers'
import { ApiService } from './api.service'

@Module({
  controllers: [
    ModelsController,
    TemplatesController,
    MetricsController,
    CacheController,
    MonitoringController,
    ArtefactsController,
    ReportsController,
    BiDatamartController
  ],
  providers: [ApiService],
  imports: [
    SumDatabaseModule,
    MrmDatabaseModule,
    ModelsModule,
    ReportModule,
    MetricsModule,
    ArtefactModule,
    BiDatamartModule,
    CacheModule.register({
      ttl: 300, // 5 minutes
      max: 100 // maximum number of items in cache
    })
  ]
})
export class ApiModule {}
