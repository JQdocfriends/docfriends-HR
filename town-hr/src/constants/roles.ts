import type { MemberRole } from "@/types";

export const ROLE_LABELS: Record<MemberRole, string> = {
  admin: "관리자",
  manager: "매니저",
  employee: "일반 직원",
};

export const ROLE_HIERARCHY: MemberRole[] = [
  "admin",
  "manager",
  "employee",
];

/**
 * Check if roleA is equal or higher than roleB in the hierarchy
 */
export function isRoleAtLeast(role: MemberRole, requiredRole: MemberRole): boolean {
  return ROLE_HIERARCHY.indexOf(role) <= ROLE_HIERARCHY.indexOf(requiredRole);
}
