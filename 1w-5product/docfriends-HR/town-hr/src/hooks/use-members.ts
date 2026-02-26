"use client";

import useSWR from "swr";
import type { Member } from "@/types";
import {
  fetchMembers,
  fetchMember,
  createMember,
  updateMember,
  deleteMember,
  deactivateMember,
  type CreateMemberData,
} from "@/lib/repositories/member-repository";

export type { CreateMemberData };
export { createMember, updateMember, deleteMember, deactivateMember };

export function useMembers() {
  const { data, error, isLoading, mutate } = useSWR("members", fetchMembers);

  return { members: data ?? [], loading: isLoading, error, mutate };
}

export function useMember(id: string) {
  const { data, error, isLoading } = useSWR(
    id ? `members/${id}` : null,
    () => fetchMember(id)
  );

  return { member: data ?? null, loading: isLoading, error };
}
