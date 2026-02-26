"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/auth-context";
import type { MemberRole } from "@/types";

/**
 * Client-side role guard hook.
 * Redirects to /dashboard if the user's role is not in the allowed list.
 */
export function useRoleGuard(allowedRoles: MemberRole[]) {
  const { role, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && role && !allowedRoles.includes(role)) {
      router.replace("/dashboard");
    }
  }, [role, loading, allowedRoles, router]);

  return {
    isAllowed: role !== null && allowedRoles.includes(role),
    loading,
  };
}
