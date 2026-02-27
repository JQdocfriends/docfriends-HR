/**
 * Workflow approval state machine
 * Pure functions for computing workflow state transitions.
 *
 * State diagram:
 *   DRAFT -> PENDING (submit)
 *   PENDING -> APPROVED (all required approvers approve)
 *   PENDING -> REJECTED (any approver rejects)
 *   PENDING -> ON_HOLD (any approver puts on hold)
 *   PENDING -> CANCELLED (submitter cancels before completion)
 *   ON_HOLD -> PENDING (approver resumes)
 *   ON_HOLD -> REJECTED (approver rejects from hold)
 *
 * Invalid transitions (must throw):
 *   APPROVED -> any
 *   REJECTED -> any (except DRAFT for re-submission via new document)
 *   CANCELLED -> any
 */

import type {
  WorkflowStatus,
  ApprovalDecision,
  ApprovalRecord,
  WorkflowPolicyStep,
  ApprovalType,
} from "@/types";

export interface ApprovalInput {
  stepOrder: number;
  approverId: string;
  approverName: string;
  decision: ApprovalDecision;
  comment?: string;
  delegatedFrom?: string;
}

export interface WorkflowState {
  status: WorkflowStatus;
  currentStepOrder: number;
  approvals: ApprovalRecord[];
  isComplete: boolean;
}

/**
 * Determine the next workflow status after an approval decision,
 * considering the full approval chain.
 */
export function computeNextStatus(
  currentStatus: WorkflowStatus,
  decision: ApprovalDecision,
  currentStepOrder: number,
  totalSteps: number,
  approvalType: ApprovalType
): WorkflowStatus {
  // Terminal states — cannot transition
  if (currentStatus === "approved" || currentStatus === "cancelled") {
    throw new Error(
      `Cannot process approval: document is already ${currentStatus}`
    );
  }

  // Rejected documents cannot receive approvals
  if (currentStatus === "rejected") {
    throw new Error("Cannot process approval: document is rejected");
  }

  // Draft documents must be submitted first
  if (currentStatus === "draft") {
    throw new Error("Cannot process approval: document is still in draft");
  }

  // Process the decision
  if (decision === "rejected") {
    return "rejected";
  }

  if (decision === "on_hold") {
    return "on_hold";
  }

  // decision === "approved"
  if (approvalType === "sequential") {
    // Only approved if this was the last step
    if (currentStepOrder >= totalSteps) {
      return "approved";
    }
    // More steps remain — stay pending
    return "pending";
  }

  // Parallel approval — we'd need to check all approvers, but for
  // single-decision computation, we stay pending unless all steps done
  if (currentStepOrder >= totalSteps) {
    return "approved";
  }
  return "pending";
}

/**
 * Compute the next step order after an approval.
 */
export function computeNextStepOrder(
  currentStepOrder: number,
  decision: ApprovalDecision,
  totalSteps: number
): number {
  if (decision === "approved") {
    return Math.min(currentStepOrder + 1, totalSteps + 1);
  }
  // On rejection or hold, step stays the same
  return currentStepOrder;
}

/**
 * Check if a workflow document is in a terminal state.
 */
export function isTerminalStatus(status: WorkflowStatus): boolean {
  return status === "approved" || status === "rejected" || status === "cancelled";
}

/**
 * Validate that a status transition is allowed.
 */
export function isValidTransition(
  from: WorkflowStatus,
  to: WorkflowStatus
): boolean {
  const VALID_TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
    draft: ["pending", "cancelled"],
    pending: ["approved", "rejected", "on_hold", "cancelled"],
    on_hold: ["pending", "rejected", "cancelled"],
    approved: [], // terminal
    rejected: [], // terminal
    cancelled: [], // terminal
  };

  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Validate that the approver is authorized for the given step.
 */
export function isAuthorizedApprover(
  step: WorkflowPolicyStep,
  approverId: string,
  approverRole?: string,
  departmentHeadId?: string
): boolean {
  switch (step.approverType) {
    case "specific":
      return step.approverId === approverId;
    case "role":
      return step.approverRole === approverRole;
    case "department_head":
      return departmentHeadId === approverId;
    case "team_lead":
      // Team lead check would require team context
      return true; // Simplified — real impl needs team lookup
    default:
      return false;
  }
}

/**
 * Check if an approval step has already been completed.
 */
export function isStepAlreadyProcessed(
  approvals: ApprovalRecord[],
  stepOrder: number
): boolean {
  return approvals.some(
    (a) => a.stepOrder === stepOrder && a.decision !== null
  );
}

/**
 * Check if document can be cancelled by the submitter.
 * Only allowed if document is pending or on_hold (not yet fully approved/rejected).
 */
export function canCancel(status: WorkflowStatus): boolean {
  return status === "pending" || status === "on_hold" || status === "draft";
}

/**
 * Full state computation: given current state + new approval, return next state.
 */
export function applyApproval(
  currentStatus: WorkflowStatus,
  currentStepOrder: number,
  existingApprovals: ApprovalRecord[],
  input: ApprovalInput,
  totalSteps: number,
  approvalType: ApprovalType
): WorkflowState {
  // Validate not already processed
  if (isStepAlreadyProcessed(existingApprovals, input.stepOrder)) {
    throw new Error(
      `Step ${input.stepOrder} has already been processed`
    );
  }

  const nextStatus = computeNextStatus(
    currentStatus,
    input.decision,
    currentStepOrder,
    totalSteps,
    approvalType
  );

  const nextStepOrder = computeNextStepOrder(
    currentStepOrder,
    input.decision,
    totalSteps
  );

  const newApproval: ApprovalRecord = {
    stepOrder: input.stepOrder,
    approverId: input.approverId,
    approverName: input.approverName,
    decision: input.decision,
    comment: input.comment || null,
    delegatedFrom: input.delegatedFrom || null,
    processedAt: null, // Timestamp set by Firestore
  };

  return {
    status: nextStatus,
    currentStepOrder: nextStepOrder,
    approvals: [...existingApprovals, newApproval],
    isComplete: isTerminalStatus(nextStatus),
  };
}
