import { Module } from "@nestjs/common";
import { MetricsModule } from "src/metrics/metrics.module";
import { ReportModule } from "src/report/report.module";
import { SumDatabaseModule } from "src/system/sum-database/database.module";
import { MrmDatabaseModule } from "src/system/mrm-database/database.module";
import { ApiController } from "./api.controller";
import { ApiService } from "./api.service";

@Module({
  controllers: [ApiController],
  providers: [ApiService],
  imports: [SumDatabaseModule, MrmDatabaseModule, MetricsModule, ReportModule]
})
export class ApiModule {
}
