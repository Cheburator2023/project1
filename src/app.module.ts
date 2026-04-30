import { Module, OnModuleInit } from '@nestjs/common'
import { APP_GUARD, Reflector } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import {
  AuthGuard,
  KeycloakConnectModule,
  ResourceGuard
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
import { DatabaseSchemaModule } from 'src/modules/database-schema/database-schema.module'
import { TemplateMigrationService } from 'src/migrations/migrate-templates'
import { MigrationModule } from 'src/modules/migration.module'

import { GodModeGuard } from 'src/system/guards/god-mode.guard'
import { LoggerModule } from 'src/system/logger/logger.module'
import { AuditModule } from './modules/audit/audit.module';

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
    BiDatamartModule,
    DatabaseSchemaModule,
    MigrationModule,
    LoggerModule,
    AuditModule
  ],
  controllers: [],
  providers: [
    DebounceService,
    TemplateMigrationService,
    {
      provide: 'DELEGATE_GUARD_AUTH',
      useClass: AuthGuard
    },
    {
      provide: APP_GUARD,
      useFactory: (reflector: Reflector, delegateGuard: AuthGuard) =>
        new GodModeGuard(reflector, delegateGuard),
      inject: [Reflector, 'DELEGATE_GUARD_AUTH']
    },
    {
      provide: 'DELEGATE_GUARD_RESOURCE',
      useClass: ResourceGuard
    },
    {
      provide: APP_GUARD,
      useFactory: (reflector: Reflector, delegateGuard: ResourceGuard) =>
        new GodModeGuard(reflector, delegateGuard),
      inject: [Reflector, 'DELEGATE_GUARD_RESOURCE']
    }
  ]
})
export class AppModule implements OnModuleInit {
  constructor(
    private readonly debounceService: DebounceService,
    private readonly migrationService: TemplateMigrationService
  ) {}

  async onModuleInit(): Promise<void> {
    EmitEventDependencies.initialize(this.debounceService)
  }
}