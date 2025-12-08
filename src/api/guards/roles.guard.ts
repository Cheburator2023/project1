import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { IS_PUBLIC_KEY } from 'src/decorators/public.decorator'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
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

    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass()
    ])

    // Если роли не заданы, пропускаем
    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user) {
      throw new ForbiddenException('Доступ запрещен: отсутствие пользователя')
    }

    const roles: string[] = Array.isArray(user.roles) ? user.roles : []
    const groupsRaw: string[] = Array.isArray(user.groups) ? user.groups : []

    // Нормализуем группы: разбиваем по '/' как в User декораторе
    const groups = groupsRaw
      .reduce((prev: string[], group: string) => {
        const parts = group.split('/')
        return [...prev, ...parts]
      }, [])
      .filter(Boolean)

    const hasRole = requiredRoles.some(
      (role) => roles.includes(role) || groups.includes(role)
    )

    if (!hasRole) {
      throw new ForbiddenException('Доступ запрещен: недостаточно прав')
    }

    return true
  }
}