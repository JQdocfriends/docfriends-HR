import type { MemberRole } from "@/types";

/**
 * RBAC Permission matrix
 * Defines which roles can access which features
 */

type Permission =
  | "members:read"
  | "members:write"
  | "members:invite"
  | "members:delete"
  | "departments:read"
  | "departments:write"
  | "attendance:read_own"
  | "attendance:read_team"
  | "attendance:read_all"
  | "attendance:write_own"
  | "attendance:modify"
  | "attendance:reports"
  | "leave:read_own"
  | "leave:read_team"
  | "leave:read_all"
  | "leave:apply"
  | "leave:approve"
  | "leave:policy"
  | "contracts:read_own"
  | "contracts:read_all"
  | "contracts:templates"
  | "contracts:send"
  | "contracts:sign"
  | "contracts:seals"
  | "workflows:read_own"
  | "workflows:read_all"
  | "workflows:submit"
  | "workflows:approve"
  | "workflows:forms"
  | "workflows:policies"
  | "settings:company"
  | "settings:work_policy"
  | "settings:leave_policy"
  | "settings:roles"
  | "notifications:read"
  | "audit:read";

const ROLE_PERMISSIONS: Record<MemberRole, Permission[]> = {
  admin: [
    "members:read", "members:write", "members:invite", "members:delete",
    "departments:read", "departments:write",
    "attendance:read_own", "attendance:read_team", "attendance:read_all",
    "attendance:write_own", "attendance:modify", "attendance:reports",
    "leave:read_own", "leave:read_team", "leave:read_all",
    "leave:apply", "leave:approve", "leave:policy",
    "contracts:read_own", "contracts:read_all",
    "contracts:templates", "contracts:send", "contracts:sign", "contracts:seals",
    "workflows:read_own", "workflows:read_all",
    "workflows:submit", "workflows:approve", "workflows:forms", "workflows:policies",
    "settings:company", "settings:work_policy", "settings:leave_policy", "settings:roles",
    "notifications:read", "audit:read",
  ],
  manager: [
    "members:read", "members:write", "members:invite",
    "departments:read", "departments:write",
    "attendance:read_own", "attendance:read_team", "attendance:read_all",
    "attendance:write_own", "attendance:modify", "attendance:reports",
    "leave:read_own", "leave:read_team", "leave:read_all",
    "leave:apply", "leave:approve", "leave:policy",
    "contracts:read_own", "contracts:read_all",
    "contracts:templates", "contracts:send", "contracts:sign", "contracts:seals",
    "workflows:read_own", "workflows:read_all",
    "workflows:submit", "workflows:approve",
    "settings:work_policy", "settings:leave_policy",
    "notifications:read",
  ],
  employee: [
    "members:read",
    "departments:read",
    "attendance:read_own",
    "attendance:write_own",
    "leave:read_own",
    "leave:apply",
    "contracts:read_own",
    "contracts:sign",
    "workflows:read_own",
    "workflows:submit",
    "notifications:read",
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: MemberRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has ANY of the given permissions
 */
export function hasAnyPermission(
  role: MemberRole,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Check if a role has ALL of the given permissions
 */
export function hasAllPermissions(
  role: MemberRole,
  permissions: Permission[]
): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: MemberRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export type { Permission };
