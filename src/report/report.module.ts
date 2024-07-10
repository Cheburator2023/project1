import { Module } from "@nestjs/common";
import { ReportService } from "./report.service";
import { SumDatabaseModule } from "src/system/sum-database/database.module";
import { MrmDatabaseModule } from "src/system/mrm-database/database.module";
import { ExcelModule } from "src/excel/excel.module";

@Module({
  providers: [ReportService],
  imports: [SumDatabaseModule, MrmDatabaseModule, ExcelModule],
  exports: [ReportService]
})
export class ReportModule {
}
