import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from 'nest-keycloak-connect'
import { v4 as uuidv4 } from 'uuid'
import { AuditService } from '../../modules/audit/audit.service'
import { AUDIT_EVENT_SUMD_AUTH } from '../../modules/audit/audit.constants'
import { IS_PUBLIC_KEY } from 'src/decorators/public.decorator'

@Injectable()
export class GodModeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject('DELEGATE_GUARD') private readonly delegateGuard: CanActivate,
    private readonly auditService?: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.get<boolean>(
      IS_PUBLIC_KEY,
      context.getHandler()
    )

    if (isPublic) {
      return true
    }

    if (process.env.NO_ROLES === 'true') {
      return true
    }

    const isAuthGuard = this.delegateGuard instanceof AuthGuard;

    let correlationId: string | undefined;
    if (isAuthGuard && this.auditService) {
      correlationId = uuidv4();
      const request = context.switchToHttp().getRequest();
      // START – инициатор неизвестен, sub = ""
      this.auditService.sendEvent(
        AUDIT_EVENT_SUMD_AUTH,
        'START',
        correlationId,
        { sub: '', channel: 'internal', realm: '' },
        { path: request.url, method: request.method },
      );
    }

    try {
      const result = await (this.delegateGuard.canActivate(
        context,
      ) as Promise<boolean>)

      if (isAuthGuard && this.auditService && correlationId) {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const initiatorSub = user?.preferred_username ?? user?.sub ?? '';
        this.auditService.sendEvent(
          AUDIT_EVENT_SUMD_AUTH,
          result ? 'SUCCESS' : 'FAILURE',
          correlationId,
          {
            sub: initiatorSub,
            channel: 'internal',
            realm: user?.realm ?? '',
          },
          result
            ? { success: true }
            : { error: 'Authentication failed (guard returned false)' },
        );
      }
      return result;
    } catch (error) {
      if (isAuthGuard && this.auditService && correlationId) {
        this.auditService.sendEvent(
          AUDIT_EVENT_SUMD_AUTH,
          'FAILURE',
          correlationId,
          { sub: '', channel: 'internal', realm: '' },
          { errorMessage: (error as Error).message },
        );
      }
      throw error
    }
  }
}
