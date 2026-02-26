import {
  query,
  where,
  orderBy,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import {
  leaveRequestsRef,
  leaveBalancesRef,
  leavePoliciesRef,
} from "@/lib/firebase/collections";
import { fetchCollection } from "@/lib/firebase/swr";
import type { LeaveRequest, LeaveBalance, LeavePolicy } from "@/types";

export function getLeavePoliciesQuery() {
  return query(leavePoliciesRef, where("isActive", "==", true));
}

export function getLeaveBalancesQuery(memberId: string, year: number) {
  return query(
    leaveBalancesRef,
    where("memberId", "==", memberId),
    where("year", "==", year)
  );
}

export function getLeaveRequestsQuery(memberId?: string) {
  const constraints: QueryConstraint[] = [];
  if (memberId) {
    constraints.push(where("memberId", "==", memberId));
  }
  constraints.push(orderBy("createdAt", "desc"));
  return query(leaveRequestsRef, ...constraints);
}

export async function fetchLeavePolicies(): Promise<LeavePolicy[]> {
  return fetchCollection<LeavePolicy>(getLeavePoliciesQuery());
}

export async function fetchLeaveBalances(
  memberId: string,
  year: number
): Promise<LeaveBalance[]> {
  return fetchCollection<LeaveBalance>(getLeaveBalancesQuery(memberId, year));
}

export async function fetchLeaveRequests(
  memberId?: string
): Promise<LeaveRequest[]> {
  return fetchCollection<LeaveRequest>(getLeaveRequestsQuery(memberId));
}

export interface CreateLeaveRequestData {
  memberId: string;
  policyId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
}

export async function createLeaveRequest(
  data: CreateLeaveRequestData
): Promise<string> {
  const docRef = await addDoc(leaveRequestsRef, {
    ...data,
    attachmentUrls: [],
    status: "pending",
    approverId: null,
    approverComment: null,
    processedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function approveLeaveRequest(
  id: string,
  approverId: string,
  comment?: string
): Promise<void> {
  await updateDoc(doc(db, "leave_requests", id), {
    status: "approved",
    approverId,
    approverComment: comment || null,
    processedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function rejectLeaveRequest(
  id: string,
  approverId: string,
  comment?: string
): Promise<void> {
  await updateDoc(doc(db, "leave_requests", id), {
    status: "rejected",
    approverId,
    approverComment: comment || null,
    processedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
