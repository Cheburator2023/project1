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
import { ApiModule } from 'src/api/api.module'
import { KeycloakConfigService } from 'src/api/config/keycloak.config.service'
import { DebounceService } from 'src/debounce/debounce.service'
import { EmitEventDependencies } from 'src/system/common'

@Module({
  imports: [
    ConfigModule.forRoot(),
    KeycloakConnectModule.registerAsync({
      useExisting: KeycloakConfigService,
      imports: [AuthModule]
    }),
    SumDatabaseModule,
    MrmDatabaseModule,
    ApiModule
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
