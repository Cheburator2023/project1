import { Module, OnModuleInit } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import {
  AuthGuard,
  KeycloakConnectModule,
  ResourceGuard,
  RoleGuard
} from 'nest-keycloak-connect'

import { AuthModule } from 'src/api/config/config.module'
import { SumDatabaseModule } from 'src/system/sum-database/database.module'
import { MrmDatabaseModule } from 'src/system/mrm-database/database.module'
import { CamundaModule } from 'src/system/camunda/camunda.module'
import { BpmnModule } from 'src/modules/bpmn/bpmn.module'
import { ApiModule } from 'src/api/api.module'
import { KeycloakConfigService } from 'src/api/config/keycloak.config.service'
import { DebounceService } from 'src/debounce/debounce.service'
import { EmitEventDependencies } from 'src/system/common'
import { KeycloakModule } from 'src/system/keycloak/keycloak.module'
import { BiDatamartModule } from 'src/modules/bi-datamart/bi-datamart.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env']
    }),
    KeycloakConnectModule.registerAsync({
      useExisting: KeycloakConfigService,
      imports: [AuthModule]
    }),
    SumDatabaseModule,
    MrmDatabaseModule,
    CamundaModule,
    BpmnModule,
    ApiModule,
    KeycloakModule,
    BiDatamartModule
  ],
  controllers: [],
  providers: [
    DebounceService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard
    },
    {
      provide: APP_GUARD,
      useClass: ResourceGuard
    },
    {
      provide: APP_GUARD,
      useClass: RoleGuard
    }
  ]
})
export class AppModule implements OnModuleInit {
  constructor(
    private readonly debounceService: DebounceService
  ) {
  }

  onModuleInit(): any {
    EmitEventDependencies.initialize(this.debounceService)
  }
}
