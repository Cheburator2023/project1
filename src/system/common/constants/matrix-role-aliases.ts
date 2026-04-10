/**
 * Matrix rows in artefact_source_roles use production role_name only (business_customer, ds_lead, …).
 * Keycloak groups for test users use the same names; compare groups to allowed roles directly.
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
