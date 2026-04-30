import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditService } from './audit.service';
import { AuditInterceptor } from './audit.interceptor';
import { AuditGeneratorService } from './audit-generator.service';

@Global()
@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: () => ({
        timeout: 5000, // fallback, overridden per request
      }),
    }),
    ConfigModule,
  ],
  providers: [
    AuditService,
    AuditGeneratorService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [AuditService],
})
export class AuditModule {}