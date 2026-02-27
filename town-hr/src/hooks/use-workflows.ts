"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import {
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import {
  workflowDocumentsRef,
  workflowFormsRef,
  workflowPoliciesRef,
} from "@/lib/firebase/collections";
import { fetchCollection } from "@/lib/firebase/swr";
import { applyApproval } from "@/lib/utils/workflow-state";
import type {
  WorkflowDocument,
  WorkflowForm,
  WorkflowPolicy,
  WorkflowStatus,
  ApprovalDecision,
} from "@/types";

// Keep onSnapshot for workflow documents (real-time approval status updates)
export function useWorkflowDocuments(submittedBy?: string) {
  const [documents, setDocuments] = useState<WorkflowDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const constraints = [];
    if (submittedBy) {
      constraints.push(where("submittedBy", "==", submittedBy));
    }
    constraints.push(orderBy("createdAt", "desc"));

    const q = query(workflowDocumentsRef, ...constraints);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as WorkflowDocument
        );
        setDocuments(data);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return unsubscribe;
  }, [submittedBy]);

  return { documents, loading };
}

export function useWorkflowDocument(id: string) {
  const [document, setDocument] = useState<WorkflowDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    async function fetch() {
      try {
        const docSnap = await getDoc(doc(db, "workflow_documents", id));
        if (docSnap.exists()) {
          setDocument({ id: docSnap.id, ...docSnap.data() } as WorkflowDocument);
        }
      } catch (error) {
        console.error("Failed to fetch workflow document:", error);
      }
      setLoading(false);
    }

    fetch();
  }, [id]);

  return { document, loading };
}

// Converted to SWR - forms rarely change
export function useWorkflowForms() {
  const { data, isLoading, mutate } = useSWR("workflow-forms", () =>
    fetchCollection<WorkflowForm>(query(workflowFormsRef, where("isActive", "==", true)))
  );

  return { forms: data ?? [], loading: isLoading, mutate };
}

// Converted to SWR - policies rarely change
export function useWorkflowPolicies() {
  const { data, isLoading, mutate } = useSWR("workflow-policies", () =>
    fetchCollection<WorkflowPolicy>(query(workflowPoliciesRef, where("isActive", "==", true)))
  );

  return { policies: data ?? [], loading: isLoading, mutate };
}

export interface SubmitWorkflowData {
  formId: string;
  policyId: string;
  title: string;
  submittedBy: string;
  formData: Record<string, unknown>;
}

export async function submitWorkflowDocument(
  data: SubmitWorkflowData
): Promise<string> {
  const docRef = await addDoc(workflowDocumentsRef, {
    ...data,
    attachmentUrls: [],
    status: "pending" as WorkflowStatus,
    currentStepOrder: 1,
    approvals: [],
    pdfUrl: null,
    completedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function processApproval(
  documentId: string,
  approverId: string,
  approverName: string,
  stepOrder: number,
  decision: ApprovalDecision,
  comment?: string
): Promise<void> {
  const docSnap = await getDoc(doc(db, "workflow_documents", documentId));
  if (!docSnap.exists()) return;

  const data = docSnap.data();

  // Fetch the workflow policy to determine total steps and approval type
  const policySnap = await getDoc(doc(db, "workflow_policies", data.policyId));
  if (!policySnap.exists()) {
    throw new Error("Workflow policy not found");
  }
  const policy = policySnap.data() as { steps: unknown[]; approvalType: string };
  const totalSteps = policy.steps.length;
  const approvalType = (policy.approvalType ?? "sequential") as "sequential" | "parallel";

  // Use the state machine to compute the correct next state
  const nextState = applyApproval(
    data.status as WorkflowStatus,
    data.currentStepOrder,
    data.approvals || [],
    {
      stepOrder,
      approverId,
      approverName,
      decision,
      comment,
    },
    totalSteps,
    approvalType
  );

  // Stamp processedAt on the new approval (last item)
  const approvals = nextState.approvals.map((a, i) =>
    i === nextState.approvals.length - 1 && a.processedAt === null
      ? { ...a, processedAt: Timestamp.now() }
      : a
  );

  await updateDoc(doc(db, "workflow_documents", documentId), {
    approvals,
    status: nextState.status,
    currentStepOrder: nextState.currentStepOrder,
    ...(nextState.isComplete && { completedAt: serverTimestamp() }),
    updatedAt: serverTimestamp(),
  });
}
