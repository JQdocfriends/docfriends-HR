"use client";

import useSWR from "swr";
import type { LeaveRequest, LeaveBalance, LeavePolicy } from "@/types";
import {
  fetchLeavePolicies,
  fetchLeaveBalances,
  fetchLeaveRequests,
  createLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
  type CreateLeaveRequestData,
} from "@/lib/repositories/leave-repository";

export type { CreateLeaveRequestData };
export { createLeaveRequest, approveLeaveRequest, rejectLeaveRequest };

export function useLeavePolicies() {
  const { data, isLoading, mutate } = useSWR("leave-policies", fetchLeavePolicies);

  return { policies: data ?? [], loading: isLoading, mutate };
}

export function useLeaveBalances(memberId: string) {
  const currentYear = new Date().getFullYear();
  const { data, isLoading, mutate } = useSWR(
    memberId ? `leave-balances/${memberId}/${currentYear}` : null,
    () => fetchLeaveBalances(memberId, currentYear)
  );

  return { balances: data ?? [], loading: isLoading, mutate };
}

export function useLeaveRequests(memberId?: string) {
  const { data, isLoading, mutate } = useSWR(
    memberId ? `leave-requests/${memberId}` : "leave-requests",
    () => fetchLeaveRequests(memberId)
  );

  return { requests: data ?? [], loading: isLoading, mutate };
}
