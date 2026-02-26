"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuthContext } from "@/contexts/auth-context";
import { useAttendanceRecords } from "@/hooks/use-attendance";
import { useMembers } from "@/hooks/use-members";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AttendanceStatus } from "@/types";
import type { Timestamp } from "firebase/firestore";

const STATUS_LABELS: Record<AttendanceStatus, { label: string; className: string }> = {
  present: { label: "출근", className: "bg-[#DCFCE7] text-[#16A34A]" },
  absent: { label: "결근", className: "bg-[#FEE2E2] text-[#DC2626]" },
  half_day: { label: "반차", className: "bg-[#FEF3C7] text-[#F59E0B]" },
  on_leave: { label: "휴가", className: "bg-[#DBEAFE] text-[#2563EB]" },
  holiday: { label: "휴일", className: "bg-[#F5F5F5] text-[#737373]" },
};

function formatTime(ts: Timestamp | null): string {
  if (!ts) return "--:--";
  return new Date(ts.toMillis()).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMinutes(minutes: number | null): string {
  if (minutes == null) return "-";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}시간 ${m}분`;
}

export default function AttendanceRecordsPage() {
  const { member, role } = useAuthContext();
  const { members } = useMembers();
  const canViewAll = role === "admin" || role === "manager";

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(lastOfMonth);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    canViewAll ? "all" : member?.id ?? ""
  );

  const { records, loading } = useAttendanceRecords(
    selectedMemberId === "all" ? undefined : selectedMemberId,
    { start: startDate, end: endDate }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/attendance">
            <ArrowLeft className="mr-1 h-4 w-4" />
            뒤로
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">근태 기록</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">조회 조건</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            {canViewAll && (
              <div className="space-y-1.5">
                <Label>구성원</Label>
                <Select
                  value={selectedMemberId}
                  onValueChange={setSelectedMemberId}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
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
            <div className="space-y-1.5">
              <Label>시작일</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>종료일</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          해당 기간의 근태 기록이 없습니다
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {canViewAll && <TableHead>이름</TableHead>}
                <TableHead>날짜</TableHead>
                <TableHead>출근</TableHead>
                <TableHead>퇴근</TableHead>
                <TableHead>근무시간</TableHead>
                <TableHead>초과근무</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((rec) => {
                const statusInfo = STATUS_LABELS[rec.status];
                const memberName = members.find(
                  (m) => m.id === rec.memberId
                )?.name;
                return (
                  <TableRow key={rec.id}>
                    {canViewAll && (
                      <TableCell className="font-medium">
                        {memberName ?? rec.memberId}
                      </TableCell>
                    )}
                    <TableCell>{rec.date}</TableCell>
                    <TableCell>{formatTime(rec.checkInTime)}</TableCell>
                    <TableCell>{formatTime(rec.checkOutTime)}</TableCell>
                    <TableCell>{formatMinutes(rec.workMinutes)}</TableCell>
                    <TableCell>
                      {rec.overtimeMinutes > 0 ? (
                        <span className="text-[#DC2626]">
                          {formatMinutes(rec.overtimeMinutes)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}
                      >
                        {statusInfo.label}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
