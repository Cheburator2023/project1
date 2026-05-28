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
   * Человекочитаемое имя: claim `name` или «given_name family_name» при отсутствии `name`.
   * Поле `name` по-прежнему совпадает с `preferred_username` (логин) — не меняйте это для совместимости.
   */
  display_name?: string
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
          display_name: 'Бога Разработчика Режим',
          groups: ['admin'],
          roles: ['admin']
        }
      }
      throw new UnauthorizedException('Пользователь не найден в запросе')
    }

    const u = request.user as Record<string, unknown>
    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

    const familyFromSnake =
      typeof request.user.family_name === 'string'
        ? request.user.family_name.trim()
        : ''
    const family_name =
      familyFromSnake ||
      str(u.family_name ?? u.familyName ?? u.last_name ?? u.lastName)

    const givenFromSnake =
      typeof request.user.given_name === 'string'
        ? request.user.given_name.trim()
        : ''
    const given_name =
      givenFromSnake ||
      str(u.given_name ?? u.givenName ?? u.first_name ?? u.firstName)

    const claimName = str(u.name)
    const display_name =
      claimName ||
      [given_name, family_name].filter(Boolean).join(' ') ||
      undefined

    return {
      name: request.user.preferred_username,
      username: request.user.preferred_username,
      email: request.user.email,
      keycloakGroups: request.user.groups || [],
      family_name,
      given_name,
      preferred_username: request.user.preferred_username,
      ...(display_name !== undefined ? { display_name } : {}),
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
