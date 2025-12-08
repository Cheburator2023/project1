import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { IS_PUBLIC_KEY } from 'src/decorators/public.decorator'

@Injectable()
export class GodModeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject('DELEGATE_GUARD') private readonly delegateGuard: CanActivate
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

    if (typeof this.delegateGuard.canActivate === 'function') {
      return this.delegateGuard.canActivate(context) as any
    }
    return true
  }
}
