"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Equal,
  X,
} from "lucide-react";
import {
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  query,
} from "firebase/firestore";
import { useAuthContext } from "@/contexts/auth-context";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { useWorkflowPolicies, useWorkflowForms } from "@/hooks/use-workflows";
import { useMembers } from "@/hooks/use-members";
import { workflowPoliciesRef } from "@/lib/firebase/collections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type {
  WorkflowPolicy,
  WorkflowPolicyStep,
  ApprovalType,
  ApproverType,
  WorkflowForm,
} from "@/types";

const APPROVER_TYPE_LABELS: Record<ApproverType, string> = {
  specific: "지정인",
  role: "역할",
  department_head: "부서장",
  team_lead: "팀장",
};

const APPROVAL_TYPE_LABELS: Record<ApprovalType, string> = {
  sequential: "순차 승인",
  parallel: "병렬 승인",
};

function emptyStep(order: number): WorkflowPolicyStep {
  return {
    order,
    approverType: "specific",
    approverId: null,
    approverRole: null,
    isRequired: true,
    deadlineHours: 24,
  };
}

export default function WorkflowPoliciesPage() {
  const { member } = useAuthContext();
  const { isAllowed, loading: guardLoading } = useRoleGuard(["admin"]);
  const { policies, loading, mutate } = useWorkflowPolicies();
  const { forms } = useWorkflowForms();
  const { members } = useMembers();

  // -- all policies (including inactive) --
  const [allPolicies, setAllPolicies] = useState<WorkflowPolicy[]>([]);
  const [allLoaded, setAllLoaded] = useState(false);

  const loadAllPolicies = useCallback(async () => {
    if (allLoaded) return;
    try {
      const snap = await getDocs(query(workflowPoliciesRef));
      const data = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as WorkflowPolicy
      );
      setAllPolicies(data);
      setAllLoaded(true);
    } catch {
      setAllPolicies(policies);
      setAllLoaded(true);
    }
  }, [allLoaded, policies]);

  // load all policies on mount once policies are available
  if (!allLoaded && !loading && policies.length > 0) {
    loadAllPolicies();
  }

  const displayPolicies = allLoaded ? allPolicies : policies;

  // -- dialog state --
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [approvalType, setApprovalType] = useState<ApprovalType>("sequential");
  const [steps, setSteps] = useState<WorkflowPolicyStep[]>([emptyStep(1)]);
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // -- delete confirm --
  const [deleteTarget, setDeleteTarget] = useState<WorkflowPolicy | null>(null);

  if (guardLoading) return null;
  if (!isAllowed) return null;

  function resetForm() {
    setEditingId(null);
    setName("");
    setDescription("");
    setApprovalType("sequential");
    setSteps([emptyStep(1)]);
    setSelectedFormIds([]);
  }

  function openCreate() {
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(policy: WorkflowPolicy) {
    setEditingId(policy.id);
    setName(policy.name);
    setDescription(policy.description ?? "");
    setApprovalType(policy.approvalType);
    setSteps(
      policy.steps.length > 0
        ? [...policy.steps].sort((a, b) => a.order - b.order)
        : [emptyStep(1)]
    );
    setSelectedFormIds(policy.formIds ?? []);
    setDialogOpen(true);
  }

  // -- step management --
  function addStep() {
    setSteps((prev) => [...prev, emptyStep(prev.length + 1)]);
  }

  function removeStep(index: number) {
    if (steps.length <= 1) return;
    setSteps((prev) =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 }))
    );
  }

  function updateStep(index: number, patch: Partial<WorkflowPolicyStep>) {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s))
    );
  }

  function moveStep(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;
    setSteps((prev) => {
      const arr = [...prev];
      [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
      return arr.map((s, i) => ({ ...s, order: i + 1 }));
    });
  }

  // -- form selection toggle --
  function toggleForm(formId: string) {
    setSelectedFormIds((prev) =>
      prev.includes(formId) ? prev.filter((id) => id !== formId) : [...prev, formId]
    );
  }

  // -- save --
  async function handleSubmit() {
    if (!name.trim() || !member) {
      toast.error("정책 이름을 입력하세요.");
      return;
    }
    if (steps.length === 0) {
      toast.error("최소 1개의 승인 단계가 필요합니다.");
      return;
    }
    // validate each step
    for (const step of steps) {
      if (step.approverType === "specific" && !step.approverId) {
        toast.error(`${step.order}단계: 승인자를 선택하세요.`);
        return;
      }
      if (step.approverType === "role" && !step.approverRole) {
        toast.error(`${step.order}단계: 역할을 선택하세요.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await updateDoc(doc(workflowPoliciesRef, editingId), {
          name: name.trim(),
          description: description.trim() || null,
          approvalType,
          steps,
          formIds: selectedFormIds,
          updatedAt: serverTimestamp(),
        });
        toast.success("정책이 수정되었습니다.");
      } else {
        const newDoc = doc(workflowPoliciesRef);
        await setDoc(newDoc, {
          name: name.trim(),
          description: description.trim() || null,
          approvalType,
          steps,
          formIds: selectedFormIds,
          conditions: null,
          isActive: true,
          createdBy: member.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast.success("정책이 등록되었습니다.");
      }
      setDialogOpen(false);
      resetForm();
      mutate();
      setAllLoaded(false);
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  // -- delete --
  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(workflowPoliciesRef, deleteTarget.id));
      toast.success("정책이 삭제되었습니다.");
      setDeleteTarget(null);
      mutate();
      setAllLoaded(false);
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  }

  // -- toggle active --
  async function toggleActive(policy: WorkflowPolicy) {
    try {
      await updateDoc(doc(workflowPoliciesRef, policy.id), {
        isActive: !policy.isActive,
        updatedAt: serverTimestamp(),
      });
      toast.success(
        policy.isActive ? "정책이 비활성화되었습니다." : "정책이 활성화되었습니다."
      );
      mutate();
      setAllLoaded(false);
    } catch {
      toast.error("상태 변경에 실패했습니다.");
    }
  }

  // -- helper lookups --
  function getMemberName(id: string | null) {
    if (!id) return "-";
    return members.find((m) => m.id === id)?.name ?? id;
  }

  function getFormName(id: string) {
    return forms.find((f: WorkflowForm) => f.id === id)?.name ?? id;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/workflows">
              <ArrowLeft className="mr-1 h-4 w-4" />
              뒤로
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">승인 정책 관리</h1>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          정책 추가
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : displayPolicies.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          등록된 승인 정책이 없습니다
        </div>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>정책명</TableHead>
                  <TableHead>승인 방식</TableHead>
                  <TableHead>단계 수</TableHead>
                  <TableHead>연결 양식</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayPolicies.map((policy) => (
                  <TableRow key={policy.id}>
                    <TableCell className="font-medium">{policy.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {APPROVAL_TYPE_LABELS[policy.approvalType]}
                      </Badge>
                    </TableCell>
                    <TableCell>{policy.steps.length}단계</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(policy.formIds ?? []).length === 0 ? (
                          <span className="text-xs text-muted-foreground">없음</span>
                        ) : (
                          policy.formIds.map((fid) => (
                            <Badge key={fid} variant="secondary" className="text-xs">
                              {getFormName(fid)}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={policy.isActive ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => toggleActive(policy)}
                      >
                        {policy.isActive ? "활성" : "비활성"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(policy)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteTarget(policy)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "승인 정책 수정" : "승인 정책 추가"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Basic info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>정책명 *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 일반 결재 정책"
                />
              </div>
              <div className="space-y-1.5">
                <Label>승인 방식</Label>
                <Select
                  value={approvalType}
                  onValueChange={(v) => setApprovalType(v as ApprovalType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sequential">순차 승인</SelectItem>
                    <SelectItem value="parallel">병렬 승인</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>설명</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="정책에 대한 설명"
              />
            </div>

            {/* Steps builder */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">승인 단계</Label>
                <Button variant="outline" size="sm" onClick={addStep}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  단계 추가
                </Button>
              </div>

              {/* Steps visual flow */}
              <div className="flex flex-wrap items-center gap-2">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {step.order}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {APPROVER_TYPE_LABELS[step.approverType]}
                      {step.approverType === "specific" && step.approverId
                        ? `: ${getMemberName(step.approverId)}`
                        : step.approverType === "role" && step.approverRole
                          ? `: ${step.approverRole === "admin" ? "관리자" : "매니저"}`
                          : ""}
                    </span>
                    {idx < steps.length - 1 && (
                      approvalType === "sequential" ? (
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Equal className="h-4 w-4 text-muted-foreground" />
                      )
                    )}
                  </div>
                ))}
              </div>

              {/* Steps detail cards */}
              <div className="space-y-3">
                {steps.map((step, idx) => (
                  <Card key={idx}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{step.order}단계</Badge>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                disabled={idx === 0}
                                onClick={() => moveStep(idx, "up")}
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                disabled={idx === steps.length - 1}
                                onClick={() => moveStep(idx, "down")}
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs">승인자 유형</Label>
                              <Select
                                value={step.approverType}
                                onValueChange={(v) =>
                                  updateStep(idx, {
                                    approverType: v as ApproverType,
                                    approverId: null,
                                    approverRole: null,
                                  })
                                }
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="specific">지정인</SelectItem>
                                  <SelectItem value="role">역할</SelectItem>
                                  <SelectItem value="department_head">
                                    부서장
                                  </SelectItem>
                                  <SelectItem value="team_lead">팀장</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {step.approverType === "specific" && (
                              <div className="space-y-1.5">
                                <Label className="text-xs">승인자</Label>
                                <Select
                                  value={step.approverId ?? ""}
                                  onValueChange={(v) =>
                                    updateStep(idx, { approverId: v })
                                  }
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="선택" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {members
                                      .filter((m) => m.status === "active")
                                      .map((m) => (
                                        <SelectItem key={m.id} value={m.id}>
                                          {m.name}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {step.approverType === "role" && (
                              <div className="space-y-1.5">
                                <Label className="text-xs">역할</Label>
                                <Select
                                  value={step.approverRole ?? ""}
                                  onValueChange={(v) =>
                                    updateStep(idx, { approverRole: v })
                                  }
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="선택" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="admin">관리자</SelectItem>
                                    <SelectItem value="manager">매니저</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            <div className="space-y-1.5">
                              <Label className="text-xs">기한 (시간)</Label>
                              <Input
                                type="number"
                                min={1}
                                className="h-9"
                                value={step.deadlineHours}
                                onChange={(e) =>
                                  updateStep(idx, {
                                    deadlineHours: Number(e.target.value) || 24,
                                  })
                                }
                              />
                            </div>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={step.isRequired}
                              onChange={(e) =>
                                updateStep(idx, { isRequired: e.target.checked })
                              }
                              className="h-4 w-4 rounded border-input accent-primary"
                            />
                            <span className="text-xs">필수 승인 단계</span>
                          </label>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive shrink-0"
                          disabled={steps.length <= 1}
                          onClick={() => removeStep(idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Form linking */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">연결 양식</Label>
              {forms.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  등록된 양식이 없습니다.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {forms.map((form: WorkflowForm) => (
                    <div
                      key={form.id}
                      className={`flex items-center gap-2 rounded-md border p-3 cursor-pointer transition-colors ${
                        selectedFormIds.includes(form.id)
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => toggleForm(form.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFormIds.includes(form.id)}
                        onChange={() => toggleForm(form.id)}
                        className="h-4 w-4 rounded border-input accent-primary"
                      />
                      <div>
                        <p className="text-sm font-medium">{form.name}</p>
                        {form.description && (
                          <p className="text-xs text-muted-foreground">
                            {form.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>정책 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {deleteTarget?.name}
            </span>{" "}
            정책을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
