import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  DEFAULT_SIDECAR_URL,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_RETRY_INTERVAL_MS,
} from './audit.constants';

interface PendingAuditEvent {
  id: string;
  eventCode: string;
  eventClass: string;
  timestamp: string;
  additionalFields: Record<string, unknown>;
}

@Injectable()
export class AuditService implements OnModuleInit {
  private readonly logger = new Logger(AuditService.name);
  private readonly queue: PendingAuditEvent[] = [];
  private isProcessing = false;
  private retryTimer: NodeJS.Timeout | null = null;

  private readonly enabled: boolean;
  private readonly sidecarUrl: string;
  private readonly timeoutMs: number;
  private readonly retryIntervalMs: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.enabled =
      this.configService.get<string>('AUDIT_ENABLED', 'true') === 'true';
    this.sidecarUrl = this.configService.get<string>(
      'AUDIT_SIDECAR_URL',
      DEFAULT_SIDECAR_URL,
    );
    this.timeoutMs = parseInt(
      this.configService.get<string>(
        'AUDIT_SIDECAR_TIMEOUT',
        String(DEFAULT_TIMEOUT_MS),
      ),
      10,
    );
    this.retryIntervalMs = parseInt(
      this.configService.get<string>(
        'AUDIT_RETRY_INTERVAL_MS',
        String(DEFAULT_RETRY_INTERVAL_MS),
      ),
      10,
    );
  }

  onModuleInit(): void {
    if (this.enabled) {
      this.startRetryTimer();
      this.logger.log(
        `Audit service enabled – sidecar: ${this.sidecarUrl}, timeout: ${this.timeoutMs}ms, retry: ${this.retryIntervalMs}ms`,
      );
    } else {
      this.logger.log('Audit service disabled');
    }
  }

  /**
   * Public method to enqueue an audit event.
   */
  sendEvent(
    eventCode: string,
    eventClass: string,
    additionalFields?: Record<string, unknown>,
  ): void {
    if (!this.enabled) {
      this.logger.debug('Audit is disabled – event discarded');
      return;
    }

    const event: PendingAuditEvent = {
      id: uuidv4(),
      eventCode,
      eventClass,
      timestamp: new Date().toISOString(),
      additionalFields: additionalFields ?? {},
    };

    this.queue.push(event);
    this.logger.debug(
      `Enqueued audit event: ${event.eventCode} (${event.id})`,
    );
    // Attempt immediate flush
    this.flush();
  }

  /**
   * Tries to send all queued events.
   */
  private async flush(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const eventsToSend = [...this.queue];
    this.queue.length = 0; // Clear queue – failed events will be re-added

    for (const event of eventsToSend) {
      try {
        await this.sendSingleEvent(event);
      } catch (error) {
        this.logger.warn(
          `Failed to send audit event ${event.id}: ${(error as Error).message}`,
        );
        // Return to queue for later retry
        this.queue.push(event);
      }
    }

    this.isProcessing = false;
  }

  private async sendSingleEvent(event: PendingAuditEvent): Promise<void> {
    const url = `${this.sidecarUrl}/api/v1/audit`;
    const body = {
      eventCode: event.eventCode,
      eventClass: event.eventClass,
      timestamp: event.timestamp,
      additionalFields: event.additionalFields,
    };

    const request$ = this.httpService
      .post(url, body, {
        headers: { 'Content-Type': 'application/json' },
        timeout: this.timeoutMs,
      })
      .pipe(
        timeout(this.timeoutMs + 500),
        catchError((err: AxiosError) => {
          const message = err.response
            ? `HTTP ${err.response.status}: ${err.response.statusText}`
            : err.message;
          throw new Error(message);
        }),
      );

    await firstValueFrom(request$);
    this.logger.debug(
      `Audit event sent: ${event.eventCode} (${event.id})`,
    );
  }

  private startRetryTimer(): void {
    this.retryTimer = setInterval(() => {
      this.flush();
    }, this.retryIntervalMs);
  }
}