import { Module, MiddlewareConsumer } from '@nestjs/common'
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
  BiDatamartController,
  JsonReportController,
  AuthController
} from './controllers'
import { ApiService } from './api.service'
import { RolesGuard } from 'src/api/guards/roles.guard'
import { RateLimitGuard } from 'src/api/guards/rate-limit.guard'
import { AuthModule } from './auth.module'
import { SwaggerAuthMiddleware } from './middlewares/swagger-auth.middleware'

@Module({
  controllers: [
    ModelsController,
    TemplatesController,
    MetricsController,
    CacheController,
    MonitoringController,
    ArtefactsController,
    ReportsController,
    BiDatamartController,
    JsonReportController,
    AuthController
  ],
  providers: [ApiService, RolesGuard, RateLimitGuard],
  imports: [
    SumDatabaseModule,
    MrmDatabaseModule,
    ModelsModule,
    ReportModule,
    MetricsModule,
    ArtefactModule,
    BiDatamartModule,
    AuthModule,
    CacheModule.register({
      ttl: 300, // 5 minutes
      max: 100 // maximum number of items in cache
    })
  ]
})
export class ApiModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SwaggerAuthMiddleware)
      .forRoutes('*')
  }
}