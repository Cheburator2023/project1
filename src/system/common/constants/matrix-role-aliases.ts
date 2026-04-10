/**
 * Keycloak test groups use test_* names; artefact_source_roles stores production role_name.
 * Matrix checks must treat them as the same role.
 */
const TEST_TO_CANONICAL_ROLE: Record<string, string> = {
  test_business_customer: 'business_customer',
  test_ds_lead: 'ds_lead',
  test_validator_lead: 'validator_lead',
  test_validator: 'validator'
}

export function canonicalRoleNameForMatrix(role: string): string {
  return TEST_TO_CANONICAL_ROLE[role] ?? role
}

/** True if any user group matches any allowed role name (test ↔ prod aliases). */
export function userGroupsMatchMatrixRoles(
  userGroups: string[],
  allowedRoleNames: string[]
): boolean {
  if (!allowedRoleNames.length) {
    return false
  }
  const allowedCanon = new Set(
    allowedRoleNames.map((r) => canonicalRoleNameForMatrix(r))
  )
  return userGroups.some((g) => allowedCanon.has(canonicalRoleNameForMatrix(g)))
}
