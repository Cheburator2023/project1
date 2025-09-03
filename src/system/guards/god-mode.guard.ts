import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'

@Injectable()
export class GodModeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject('DELEGATE_GUARD') private readonly delegateGuard: CanActivate
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.NO_ROLES === 'true') {
      return true
    }
    if (typeof this.delegateGuard.canActivate === 'function') {
      return this.delegateGuard.canActivate(context) as any
    }
    return true
  }
}
