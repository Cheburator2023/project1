import { Module } from "@nestjs/common";
import { SumDatabaseService } from "./database.service";

@Module({
  providers: [SumDatabaseService],
  exports: [SumDatabaseService]
})
export class SumDatabaseModule {
}
