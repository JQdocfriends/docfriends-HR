"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  ClipboardList,
  Eye,
  Send,
  Save,
} from "lucide-react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { workflowDocumentsRef } from "@/lib/firebase/collections";
import { useAuthContext } from "@/contexts/auth-context";
import {
  useWorkflowForms,
  useWorkflowPolicies,
} from "@/hooks/use-workflows";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type {
  WorkflowForm,
  WorkflowPolicy,
  WorkflowFormField,
} from "@/types";

const STEPS = [
  { label: "양식 선택", icon: FileText },
  { label: "정보 입력", icon: ClipboardList },
  { label: "결재선 확인", icon: Eye },
  { label: "제출", icon: Send },
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  leave: "휴가",
  expense: "경비",
  purchase: "구매",
  general: "일반",
};

const CATEGORY_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  leave: "default",
  expense: "secondary",
  purchase: "outline",
  general: "secondary",
};

export default function WorkflowSubmitPage() {
  const router = useRouter();
  const { member } = useAuthContext();
  const { forms, loading: formsLoading } = useWorkflowForms();
  const { policies, loading: policiesLoading } = useWorkflowPolicies();

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);

  const selectedForm = useMemo(
    () => forms.find((f) => f.id === selectedFormId) ?? null,
    [forms, selectedFormId]
  );

  const linkedPolicy = useMemo(() => {
    if (!selectedForm) return null;
    // Try form's policyId first, then find any policy that includes this form
    if (selectedForm.policyId) {
      return policies.find((p) => p.id === selectedForm.policyId) ?? null;
    }
    return policies.find((p) => p.formIds.includes(selectedForm.id)) ?? null;
  }, [selectedForm, policies]);

  function handleSelectForm(form: WorkflowForm) {
    setSelectedFormId(form.id);
    setFormData({});
    setCurrentStep(1);
  }

  function updateField(fieldId: string, value: unknown) {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  }

  function validateFields(): boolean {
    if (!selectedForm) return false;
    for (const field of selectedForm.fields) {
      if (field.required) {
        const val = formData[field.id];
        if (val === undefined || val === null || val === "") {
          toast.error(`"${field.label}" 항목을 입력하세요.`);
          return false;
        }
      }
    }
    return true;
  }

  function handleNext() {
    if (currentStep === 1 && !validateFields()) return;
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function handleBack() {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit(asDraft: boolean) {
    if (!member || !selectedForm) return;

    if (!asDraft && !validateFields()) return;

    setSubmitting(true);
    try {
      const newDocRef = doc(workflowDocumentsRef);
      const policy = linkedPolicy;

      const approvals = policy
        ? policy.steps.map((s) => ({
            stepOrder: s.order,
            approverId: s.approverId || "",
            approverName: "",
            decision: null,
            comment: null,
            delegatedFrom: null,
            processedAt: null,
          }))
        : [];

      await setDoc(newDocRef, {
        formId: selectedForm.id,
        policyId: policy?.id ?? "",
        title: `${selectedForm.name} - ${member.name}`,
        submittedBy: member.id,
        formData: { ...formData },
        attachmentUrls: [],
        status: asDraft ? "draft" : "pending",
        currentStepOrder: 1,
        approvals,
        pdfUrl: null,
        completedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (asDraft) {
        toast.success("임시저장되었습니다.");
      } else {
        toast.success("결재가 신청되었습니다.");
      }
      router.push(`/workflows/${newDocRef.id}`);
    } catch (error) {
      console.error("Workflow submit error:", error);
      toast.error("결재 신청에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  // --- Step Indicator ---
  function StepIndicator() {
    return (
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isActive = idx === currentStep;
          const isDone = idx < currentStep;
          return (
            <div key={step.label} className="flex items-center gap-2">
              {idx > 0 && (
                <div
                  className={`h-px w-8 ${
                    isDone ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                />
              )}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : isDone
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-muted-foreground/30 text-muted-foreground"
                  }`}
                >
                  {isDone ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={`text-xs ${
                    isActive
                      ? "font-semibold text-primary"
                      : isDone
                        ? "text-primary"
                        : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // --- Step 1: Form Selection ---
  function StepFormSelection() {
    if (formsLoading) {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      );
    }

    if (forms.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            사용 가능한 양식이 없습니다.
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {forms.map((form) => (
          <Card
            key={form.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedFormId === form.id
                ? "ring-2 ring-primary"
                : "hover:border-primary/50"
            }`}
            onClick={() => handleSelectForm(form)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-sm font-medium">
                  {form.name}
                </CardTitle>
                <Badge variant={CATEGORY_VARIANTS[form.category] ?? "secondary"}>
                  {CATEGORY_LABELS[form.category] ?? form.category}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {form.description ?? "설명 없음"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                항목 {form.fields.length}개
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // --- Step 2: Dynamic Form Rendering ---
  function StepFormInput() {
    if (!selectedForm) return null;

    const sortedFields = [...selectedForm.fields].sort(
      (a, b) => a.order - b.order
    );

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {selectedForm.name} - 정보 입력
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedFields.map((field) => (
            <FieldRenderer key={field.id} field={field} />
          ))}
        </CardContent>
      </Card>
    );
  }

  function FieldRenderer({ field }: { field: WorkflowFormField }) {
    const value = formData[field.id];

    switch (field.type) {
      case "text":
        return (
          <div className="space-y-1.5">
            <Label>
              {field.label}
              {field.required && " *"}
            </Label>
            <Input
              value={(value as string) ?? ""}
              onChange={(e) => updateField(field.id, e.target.value)}
              placeholder={field.placeholder ?? ""}
              required={field.required}
            />
          </div>
        );

      case "number":
        return (
          <div className="space-y-1.5">
            <Label>
              {field.label}
              {field.required && " *"}
            </Label>
            <Input
              type="number"
              value={(value as string) ?? ""}
              onChange={(e) => updateField(field.id, e.target.value)}
              placeholder={field.placeholder ?? ""}
              required={field.required}
            />
          </div>
        );

      case "date":
        return (
          <div className="space-y-1.5">
            <Label>
              {field.label}
              {field.required && " *"}
            </Label>
            <Input
              type="date"
              value={(value as string) ?? ""}
              onChange={(e) => updateField(field.id, e.target.value)}
              required={field.required}
            />
          </div>
        );

      case "select":
        return (
          <div className="space-y-1.5">
            <Label>
              {field.label}
              {field.required && " *"}
            </Label>
            <Select
              value={(value as string) ?? ""}
              onValueChange={(v) => updateField(field.id, v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder ?? "선택"} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "checkbox":
        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={!!value}
                onCheckedChange={(v) => updateField(field.id, v)}
              />
              <Label className="cursor-pointer">
                {field.label}
                {field.required && " *"}
              </Label>
            </div>
          </div>
        );

      case "file":
        return (
          <div className="space-y-1.5">
            <Label>
              {field.label}
              {field.required && " *"}
            </Label>
            <Input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                updateField(field.id, file?.name ?? "");
              }}
            />
          </div>
        );

      case "textarea":
        return (
          <div className="space-y-1.5">
            <Label>
              {field.label}
              {field.required && " *"}
            </Label>
            <textarea
              value={(value as string) ?? ""}
              onChange={(e) => updateField(field.id, e.target.value)}
              rows={3}
              placeholder={field.placeholder ?? ""}
              required={field.required}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        );

      default:
        return null;
    }
  }

  // --- Step 3: Approval Line Preview ---
  function StepApprovalPreview() {
    if (policiesLoading) {
      return (
        <Card>
          <CardContent className="space-y-3 py-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      );
    }

    if (!linkedPolicy) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            연결된 결재 정책이 없습니다. 기본 결재선으로 제출됩니다.
          </CardContent>
        </Card>
      );
    }

    const sortedSteps = [...linkedPolicy.steps].sort(
      (a, b) => a.order - b.order
    );

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">결재선 미리보기</CardTitle>
          <p className="text-sm text-muted-foreground">
            {linkedPolicy.name} -{" "}
            {linkedPolicy.approvalType === "sequential"
              ? "순차 결재"
              : "병렬 결재"}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedSteps.map((step, idx) => (
              <div key={step.order}>
                {idx > 0 && <Separator className="my-3" />}
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {step.order}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {step.approverType === "specific"
                        ? `지정 결재자`
                        : step.approverType === "department_head"
                          ? "부서장"
                          : step.approverType === "team_lead"
                            ? "팀장"
                            : `역할: ${step.approverRole ?? "-"}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {step.isRequired ? "필수" : "선택"} | 기한:{" "}
                      {step.deadlineHours}시간
                    </p>
                  </div>
                  <Badge variant="outline">대기</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // --- Step 4: Confirmation ---
  function StepConfirmation() {
    if (!selectedForm) return null;

    const sortedFields = [...selectedForm.fields].sort(
      (a, b) => a.order - b.order
    );

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">제출 정보 확인</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">양식</p>
                <p className="text-sm font-medium">{selectedForm.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">분류</p>
                <Badge variant={CATEGORY_VARIANTS[selectedForm.category] ?? "secondary"}>
                  {CATEGORY_LABELS[selectedForm.category] ?? selectedForm.category}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">제목</p>
                <p className="text-sm font-medium">
                  {selectedForm.name} - {member?.name ?? ""}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">결재 정책</p>
                <p className="text-sm font-medium">
                  {linkedPolicy?.name ?? "없음"}
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <p className="mb-2 text-sm font-medium">입력 항목</p>
              <div className="space-y-2">
                {sortedFields.map((field) => {
                  const val = formData[field.id];
                  let displayVal = "-";
                  if (typeof val === "boolean") {
                    displayVal = val ? "예" : "아니오";
                  } else if (val !== undefined && val !== null && val !== "") {
                    displayVal = String(val);
                  }

                  return (
                    <div
                      key={field.id}
                      className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
                    >
                      <span className="text-sm text-muted-foreground">
                        {field.label}
                      </span>
                      <span className="text-sm font-medium">{displayVal}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Main Render ---
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/workflows">
            <ArrowLeft className="mr-1 h-4 w-4" />
            뒤로
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">새 결재 신청</h1>
      </div>

      <div className="mx-auto max-w-[800px]">
        <StepIndicator />

        <div className="mt-8">
          {currentStep === 0 && <StepFormSelection />}
          {currentStep === 1 && <StepFormInput />}
          {currentStep === 2 && <StepApprovalPreview />}
          {currentStep === 3 && <StepConfirmation />}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <div>
            {currentStep > 0 && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                이전
              </Button>
            )}
          </div>

          <div className="flex gap-3">
            {currentStep === 3 && (
              <Button
                variant="outline"
                onClick={() => handleSubmit(true)}
                disabled={submitting}
              >
                <Save className="mr-1 h-4 w-4" />
                임시저장
              </Button>
            )}

            {currentStep < STEPS.length - 1 ? (
              <Button onClick={handleNext} disabled={currentStep === 0 && !selectedFormId}>
                다음
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
              >
                {submitting ? "제출 중..." : "결재 신청"}
                {!submitting && <Send className="ml-1 h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
