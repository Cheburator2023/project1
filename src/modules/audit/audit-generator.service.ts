import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { AuditService } from './audit.service';
import {
  AUDIT_EVENT_SUMD_AUTH,
  AUDIT_EVENT_SUMD_MRMSCREATEMODEL,
  AUDIT_EVENT_SUMD_MRMSREMOVEMODEL,
  AUDIT_EVENT_SUMD_MRMSUPLOADREPORT,
  DEFAULT_GENERATOR_INTERVAL_MS,
} from './audit.constants';

const ALL_EVENT_CODES = [
  AUDIT_EVENT_SUMD_AUTH,
  AUDIT_EVENT_SUMD_MRMSCREATEMODEL,
  AUDIT_EVENT_SUMD_MRMSREMOVEMODEL,
  AUDIT_EVENT_SUMD_MRMSUPLOADREPORT,
];

@Injectable()
export class AuditGeneratorService implements OnModuleInit {
  private readonly logger = new Logger(AuditGeneratorService.name);
  private readonly enabled: boolean;
  private readonly intervalMs: number;
  private readonly eventCodes: string[];
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
    const codesStr = this.configService.get<string>('AUDIT_GENERATOR_EVENT_CODES', '');
    if (codesStr) {
      this.eventCodes = codesStr.split(',').map(c => c.trim()).filter(c => c);
    } else {
      this.eventCodes = [...ALL_EVENT_CODES];
    }
  }

  onModuleInit(): void {
    if (this.enabled) {
      this.startGenerator();
    }
  }

  private startGenerator(): void {
    this.logger.log(
      `Starting audit test generator every ${this.intervalMs}ms for codes: ${this.eventCodes.join(', ')}`,
    );
    this.timer = setInterval(() => {
      const correlationId = uuidv4();
      const testInitiator = { sub: 'test_generator', channel: 'test' };
      for (const eventCode of this.eventCodes) {
        this.auditService.sendEvent(eventCode, 'START', correlationId, testInitiator, {
          generated: true,
          timestamp: new Date().toISOString(),
        });
        this.auditService.sendEvent(eventCode, 'SUCCESS', correlationId, testInitiator, {
          generated: true,
          success: true,
        });
      }
    }, this.intervalMs);
  }
}