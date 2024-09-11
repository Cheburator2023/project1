import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import {
  AuthGuard,
  KeycloakConnectModule,
  ResourceGuard,
  RoleGuard
} from "nest-keycloak-connect";

import { AuthModule } from "src/api/config/config.module";
import { SumDatabaseModule } from "src/system/sum-database/database.module";
import { MrmDatabaseModule } from "src/system/mrm-database/database.module";
import { ApiModule } from "src/api/api.module";
import { ModelsModule } from "src/modules/models/models.module";
import { KeycloakConfigService } from "src/api/config/keycloak.config.service";
import { ReportModule } from "src/report/report.module";
import { ExcelModule } from "src/excel/excel.module";

@Module({
  imports: [
    ConfigModule.forRoot(),
    KeycloakConnectModule.registerAsync({
      useExisting: KeycloakConfigService,
      imports: [AuthModule]
    }),
    SumDatabaseModule,
    MrmDatabaseModule,
    ApiModule,
    ModelsModule,
    ReportModule,
    ExcelModule
  ],
  controllers: [],
  providers: [
    // {
    //   provide: APP_GUARD,
    //   useClass: AuthGuard
    // },
    // {
    //   provide: APP_GUARD,
    //   useClass: ResourceGuard
    // },
    // {
    //   provide: APP_GUARD,
    //   useClass: RoleGuard
    // }
  ]
})
export class AppModule {
}
