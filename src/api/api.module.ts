import { Module } from "@nestjs/common";
import { ReportModule } from "src/report/report.module";
import { SumDatabaseModule } from "src/system/sum-database/database.module";
import { MrmDatabaseModule } from "src/system/mrm-database/database.module";
import { ApiController } from "./api.controller";
import { ApiService } from "./api.service";

@Module({
  controllers: [ApiController],
  providers: [ApiService],
  imports: [SumDatabaseModule, MrmDatabaseModule, ReportModule]
})
export class ApiModule {
}
