"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  PauseCircle,
  Clock,
  MessageSquare,
} from "lucide-react";
import { useWorkflowDocument, processApproval } from "@/hooks/use-workflows";
import { useMembers } from "@/hooks/use-members";
import { useAuthContext } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { WorkflowStatus, ApprovalDecision } from "@/types";

const STATUS_CONFIG: Record<WorkflowStatus, { label: string; className: string }> = {
  draft: { label: "초안", className: "bg-[#F5F5F5] text-[#737373]" },
  pending: { label: "대기중", className: "bg-[#FEF3C7] text-[#F59E0B]" },
  approved: { label: "승인됨", className: "bg-[#DCFCE7] text-[#16A34A]" },
  rejected: { label: "반려됨", className: "bg-[#FEE2E2] text-[#DC2626]" },
  on_hold: { label: "보류", className: "bg-[#DBEAFE] text-[#2563EB]" },
  cancelled: { label: "취소됨", className: "bg-[#F5F5F5] text-[#737373]" },
};

const DECISION_ICONS: Record<
  string,
  { icon: typeof CheckCircle; className: string }
> = {
  approved: { icon: CheckCircle, className: "text-[#16A34A]" },
  rejected: { icon: XCircle, className: "text-[#DC2626]" },
  on_hold: { icon: PauseCircle, className: "text-[#2563EB]" },
};

export default function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { document: wfDoc, loading } = useWorkflowDocument(id);
  const { members } = useMembers();
  const { member: currentUser, role } = useAuthContext();
  const [processing, setProcessing] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<ApprovalDecision | null>(null);
  const [commentText, setCommentText] = useState("");

  const canApprove = role === "admin" || role === "manager";

  function getMemberName(memberId: string) {
    return members.find((m) => m.id === memberId)?.name ?? memberId;
  }

  function openCommentDialog(decision: ApprovalDecision) {
    setPendingDecision(decision);
    setCommentText("");
    setCommentDialogOpen(true);
  }

  async function handleConfirmDecision() {
    if (!wfDoc || !currentUser || !pendingDecision) return;
    if (pendingDecision === "rejected" && !commentText.trim()) {
      toast.error("반려 사유를 입력해주세요.");
      return;
    }

    setCommentDialogOpen(false);
    setProcessing(true);
    try {
      await processApproval(
        wfDoc.id,
        currentUser.id,
        currentUser.name ?? "",
        wfDoc.currentStepOrder,
        pendingDecision,
        commentText.trim() || undefined
      );
      const labels = { approved: "승인", rejected: "반려", on_hold: "보류" };
      toast.success(`${labels[pendingDecision]} 처리되었습니다.`);
      router.refresh();
    } catch {
      toast.error("처리에 실패했습니다.");
    } finally {
      setProcessing(false);
      setPendingDecision(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!wfDoc) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-4 text-sm text-muted-foreground">
        <p>결재 문서를 찾을 수 없습니다.</p>
        <Button variant="outline" onClick={() => router.push("/workflows")}>
          목록으로 돌아가기
        </Button>
      </div>
    );
  }

  const statusInfo = STATUS_CONFIG[wfDoc.status];
  const dialogTitle: Record<ApprovalDecision, string> = {
    approved: "승인 확인",
    rejected: "반려 확인",
    on_hold: "보류 확인",
  };

  // Find the next pending approver for "pending" status
  const nextPendingStep =
    wfDoc.status === "pending"
      ? wfDoc.approvals.find((a) => a.decision === null)
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/workflows">
              <ArrowLeft className="mr-1 h-4 w-4" />
              뒤로
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {wfDoc.title}
            </h1>
            <span
              className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}
            >
              {statusInfo.label}
            </span>
          </div>
        </div>
        {canApprove && wfDoc.status === "pending" && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openCommentDialog("on_hold")}
              disabled={processing}
            >
              보류
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-[#DC2626]"
              onClick={() => openCommentDialog("rejected")}
              disabled={processing}
            >
              반려
            </Button>
            <Button
              size="sm"
              onClick={() => openCommentDialog("approved")}
              disabled={processing}
            >
              승인
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form Data */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">신청 내용</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(wfDoc.formData).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                입력된 데이터가 없습니다
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(wfDoc.formData).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-sm text-muted-foreground">{key}</span>
                    <p className="text-sm font-medium">{String(value)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info & Approval Timeline */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">문서 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">신청자</span>
                <p className="font-medium">
                  {getMemberName(wfDoc.submittedBy)}
                </p>
              </div>
              <Separator />
              <div>
                <span className="text-muted-foreground">신청일</span>
                <p className="font-medium">
                  {wfDoc.createdAt
                    ? new Date(
                        wfDoc.createdAt.toMillis()
                      ).toLocaleDateString("ko-KR")
                    : "-"}
                </p>
              </div>
              {wfDoc.completedAt && (
                <>
                  <Separator />
                  <div>
                    <span className="text-muted-foreground">완료일</span>
                    <p className="font-medium">
                      {new Date(
                        wfDoc.completedAt.toMillis()
                      ).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">결재 이력</CardTitle>
            </CardHeader>
            <CardContent>
              {wfDoc.approvals.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  결재 이력이 없습니다
                </p>
              ) : (
                <div className="relative">
                  {wfDoc.approvals.map((approval, i) => {
                    const isLast = i === wfDoc.approvals.length - 1;
                    const isPending = approval.decision === null;
                    const isCurrent =
                      wfDoc.status === "pending" &&
                      approval.stepOrder === wfDoc.currentStepOrder &&
                      isPending;

                    let StepIcon = Clock;
                    let iconClass = "text-muted-foreground";
                    if (approval.decision) {
                      const info = DECISION_ICONS[approval.decision];
                      if (info) {
                        StepIcon = info.icon;
                        iconClass = info.className;
                      }
                    }

                    return (
                      <div key={i} className="relative flex gap-3 pb-6 last:pb-0">
                        {/* Vertical line */}
                        {!isLast && (
                          <div className="absolute left-[9px] top-5 h-[calc(100%-12px)] w-px bg-border" />
                        )}
                        {/* Step icon */}
                        <div
                          className={`relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                            isCurrent
                              ? "ring-2 ring-[#F59E0B] ring-offset-2"
                              : ""
                          }`}
                        >
                          <StepIcon className={`h-5 w-5 ${iconClass}`} />
                        </div>
                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {approval.approverName}
                            </span>
                            {isCurrent && (
                              <span className="rounded-full bg-[#FEF3C7] px-1.5 py-0.5 text-[10px] font-medium text-[#F59E0B]">
                                현재 단계
                              </span>
                            )}
                          </div>
                          {approval.decision && (
                            <p className="text-xs text-muted-foreground">
                              {approval.decision === "approved" && "승인"}
                              {approval.decision === "rejected" && "반려"}
                              {approval.decision === "on_hold" && "보류"}
                            </p>
                          )}
                          {isPending && !isCurrent && (
                            <p className="text-xs text-muted-foreground">
                              대기중
                            </p>
                          )}
                          {approval.comment && (
                            <div className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                              <MessageSquare className="mt-0.5 h-3 w-3 shrink-0" />
                              <span>{approval.comment}</span>
                            </div>
                          )}
                          {approval.processedAt && (
                            <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                              {new Date(
                                approval.processedAt.toMillis()
                              ).toLocaleDateString("ko-KR")}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pending approver info */}
              {wfDoc.status === "pending" && nextPendingStep && (
                <>
                  <Separator className="my-3" />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 text-[#F59E0B]" />
                    <span>
                      <strong className="font-medium text-foreground">
                        {nextPendingStep.approverName}
                      </strong>
                      님의 결재를 기다리고 있습니다
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Comment Dialog */}
      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingDecision ? dialogTitle[pendingDecision] : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {pendingDecision === "rejected" ? "반려 사유 (필수)" : "의견 (선택)"}
            </label>
            <textarea
              className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] min-h-[100px] resize-none"
              placeholder={
                pendingDecision === "rejected"
                  ? "반려 사유를 입력하세요..."
                  : "의견을 입력하세요 (선택사항)..."
              }
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCommentDialogOpen(false)}
            >
              취소
            </Button>
            <Button
              onClick={handleConfirmDecision}
              disabled={pendingDecision === "rejected" && !commentText.trim()}
            >
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
