import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from './audit.service';
import {
  AUDIT_EVENT_TEST,
  DEFAULT_GENERATOR_INTERVAL_MS,
} from './audit.constants';

@Injectable()
export class AuditGeneratorService implements OnModuleInit {
  private readonly logger = new Logger(AuditGeneratorService.name);
  private readonly enabled: boolean;
  private readonly intervalMs: number;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {
    this.enabled =
      this.configService.get<string>(
        'AUDIT_GENERATOR_ENABLED',
        'false',
      ) === 'true';
    this.intervalMs = parseInt(
      this.configService.get<string>(
        'AUDIT_GENERATOR_INTERVAL_MS',
        String(DEFAULT_GENERATOR_INTERVAL_MS),
      ),
      10,
    );
  }

  onModuleInit(): void {
    if (this.enabled) {
      this.startGenerator();
    }
  }

  private startGenerator(): void {
    this.logger.log(
      `Starting audit test generator every ${this.intervalMs}ms`,
    );
    this.timer = setInterval(() => {
      this.logger.debug('Generating test audit event');
      this.auditService.sendEvent(AUDIT_EVENT_TEST, 'START', {
        test: true,
        source: 'generator',
      });
      this.auditService.sendEvent(AUDIT_EVENT_TEST, 'SUCCESS', {
        test: true,
        source: 'generator',
      });
    }, this.intervalMs);
  }
}