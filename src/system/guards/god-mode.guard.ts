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

    if (this.delegateGuard && typeof this.delegateGuard.canActivate === 'function') {
      try {
        return await (this.delegateGuard.canActivate(context) as Promise<boolean>)
      } catch (error) {
        console.error('Error in delegate guard:', error.message)

        if (error.message.includes('Cannot read property') || error.message.includes('length')) {
          return false
        }

        throw error
      }
    }

    return true
  }
}