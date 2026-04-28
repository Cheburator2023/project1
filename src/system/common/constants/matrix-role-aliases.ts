/**
 * Matrix: `artefact_source_roles` + `roles.role_name` (business_customer, ds_lead, …).
 *
 * Сопоставляем с **Keycloak Groups** — claim `groups` в JWT, после нормализации в `User` декораторе.
 * Это не то же самое, что `realm_access.roles` / top-level claim `roles` в токене (model_read,
 * add_model_sumrm, …) — те роли к матрице полей не относятся.
 */
export function userGroupsMatchMatrixRoles(
  userGroups: string[],
  allowedRoleNames: string[]
): boolean {
  if (!allowedRoleNames.length) {
    return false
  }
  const allowed = new Set(allowedRoleNames)
  return userGroups.some((g) => allowed.has(g))
}
