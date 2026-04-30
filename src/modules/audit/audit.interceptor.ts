import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { AUDIT_EVENT_MRMS_AUTH } from './audit.constants';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Skip unauthenticated requests
    if (!user) {
      return next.handle();
    }

    const startTime = Date.now();
    const userIdentifier = user.preferred_username ?? user.sub ?? 'unknown';

    // Emit START event
    this.auditService.sendEvent(AUDIT_EVENT_MRMS_AUTH, 'START', {
      initiator_sub: userIdentifier,
      initiator_realm: user.realm ?? '',
      initiator_channel: user.channel ?? '',
    });

    return next.handle().pipe(
      tap(() => {
        this.auditService.sendEvent(AUDIT_EVENT_MRMS_AUTH, 'SUCCESS', {
          initiator_sub: userIdentifier,
          duration_ms: Date.now() - startTime,
        });
      }),
      catchError((error) => {
        this.auditService.sendEvent(AUDIT_EVENT_MRMS_AUTH, 'FAILURE', {
          initiator_sub: userIdentifier,
          error_message: (error as Error).message ?? 'Unknown error',
        });
        return throwError(() => error);
      }),
    );
  }
}