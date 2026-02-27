"use client";

import { useMemo, useState } from "react";
import { Search, Calendar, Users, UserCheck, UserX, Clock } from "lucide-react";
import { useMembers } from "@/hooks/use-members";
import { useAttendanceRecords } from "@/hooks/use-attendance";
import { useDepartments } from "@/hooks/use-departments";
import { useAuthContext } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import type { AttendanceStatus } from "@/types";

const STATUS_CONFIG: Record<
  AttendanceStatus | "absent",
  { label: string; className: string }
> = {
  present: { label: "출근", className: "bg-[#DCFCE7] text-[#16A34A]" },
  absent: { label: "결근", className: "bg-[#FEE2E2] text-[#DC2626]" },
  on_leave: { label: "휴가", className: "bg-[#FEF3C7] text-[#F59E0B]" },
  half_day: { label: "반차", className: "bg-[#FFEDD5] text-[#EA580C]" },
  holiday: { label: "휴일", className: "bg-[#DBEAFE] text-[#2563EB]" },
};

function formatTime(timestamp: { toDate: () => Date } | null): string {
  if (!timestamp) return "-";
  const d = timestamp.toDate();
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

export default function TeamAttendancePage() {
  const { role: currentUserRole } = useAuthContext();
  const { members, loading: membersLoading } = useMembers();
  const { departments } = useDepartments();

  const today = new Date().toISOString().split("T")[0];
  const { records, loading: recordsLoading } = useAttendanceRecords(undefined, {
    start: today,
    end: today,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const canAccess =
    currentUserRole === "admin" || currentUserRole === "manager";

  // Active members only
  const activeMembers = useMemo(
    () => members.filter((m) => m.status !== "resigned"),
    [members]
  );

  // Build attendance map: memberId -> record
  const attendanceMap = useMemo(() => {
    const map = new Map<string, (typeof records)[0]>();
    for (const record of records) {
      map.set(record.memberId, record);
    }
    return map;
  }, [records]);

  // Filtered members
  const filteredMembers = useMemo(() => {
    return activeMembers.filter((m) => {
      const matchesSearch =
        !searchQuery ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept =
        departmentFilter === "all" || m.departmentId === departmentFilter;
      return matchesSearch && matchesDept;
    });
  }, [activeMembers, searchQuery, departmentFilter]);

  // Summary stats
  const stats = useMemo(() => {
    const total = activeMembers.length;
    let present = 0;
    let onLeave = 0;
    let halfDay = 0;
    let holiday = 0;
    let late = 0;

    for (const member of activeMembers) {
      const record = attendanceMap.get(member.id);
      if (!record) continue;
      if (record.status === "present") present++;
      if (record.status === "on_leave") onLeave++;
      if (record.status === "half_day") halfDay++;
      if (record.status === "holiday") holiday++;
    }

    const absent = total - present - onLeave - halfDay - holiday;

    return { total, present, absent, onLeave, late };
  }, [activeMembers, attendanceMap]);

  const loading = membersLoading || recordsLoading;

  if (!canAccess) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-4 text-sm text-muted-foreground">
        <p>접근 권한이 없습니다.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const todayFormatted = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold">팀 근태 현황</h1>
        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {todayFormatted}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-5">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">전체</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <UserCheck className="h-5 w-5 text-[#16A34A]" />
            <div>
              <p className="text-2xl font-bold">{stats.present}</p>
              <p className="text-xs text-muted-foreground">출근</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <UserX className="h-5 w-5 text-[#DC2626]" />
            <div>
              <p className="text-2xl font-bold">{stats.absent}</p>
              <p className="text-xs text-muted-foreground">결근</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Clock className="h-5 w-5 text-[#F59E0B]" />
            <div>
              <p className="text-2xl font-bold">{stats.onLeave}</p>
              <p className="text-xs text-muted-foreground">휴가</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Clock className="h-5 w-5 text-[#EA580C]" />
            <div>
              <p className="text-2xl font-bold">{stats.late}</p>
              <p className="text-xs text-muted-foreground">지각</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 pt-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="이름으로 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="부서 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 부서</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Attendance table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>구성원</TableHead>
                <TableHead>부서</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>출근 시각</TableHead>
                <TableHead>퇴근 시각</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    구성원이 없습니다.
                  </TableCell>
                </TableRow>
              )}
              {filteredMembers.map((member) => {
                const record = attendanceMap.get(member.id);
                const attendanceStatus: AttendanceStatus | "absent" =
                  record?.status ?? "absent";
                const config = STATUS_CONFIG[attendanceStatus];
                const deptName =
                  departments.find((d) => d.id === member.departmentId)
                    ?.name ?? "-";

                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={member.profileImageUrl ?? undefined}
                            alt={member.name}
                          />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {member.name.slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{member.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {deptName}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
                      >
                        {config.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      {record ? formatTime(record.checkInTime) : "-"}
                    </TableCell>
                    <TableCell>
                      {record ? formatTime(record.checkOutTime) : "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
