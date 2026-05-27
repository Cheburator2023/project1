import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AuditService } from './audit.service';
import { AuditGeneratorService } from './audit-generator.service';

@Global()
@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: () => ({ timeout: 5000 }),
    }),
    ConfigModule,
  ],
  providers: [AuditService, AuditGeneratorService],
  exports: [AuditService],
})
export class AuditModule {}