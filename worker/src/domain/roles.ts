/**
 * Role-based access control.
 *
 * Roles are hierarchical for *platform* administration but ownership is always
 * checked separately — being an admin does not make you the owner of someone
 * else's property, and being a landlord does not let you read a tenant's
 * messages with another landlord.
 */

export type UserRole = 'tenant' | 'landlord' | 'agent' | 'manager' | 'admin';

export const ROLES: UserRole[] = ['tenant', 'landlord', 'agent', 'manager', 'admin'];

/** Roles a user may pick for themselves at registration. */
export const SELF_SERVICE_ROLES: UserRole[] = ['tenant', 'landlord', 'agent'];

const RANK: Record<UserRole, number> = {
  tenant: 0,
  landlord: 1,
  agent: 2,
  manager: 3,
  admin: 4,
};

export function isRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (ROLES as string[]).includes(value);
}

export function hasRoleAtLeast(role: UserRole, minimum: UserRole): boolean {
  return RANK[role] >= RANK[minimum];
}

export function canManagePlatform(role: UserRole): boolean {
  return hasRoleAtLeast(role, 'admin');
}

export function canListProperties(role: UserRole): boolean {
  return role === 'landlord' || role === 'agent' || hasRoleAtLeast(role, 'manager');
}
