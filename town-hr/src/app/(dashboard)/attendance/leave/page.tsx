"use client";

import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { useAuthContext } from "@/contexts/auth-context";
import { useLeaveRequests, useLeaveBalances, useLeavePolicies, approveLeaveRequest, rejectLeaveRequest } from "@/hooks/use-leave";
import { useMembers } from "@/hooks/use-members";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { LeaveRequestStatus } from "@/types";

const STATUS_CONFIG: Record<LeaveRequestStatus, { label: string; className: string }> = {
  pending: { label: "대기중", className: "bg-[#FEF3C7] text-[#F59E0B]" },
  approved: { label: "승인됨", className: "bg-[#DCFCE7] text-[#16A34A]" },
  rejected: { label: "반려됨", className: "bg-[#FEE2E2] text-[#DC2626]" },
  cancelled: { label: "취소됨", className: "bg-[#F5F5F5] text-[#737373]" },
};

export default function LeavePage() {
  const { member, role } = useAuthContext();
  const canApprove = role === "admin" || role === "manager";
  const { balances, loading: balanceLoading } = useLeaveBalances(member?.id ?? "");
  const { requests, loading: requestLoading } = useLeaveRequests(
    canApprove ? undefined : member?.id
  );
  const { policies } = useLeavePolicies();
  const { members } = useMembers();

  function getPolicyName(policyId: string) {
    return policies.find((p) => p.id === policyId)?.name ?? "-";
  }

  function getMemberName(memberId: string) {
    return members.find((m) => m.id === memberId)?.name ?? "-";
  }

  async function handleApprove(requestId: string) {
    if (!member) return;
    try {
      await approveLeaveRequest(requestId, member.id);
      toast.success("휴가가 승인되었습니다.");
    } catch {
      toast.error("승인 처리에 실패했습니다.");
    }
  }

  async function handleReject(requestId: string) {
    if (!member) return;
    const comment = prompt("반려 사유를 입력하세요:");
    if (comment === null) return;
    try {
      await rejectLeaveRequest(requestId, member.id, comment);
      toast.success("휴가가 반려되었습니다.");
    } catch {
      toast.error("반려 처리에 실패했습니다.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/attendance">
              <ArrowLeft className="mr-1 h-4 w-4" />
              뒤로
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">휴가 관리</h1>
        </div>
        <Button asChild>
          <Link href="/attendance/leave/request">
            <Plus className="mr-1 h-4 w-4" />
            휴가 신청
          </Link>
        </Button>
      </div>

      {/* Leave Balances */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          나의 휴가 잔여
        </h2>
        {balanceLoading ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : balances.length === 0 ? (
          <Card>
            <CardContent className="flex h-20 items-center justify-center text-sm text-muted-foreground">
              배정된 휴가가 없습니다
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {balances.map((balance) => (
              <Card key={balance.id}>
                <CardContent className="py-4">
                  <div className="text-xs text-muted-foreground">
                    {getPolicyName(balance.policyId)}
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-primary">
                      {balance.remaining}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      / {balance.granted}일
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    사용 {balance.used}일 | 대기 {balance.pending}일
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Leave Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {canApprove ? "휴가 요청 목록" : "나의 휴가 신청 내역"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requestLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : requests.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              휴가 신청 내역이 없습니다
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {canApprove && <TableHead>신청자</TableHead>}
                  <TableHead>휴가 종류</TableHead>
                  <TableHead>기간</TableHead>
                  <TableHead>일수</TableHead>
                  <TableHead>사유</TableHead>
                  <TableHead>상태</TableHead>
                  {canApprove && <TableHead className="w-[120px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => {
                  const statusInfo = STATUS_CONFIG[req.status];
                  return (
                    <TableRow key={req.id}>
                      {canApprove && (
                        <TableCell className="font-medium">
                          {getMemberName(req.memberId)}
                        </TableCell>
                      )}
                      <TableCell>{getPolicyName(req.policyId)}</TableCell>
                      <TableCell>
                        {req.startDate === req.endDate
                          ? req.startDate
                          : `${req.startDate} ~ ${req.endDate}`}
                      </TableCell>
                      <TableCell>{req.days}일</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {req.reason}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}
                        >
                          {statusInfo.label}
                        </span>
                      </TableCell>
                      {canApprove && (
                        <TableCell>
                          {req.status === "pending" && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-[#16A34A]"
                                onClick={() => handleApprove(req.id)}
                              >
                                승인
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-[#DC2626]"
                                onClick={() => handleReject(req.id)}
                              >
                                반려
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
