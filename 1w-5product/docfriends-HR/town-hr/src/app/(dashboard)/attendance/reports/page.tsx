"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { useAuthContext } from "@/contexts/auth-context";
import { useAttendanceRecords } from "@/hooks/use-attendance";
import { useMembers } from "@/hooks/use-members";
import { useDepartments } from "@/hooks/use-departments";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AttendanceRecord, Member } from "@/types";
import { LegalDisclaimer } from "@/components/common/legal-disclaimer";

type ReportScope = "individual" | "department" | "company";
type ReportType = "daily" | "weekly" | "monthly";

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}시간 ${m}분`;
}

interface ReportRow {
  name: string;
  department: string;
  period: string;
  workHours: string;
  overtime: string;
  leaveDays: number;
  status: string;
}

function buildReportRows(
  records: AttendanceRecord[],
  members: Member[],
  departments: { id: string; name: string }[],
  scope: ReportScope,
  selectedMemberId: string,
  selectedDepartmentId: string,
  reportType: ReportType
): ReportRow[] {
  // Filter records by scope
  let filtered = [...records];
  if (scope === "individual" && selectedMemberId) {
    filtered = filtered.filter((r) => r.memberId === selectedMemberId);
  } else if (scope === "department" && selectedDepartmentId) {
    const deptMembers = members
      .filter((m) => m.departmentId === selectedDepartmentId)
      .map((m) => m.id);
    filtered = filtered.filter((r) => deptMembers.includes(r.memberId));
  }

  if (reportType === "daily") {
    return filtered.map((rec) => {
      const m = members.find((mb) => mb.id === rec.memberId);
      const dept = departments.find((d) => d.id === m?.departmentId);
      return {
        name: m?.name ?? "-",
        department: dept?.name ?? "-",
        period: rec.date,
        workHours: rec.workMinutes != null ? formatMinutes(rec.workMinutes) : "-",
        overtime: rec.overtimeMinutes > 0 ? formatMinutes(rec.overtimeMinutes) : "-",
        leaveDays: rec.status === "on_leave" ? 1 : rec.status === "half_day" ? 0.5 : 0,
        status:
          rec.status === "present" ? "출근" :
          rec.status === "absent" ? "결근" :
          rec.status === "half_day" ? "반차" :
          rec.status === "on_leave" ? "휴가" : "휴일",
      };
    });
  }

  // For weekly/monthly: group by member
  const memberMap = new Map<string, AttendanceRecord[]>();
  for (const rec of filtered) {
    const arr = memberMap.get(rec.memberId) ?? [];
    arr.push(rec);
    memberMap.set(rec.memberId, arr);
  }

  const rows: ReportRow[] = [];
  for (const [memberId, recs] of memberMap) {
    const m = members.find((mb) => mb.id === memberId);
    const dept = departments.find((d) => d.id === m?.departmentId);
    const totalWork = recs.reduce((sum, r) => sum + (r.workMinutes ?? 0), 0);
    const totalOvertime = recs.reduce((sum, r) => sum + r.overtimeMinutes, 0);
    const leaveDays = recs.reduce(
      (sum, r) => sum + (r.status === "on_leave" ? 1 : r.status === "half_day" ? 0.5 : 0),
      0
    );

    const dates = recs.map((r) => r.date).sort();
    const period = dates.length > 0 ? `${dates[0]} ~ ${dates[dates.length - 1]}` : "-";

    rows.push({
      name: m?.name ?? "-",
      department: dept?.name ?? "-",
      period,
      workHours: formatMinutes(totalWork),
      overtime: totalOvertime > 0 ? formatMinutes(totalOvertime) : "-",
      leaveDays,
      status: `${recs.length}일 기록`,
    });
  }

  return rows;
}

function downloadCSV(rows: ReportRow[], filename: string) {
  const header = "이름,부서,기간,근무시간,초과근무,휴가일수,상태";
  const csvRows = rows.map(
    (r) => `${r.name},${r.department},${r.period},${r.workHours},${r.overtime},${r.leaveDays},${r.status}`
  );
  const csv = [header, ...csvRows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AttendanceReportsPage() {
  const { role } = useAuthContext();
  const { members } = useMembers();
  const { departments } = useDepartments();

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(lastOfMonth);
  const [scope, setScope] = useState<ReportScope>("company");
  const [reportType, setReportType] = useState<ReportType>("daily");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");

  const { records, loading } = useAttendanceRecords(undefined, {
    start: startDate,
    end: endDate,
  });

  const rows = useMemo(
    () =>
      buildReportRows(
        records,
        members,
        departments,
        scope,
        selectedMemberId,
        selectedDepartmentId,
        reportType
      ),
    [records, members, departments, scope, selectedMemberId, selectedDepartmentId, reportType]
  );

  const canAccess = role === "admin" || role === "manager";

  if (!canAccess) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        관리자 또는 매니저만 접근할 수 있습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/attendance">
            <ArrowLeft className="mr-1 h-4 w-4" />
            뒤로
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">근태 리포트</h1>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">리포트 조건</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>시작일</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>종료일</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>범위</Label>
              <Select
                value={scope}
                onValueChange={(v) => setScope(v as ReportScope)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">전사</SelectItem>
                  <SelectItem value="department">부서별</SelectItem>
                  <SelectItem value="individual">개인별</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>집계 단위</Label>
              <Select
                value={reportType}
                onValueChange={(v) => setReportType(v as ReportType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">일별</SelectItem>
                  <SelectItem value="weekly">주별</SelectItem>
                  <SelectItem value="monthly">월별</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conditional scope selectors */}
          {scope === "individual" && (
            <div className="mt-4 space-y-1.5">
              <Label>구성원 선택</Label>
              <Select
                value={selectedMemberId}
                onValueChange={setSelectedMemberId}
              >
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="구성원을 선택하세요" />
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

          {scope === "department" && (
            <div className="mt-4 space-y-1.5">
              <Label>부서 선택</Label>
              <Select
                value={selectedDepartmentId}
                onValueChange={setSelectedDepartmentId}
              >
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="부서를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadCSV(rows, `근태리포트_${startDate}_${endDate}`)}
          disabled={rows.length === 0}
        >
          <Download className="mr-1 h-4 w-4" />
          Excel (CSV)
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.print()}
          disabled={rows.length === 0}
        >
          <Printer className="mr-1 h-4 w-4" />
          PDF (인쇄)
        </Button>
      </div>

      {/* Preview table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          조건에 맞는 데이터가 없습니다
        </div>
      ) : (
        <div className="rounded-lg border print:border-none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>부서</TableHead>
                <TableHead>기간</TableHead>
                <TableHead>근무시간</TableHead>
                <TableHead>초과근무</TableHead>
                <TableHead>휴가일수</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.department}</TableCell>
                  <TableCell>{row.period}</TableCell>
                  <TableCell>{row.workHours}</TableCell>
                  <TableCell>
                    {row.overtime !== "-" ? (
                      <span className="text-[#DC2626]">{row.overtime}</span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {row.leaveDays > 0 ? (
                      <span className="text-[#2563EB]">{row.leaveDays}일</span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{row.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Summary for print */}
      <div className="hidden print:block mt-6 text-xs text-muted-foreground text-center">
        기간: {startDate} ~ {endDate} | 총 {rows.length}건
      </div>

      <LegalDisclaimer message="본 리포트는 참고용이며, 공식 문서로 사용할 수 없습니다." />
    </div>
  );
}
