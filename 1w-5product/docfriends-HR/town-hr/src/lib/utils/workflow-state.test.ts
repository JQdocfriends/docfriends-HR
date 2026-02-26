import { describe, it, expect } from "vitest";
import {
  computeNextStatus,
  computeNextStepOrder,
  isTerminalStatus,
  isValidTransition,
  isAuthorizedApprover,
  isStepAlreadyProcessed,
  canCancel,
  applyApproval,
} from "./workflow-state";
import type {
  WorkflowStatus,
  ApprovalRecord,
  WorkflowPolicyStep,
} from "@/types";

// ---- Helper factories ----

function makeApprovalRecord(
  overrides?: Partial<ApprovalRecord>
): ApprovalRecord {
  return {
    stepOrder: 1,
    approverId: "approver-1",
    approverName: "Kim Manager",
    decision: "approved",
    comment: null,
    delegatedFrom: null,
    processedAt: null,
    ...overrides,
  };
}

function makePolicyStep(
  overrides?: Partial<WorkflowPolicyStep>
): WorkflowPolicyStep {
  return {
    order: 1,
    approverType: "specific",
    approverId: "approver-1",
    approverRole: null,
    isRequired: true,
    deadlineHours: 24,
    ...overrides,
  };
}

// ============================================================
// computeNextStatus
// ============================================================

describe("computeNextStatus", () => {
  describe("sequential approval chain", () => {
    it("stays pending after approval on non-final step", () => {
      expect(
        computeNextStatus("pending", "approved", 1, 3, "sequential")
      ).toBe("pending");
    });

    it("stays pending after approval on step 2 of 3", () => {
      expect(
        computeNextStatus("pending", "approved", 2, 3, "sequential")
      ).toBe("pending");
    });

    it("becomes approved after final step approval", () => {
      expect(
        computeNextStatus("pending", "approved", 3, 3, "sequential")
      ).toBe("approved");
    });

    it("becomes rejected on any rejection (step 1 of 3)", () => {
      expect(
        computeNextStatus("pending", "rejected", 1, 3, "sequential")
      ).toBe("rejected");
    });

    it("becomes rejected on mid-chain rejection (step 2 of 3)", () => {
      expect(
        computeNextStatus("pending", "rejected", 2, 3, "sequential")
      ).toBe("rejected");
    });

    it("becomes on_hold when approver puts on hold", () => {
      expect(
        computeNextStatus("pending", "on_hold", 1, 3, "sequential")
      ).toBe("on_hold");
    });
  });

  describe("single-step approval", () => {
    it("becomes approved after single approver approves", () => {
      expect(
        computeNextStatus("pending", "approved", 1, 1, "sequential")
      ).toBe("approved");
    });

    it("becomes rejected after single approver rejects", () => {
      expect(
        computeNextStatus("pending", "rejected", 1, 1, "sequential")
      ).toBe("rejected");
    });
  });

  describe("parallel approval chain", () => {
    it("stays pending when not all parallel approvers done", () => {
      expect(
        computeNextStatus("pending", "approved", 1, 3, "parallel")
      ).toBe("pending");
    });

    it("becomes approved when last parallel approver approves", () => {
      expect(
        computeNextStatus("pending", "approved", 3, 3, "parallel")
      ).toBe("approved");
    });

    it("becomes rejected on any rejection in parallel", () => {
      expect(
        computeNextStatus("pending", "rejected", 1, 3, "parallel")
      ).toBe("rejected");
    });
  });

  describe("from on_hold status", () => {
    it("returns to pending on approval (non-final step)", () => {
      expect(
        computeNextStatus("on_hold", "approved", 1, 3, "sequential")
      ).toBe("pending");
    });

    it("becomes approved on approval (final step)", () => {
      expect(
        computeNextStatus("on_hold", "approved", 3, 3, "sequential")
      ).toBe("approved");
    });

    it("becomes rejected on rejection from on_hold", () => {
      expect(
        computeNextStatus("on_hold", "rejected", 1, 3, "sequential")
      ).toBe("rejected");
    });
  });

  describe("invalid starting states (must throw)", () => {
    it("throws when document is already approved", () => {
      expect(() =>
        computeNextStatus("approved", "approved", 1, 1, "sequential")
      ).toThrow("already approved");
    });

    it("throws when document is cancelled", () => {
      expect(() =>
        computeNextStatus("cancelled", "approved", 1, 1, "sequential")
      ).toThrow("already cancelled");
    });

    it("throws when document is rejected", () => {
      expect(() =>
        computeNextStatus("rejected", "approved", 1, 1, "sequential")
      ).toThrow("rejected");
    });

    it("throws when document is still in draft", () => {
      expect(() =>
        computeNextStatus("draft", "approved", 1, 1, "sequential")
      ).toThrow("draft");
    });
  });
});

// ============================================================
// computeNextStepOrder
// ============================================================

describe("computeNextStepOrder", () => {
  it("increments step on approval", () => {
    expect(computeNextStepOrder(1, "approved", 3)).toBe(2);
  });

  it("increments to final+1 on last step approval", () => {
    expect(computeNextStepOrder(3, "approved", 3)).toBe(4);
  });

  it("stays same on rejection", () => {
    expect(computeNextStepOrder(2, "rejected", 3)).toBe(2);
  });

  it("stays same on hold", () => {
    expect(computeNextStepOrder(2, "on_hold", 3)).toBe(2);
  });

  it("does not exceed totalSteps+1", () => {
    expect(computeNextStepOrder(5, "approved", 3)).toBe(4);
  });
});

// ============================================================
// isTerminalStatus
// ============================================================

describe("isTerminalStatus", () => {
  it.each([
    { status: "approved" as WorkflowStatus, expected: true },
    { status: "rejected" as WorkflowStatus, expected: true },
    { status: "cancelled" as WorkflowStatus, expected: true },
    { status: "draft" as WorkflowStatus, expected: false },
    { status: "pending" as WorkflowStatus, expected: false },
    { status: "on_hold" as WorkflowStatus, expected: false },
  ])("$status is terminal=$expected", ({ status, expected }) => {
    expect(isTerminalStatus(status)).toBe(expected);
  });
});

// ============================================================
// isValidTransition
// ============================================================

describe("isValidTransition", () => {
  describe("from draft", () => {
    it("can transition to pending", () => {
      expect(isValidTransition("draft", "pending")).toBe(true);
    });

    it("can transition to cancelled", () => {
      expect(isValidTransition("draft", "cancelled")).toBe(true);
    });

    it("cannot transition to approved", () => {
      expect(isValidTransition("draft", "approved")).toBe(false);
    });

    it("cannot transition to rejected", () => {
      expect(isValidTransition("draft", "rejected")).toBe(false);
    });
  });

  describe("from pending", () => {
    it("can transition to approved", () => {
      expect(isValidTransition("pending", "approved")).toBe(true);
    });

    it("can transition to rejected", () => {
      expect(isValidTransition("pending", "rejected")).toBe(true);
    });

    it("can transition to on_hold", () => {
      expect(isValidTransition("pending", "on_hold")).toBe(true);
    });

    it("can transition to cancelled", () => {
      expect(isValidTransition("pending", "cancelled")).toBe(true);
    });

    it("cannot transition to draft", () => {
      expect(isValidTransition("pending", "draft")).toBe(false);
    });
  });

  describe("from on_hold", () => {
    it("can transition to pending (resume)", () => {
      expect(isValidTransition("on_hold", "pending")).toBe(true);
    });

    it("can transition to rejected", () => {
      expect(isValidTransition("on_hold", "rejected")).toBe(true);
    });

    it("can transition to cancelled", () => {
      expect(isValidTransition("on_hold", "cancelled")).toBe(true);
    });

    it("cannot transition directly to approved", () => {
      expect(isValidTransition("on_hold", "approved")).toBe(false);
    });
  });

  describe("terminal states (no transitions out)", () => {
    it("approved cannot transition to anything", () => {
      expect(isValidTransition("approved", "pending")).toBe(false);
      expect(isValidTransition("approved", "rejected")).toBe(false);
      expect(isValidTransition("approved", "draft")).toBe(false);
    });

    it("rejected cannot transition to anything", () => {
      expect(isValidTransition("rejected", "pending")).toBe(false);
      expect(isValidTransition("rejected", "approved")).toBe(false);
      expect(isValidTransition("rejected", "draft")).toBe(false);
    });

    it("cancelled cannot transition to anything", () => {
      expect(isValidTransition("cancelled", "pending")).toBe(false);
      expect(isValidTransition("cancelled", "approved")).toBe(false);
    });
  });
});

// ============================================================
// isAuthorizedApprover
// ============================================================

describe("isAuthorizedApprover", () => {
  it("matches specific approver by ID", () => {
    const step = makePolicyStep({
      approverType: "specific",
      approverId: "user-123",
    });
    expect(isAuthorizedApprover(step, "user-123")).toBe(true);
    expect(isAuthorizedApprover(step, "user-456")).toBe(false);
  });

  it("matches role-based approver", () => {
    const step = makePolicyStep({
      approverType: "role",
      approverRole: "manager",
    });
    expect(isAuthorizedApprover(step, "any-user", "manager")).toBe(true);
    expect(isAuthorizedApprover(step, "any-user", "employee")).toBe(false);
  });

  it("matches department head", () => {
    const step = makePolicyStep({
      approverType: "department_head",
    });
    expect(
      isAuthorizedApprover(step, "head-user", undefined, "head-user")
    ).toBe(true);
    expect(
      isAuthorizedApprover(step, "other-user", undefined, "head-user")
    ).toBe(false);
  });
});

// ============================================================
// isStepAlreadyProcessed
// ============================================================

describe("isStepAlreadyProcessed", () => {
  it("returns true when step has a decision", () => {
    const approvals = [makeApprovalRecord({ stepOrder: 1, decision: "approved" })];
    expect(isStepAlreadyProcessed(approvals, 1)).toBe(true);
  });

  it("returns false when step has no decision (null)", () => {
    const approvals = [makeApprovalRecord({ stepOrder: 1, decision: null })];
    expect(isStepAlreadyProcessed(approvals, 1)).toBe(false);
  });

  it("returns false when step has no record at all", () => {
    const approvals = [makeApprovalRecord({ stepOrder: 2, decision: "approved" })];
    expect(isStepAlreadyProcessed(approvals, 1)).toBe(false);
  });

  it("returns false for empty approvals", () => {
    expect(isStepAlreadyProcessed([], 1)).toBe(false);
  });

  it("checks correct step among multiple", () => {
    const approvals = [
      makeApprovalRecord({ stepOrder: 1, decision: "approved" }),
      makeApprovalRecord({ stepOrder: 2, decision: null }),
    ];
    expect(isStepAlreadyProcessed(approvals, 1)).toBe(true);
    expect(isStepAlreadyProcessed(approvals, 2)).toBe(false);
    expect(isStepAlreadyProcessed(approvals, 3)).toBe(false);
  });
});

// ============================================================
// canCancel
// ============================================================

describe("canCancel", () => {
  it.each([
    { status: "draft" as WorkflowStatus, expected: true },
    { status: "pending" as WorkflowStatus, expected: true },
    { status: "on_hold" as WorkflowStatus, expected: true },
    { status: "approved" as WorkflowStatus, expected: false },
    { status: "rejected" as WorkflowStatus, expected: false },
    { status: "cancelled" as WorkflowStatus, expected: false },
  ])("canCancel($status) = $expected", ({ status, expected }) => {
    expect(canCancel(status)).toBe(expected);
  });
});

// ============================================================
// applyApproval — full state machine integration
// ============================================================

describe("applyApproval", () => {
  const baseInput = {
    stepOrder: 1,
    approverId: "approver-1",
    approverName: "Kim Manager",
    decision: "approved" as const,
  };

  describe("single-step sequential approval", () => {
    it("single approval completes the workflow", () => {
      const result = applyApproval("pending", 1, [], baseInput, 1, "sequential");

      expect(result.status).toBe("approved");
      expect(result.currentStepOrder).toBe(2);
      expect(result.approvals).toHaveLength(1);
      expect(result.isComplete).toBe(true);
    });

    it("single rejection completes the workflow", () => {
      const result = applyApproval(
        "pending",
        1,
        [],
        { ...baseInput, decision: "rejected", comment: "Not appropriate" },
        1,
        "sequential"
      );

      expect(result.status).toBe("rejected");
      expect(result.currentStepOrder).toBe(1); // stays same on rejection
      expect(result.approvals).toHaveLength(1);
      expect(result.approvals[0].comment).toBe("Not appropriate");
      expect(result.isComplete).toBe(true);
    });
  });

  describe("3-step sequential approval (A -> B -> C)", () => {
    it("step 1 approval advances to step 2, stays pending", () => {
      const result = applyApproval(
        "pending",
        1,
        [],
        { ...baseInput, stepOrder: 1 },
        3,
        "sequential"
      );

      expect(result.status).toBe("pending");
      expect(result.currentStepOrder).toBe(2);
      expect(result.approvals).toHaveLength(1);
      expect(result.isComplete).toBe(false);
    });

    it("step 2 approval advances to step 3, stays pending", () => {
      const existingApprovals = [
        makeApprovalRecord({ stepOrder: 1, decision: "approved" }),
      ];
      const result = applyApproval(
        "pending",
        2,
        existingApprovals,
        { ...baseInput, stepOrder: 2, approverId: "approver-2" },
        3,
        "sequential"
      );

      expect(result.status).toBe("pending");
      expect(result.currentStepOrder).toBe(3);
      expect(result.approvals).toHaveLength(2);
      expect(result.isComplete).toBe(false);
    });

    it("step 3 (final) approval completes the workflow", () => {
      const existingApprovals = [
        makeApprovalRecord({ stepOrder: 1, decision: "approved" }),
        makeApprovalRecord({ stepOrder: 2, decision: "approved" }),
      ];
      const result = applyApproval(
        "pending",
        3,
        existingApprovals,
        { ...baseInput, stepOrder: 3, approverId: "approver-3" },
        3,
        "sequential"
      );

      expect(result.status).toBe("approved");
      expect(result.currentStepOrder).toBe(4);
      expect(result.approvals).toHaveLength(3);
      expect(result.isComplete).toBe(true);
    });

    it("rejection at step 2 rejects the whole workflow", () => {
      const existingApprovals = [
        makeApprovalRecord({ stepOrder: 1, decision: "approved" }),
      ];
      const result = applyApproval(
        "pending",
        2,
        existingApprovals,
        {
          ...baseInput,
          stepOrder: 2,
          approverId: "approver-2",
          decision: "rejected",
        },
        3,
        "sequential"
      );

      expect(result.status).toBe("rejected");
      expect(result.currentStepOrder).toBe(2);
      expect(result.isComplete).toBe(true);
    });
  });

  describe("delegation", () => {
    it("records delegatedFrom when specified", () => {
      const result = applyApproval(
        "pending",
        1,
        [],
        {
          ...baseInput,
          approverId: "delegate-1",
          approverName: "Park Delegate",
          delegatedFrom: "approver-1",
        },
        1,
        "sequential"
      );

      expect(result.approvals[0].delegatedFrom).toBe("approver-1");
      expect(result.approvals[0].approverId).toBe("delegate-1");
    });
  });

  describe("on_hold handling", () => {
    it("putting on hold transitions to on_hold", () => {
      const result = applyApproval(
        "pending",
        1,
        [],
        { ...baseInput, decision: "on_hold" },
        3,
        "sequential"
      );

      expect(result.status).toBe("on_hold");
      expect(result.isComplete).toBe(false);
    });
  });

  describe("error cases", () => {
    it("throws when step already processed", () => {
      const existingApprovals = [
        makeApprovalRecord({ stepOrder: 1, decision: "approved" }),
      ];

      expect(() =>
        applyApproval(
          "pending",
          1,
          existingApprovals,
          { ...baseInput, stepOrder: 1 },
          3,
          "sequential"
        )
      ).toThrow("already been processed");
    });

    it("throws when document is already approved", () => {
      expect(() =>
        applyApproval("approved", 1, [], baseInput, 1, "sequential")
      ).toThrow("already approved");
    });

    it("throws when document is cancelled", () => {
      expect(() =>
        applyApproval("cancelled", 1, [], baseInput, 1, "sequential")
      ).toThrow("already cancelled");
    });

    it("throws when document is in draft", () => {
      expect(() =>
        applyApproval("draft", 1, [], baseInput, 1, "sequential")
      ).toThrow("draft");
    });

    it("throws when document is rejected", () => {
      expect(() =>
        applyApproval("rejected", 1, [], baseInput, 1, "sequential")
      ).toThrow("rejected");
    });
  });

  describe("approval record construction", () => {
    it("creates correct approval record shape", () => {
      const result = applyApproval(
        "pending",
        1,
        [],
        {
          stepOrder: 1,
          approverId: "approver-x",
          approverName: "Lee Approver",
          decision: "approved",
          comment: "Looks good",
        },
        1,
        "sequential"
      );

      const record = result.approvals[0];
      expect(record.stepOrder).toBe(1);
      expect(record.approverId).toBe("approver-x");
      expect(record.approverName).toBe("Lee Approver");
      expect(record.decision).toBe("approved");
      expect(record.comment).toBe("Looks good");
      expect(record.delegatedFrom).toBeNull();
      expect(record.processedAt).toBeNull(); // set by Firestore
    });

    it("sets comment to null when not provided", () => {
      const result = applyApproval(
        "pending",
        1,
        [],
        baseInput,
        1,
        "sequential"
      );

      expect(result.approvals[0].comment).toBeNull();
    });
  });
});
