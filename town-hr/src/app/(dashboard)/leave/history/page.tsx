"use client";

import { useState } from "react";
import { useAuthContext } from "@/contexts/auth-context";
import { useLeaveRequests, useLeavePolicies } from "@/hooks/use-leave";
import { useMembers } from "@/hooks/use-members";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { LeaveRequestStatus } from "@/types";

const STATUS_CONFIG: Record<LeaveRequestStatus, { label: string; className: string }> = {
  pending: { label: "대기중", className: "bg-[#FEF3C7] text-[#F59E0B]" },
  approved: { label: "승인됨", className: "bg-[#DCFCE7] text-[#16A34A]" },
  rejected: { label: "반려됨", className: "bg-[#FEE2E2] text-[#DC2626]" },
  cancelled: { label: "취소됨", className: "bg-[#F5F5F5] text-[#737373]" },
};

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

type StatusFilter = "all" | LeaveRequestStatus;

export default function LeaveHistoryPage() {
  const { member, role } = useAuthContext();
  const canApprove = role === "admin" || role === "manager";
  const [selectedYear, setSelectedYear] = useState(String(CURRENT_YEAR));
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

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

  const filteredRequests = requests.filter((req) => {
    const reqYear = req.startDate?.slice(0, 4);
    if (reqYear !== selectedYear) return false;
    if (statusFilter !== "all" && req.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">휴가 내역</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">휴가 신청 내역</CardTitle>
            <div className="flex gap-2">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="연도" />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}년
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="approved">승인됨</SelectItem>
                  <SelectItem value="rejected">반려됨</SelectItem>
                  <SelectItem value="cancelled">취소됨</SelectItem>
                  <SelectItem value="pending">대기중</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {requestLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : filteredRequests.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              해당 조건의 휴가 내역이 없습니다
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
                  <TableHead>신청일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((req) => {
                  const statusInfo = STATUS_CONFIG[req.status];
                  const createdAt = req.createdAt
                    ? (typeof req.createdAt === "object" && "toDate" in req.createdAt
                        ? (req.createdAt as { toDate: () => Date }).toDate()
                        : new Date(req.createdAt as string)
                      ).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
                    : "-";
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
                      <TableCell className="text-muted-foreground">
                        {createdAt}
                      </TableCell>
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
