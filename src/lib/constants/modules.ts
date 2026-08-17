export const MODULE_KEYS = [
  "dashboard",
  "prospects",
  "partners",
  "customers",
  "access",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export type Permissions = Record<ModuleKey, boolean>;

export function noPermissions(): Permissions {
  return {
    dashboard: false,
    prospects: false,
    partners: false,
    customers: false,
    access: false,
  };
}

export function allPermissions(): Permissions {
  return {
    dashboard: true,
    prospects: true,
    partners: true,
    customers: true,
    access: true,
  };
}

// Operational definition of "Admin" used throughout auth/authz (MFA enforcement, last-admin
// invariant): a user with the `access` permission. `role` remains a free-label display string.
export function isAdmin(user: { access: boolean }): boolean {
  return user.access;
}
