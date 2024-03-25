import { Module } from "@nestjs/common";
import { ApiController } from "./api.controller";
import { SumDatabaseModule } from "src/system/sum-database/database.module";
import { MrmDatabaseModule } from "src/system/mrm-database/database.module";
import { ApiService } from "./api.service";

@Module({
  controllers: [ApiController],
  providers: [ApiService],
  imports: [SumDatabaseModule, MrmDatabaseModule]
})
export class ApiModule {
}
