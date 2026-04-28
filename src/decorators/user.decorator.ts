import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException
} from '@nestjs/common'

export interface UserType {
  name: string
  username: string
  email: string
  /** Сырой claim `groups` из JWT (Keycloak Groups). */
  keycloakGroups: string[]
  family_name: string
  given_name: string
  preferred_username: string
  /**
   * Keycloak Groups, разбитые по `/` и дедуплицированные — те же имена, что `roles.role_name`
   * для матрицы `artefact_source_roles` (business_customer, ds_lead, …).
   */
  groups: string[]
  /**
   * Keycloak realm/client roles из claim `roles` / realm_access (model_read, add_model_sumrm, …).
   * На матрицу редактирования артефактов не влияют — для неё используйте `groups`.
   */
  roles: string[]
}

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserType => {
    const request = ctx.switchToHttp().getRequest()

    if (!request.user) {
      if (process.env.NO_ROLES === 'true') {
        return {
          name: 'Суперпользователь',
          username: 'god_mode_user',
          email: 'god@dev.local',
          keycloakGroups: ['admin'],
          family_name: 'Режим',
          given_name: 'Бога Разработчика',
          preferred_username: 'god_mode_user',
          groups: ['admin'],
          roles: ['admin']
        }
      }
      throw new UnauthorizedException('Пользователь не найден в запросе')
    }

    return {
      name: request.user.preferred_username,
      username: request.user.preferred_username,
      email: request.user.email,
      keycloakGroups: request.user.groups || [],
      family_name: request.user.family_name || '',
      given_name: request.user.given_name || '',
      preferred_username: request.user.preferred_username,
      groups: (request.user.groups || [])
        .reduce((prev, group) => {
          const newGroup = group.split('/')
          return [...prev, ...newGroup]
        }, [])
        .filter(Boolean)
        .filter((d, i, arr) => arr.indexOf(d) === i),
      roles: request.user.roles || []
    }
  }
)
