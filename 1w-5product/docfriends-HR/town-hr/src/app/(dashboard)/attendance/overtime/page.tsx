"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
  Users,
} from "lucide-react";
import { useAuthContext } from "@/contexts/auth-context";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { useAttendanceRecords } from "@/hooks/use-attendance";
import { useMembers } from "@/hooks/use-members";
import { useDepartments } from "@/hooks/use-departments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MAX_WEEKLY_MINUTES,
  STANDARD_WEEKLY_MINUTES,
  getOvertimeWarningLevel,
} from "@/lib/utils/work-hours";
import { LegalDisclaimer } from "@/components/common/legal-disclaimer";

// ---- helpers ----

function getWeekBounds(date: Date): { start: string; end: string; label: string } {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (dt: Date) => dt.toISOString().split("T")[0];
  const label = `${fmt(monday)} ~ ${fmt(sunday)}`;
  return { start: fmt(monday), end: fmt(sunday), label };
}

function shiftWeek(date: Date, delta: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + delta * 7);
  return d;
}

function formatHoursMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

const WARNING_COLORS: Record<string, { bar: string; badge: string; badgeLabel: string }> = {
  safe: {
    bar: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    badgeLabel: "정상",
  },
  warning: {
    bar: "bg-yellow-500",
    badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
    badgeLabel: "주의",
  },
  danger: {
    bar: "bg-orange-500",
    badge: "bg-orange-50 text-orange-700 border-orange-200",
    badgeLabel: "위험",
  },
  exceeded: {
    bar: "bg-red-600",
    badge: "bg-red-50 text-red-700 border-red-200",
    badgeLabel: "초과",
  },
};

// ---- types ----

interface MemberWeekly {
  memberId: string;
  name: string;
  departmentId: string | null;
  totalWorkMinutes: number;
  warningLevel: string;
}

// ---- component ----

export default function OvertimePage() {
  const { isAllowed, loading: guardLoading } = useRoleGuard(["admin", "manager"]);
  const { role } = useAuthContext();
  const { members, loading: membersLoading } = useMembers();
  const { departments } = useDepartments();

  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const week = useMemo(() => getWeekBounds(weekAnchor), [weekAnchor]);

  const { records, loading: recordsLoading } = useAttendanceRecords(undefined, {
    start: week.start,
    end: week.end,
  });

  const activeMembers = useMemo(
    () => members.filter((m) => m.status === "active"),
    [members]
  );

  const memberWeekly: MemberWeekly[] = useMemo(() => {
    const grouped: Record<string, number> = {};
    for (const rec of records) {
      grouped[rec.memberId] = (grouped[rec.memberId] ?? 0) + (rec.workMinutes ?? 0);
    }

    return activeMembers.map((m) => {
      const totalWorkMinutes = grouped[m.id] ?? 0;
      return {
        memberId: m.id,
        name: m.name,
        departmentId: m.departmentId,
        totalWorkMinutes,
        warningLevel: getOvertimeWarningLevel(totalWorkMinutes),
      };
    });
  }, [records, activeMembers]);

  const filtered = useMemo(() => {
    let list = memberWeekly;
    if (departmentFilter !== "all") {
      list = list.filter((m) => m.departmentId === departmentFilter);
    }
    list.sort((a, b) =>
      sortDir === "desc"
        ? b.totalWorkMinutes - a.totalWorkMinutes
        : a.totalWorkMinutes - b.totalWorkMinutes
    );
    return list;
  }, [memberWeekly, departmentFilter, sortDir]);

  // Summary stats
  const stats = useMemo(() => {
    const overLimit = memberWeekly.filter((m) => m.totalWorkMinutes > MAX_WEEKLY_MINUTES).length;
    const dangerZone = memberWeekly.filter(
      (m) => m.totalWorkMinutes > 48 * 60 && m.totalWorkMinutes <= MAX_WEEKLY_MINUTES
    ).length;
    const avgMinutes =
      memberWeekly.length > 0
        ? Math.round(memberWeekly.reduce((s, m) => s + m.totalWorkMinutes, 0) / memberWeekly.length)
        : 0;
    return { overLimit, dangerZone, avgMinutes, total: memberWeekly.length };
  }, [memberWeekly]);

  const loading = guardLoading || membersLoading || recordsLoading;

  if (guardLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isAllowed) return null;

  const deptMap = new Map(departments.map((d) => [d.id, d.name]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/attendance">
            <ArrowLeft className="mr-1 h-4 w-4" />
            뒤로
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          52시간 근무 모니터링
        </h1>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">52시간 초과</p>
              <p className="text-2xl font-bold text-red-600">
                {loading ? "-" : `${stats.overLimit}명`}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">위험 구간 (48~52h)</p>
              <p className="text-2xl font-bold text-orange-600">
                {loading ? "-" : `${stats.dangerZone}명`}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">평균 주간 근무</p>
              <p className="text-2xl font-bold">
                {loading ? "-" : formatHoursMinutes(stats.avgMinutes)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Week Selector & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setWeekAnchor((prev) => shiftWeek(prev, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[200px] text-center text-sm font-medium">
                {week.label}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setWeekAnchor((prev) => shiftWeek(prev, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWeekAnchor(new Date())}
              >
                이번 주
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="부서 전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">부서 전체</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
              >
                {sortDir === "desc" ? "많은 순" : "적은 순"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Member List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          해당 조건에 맞는 구성원이 없습니다
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((mw) => {
            const pct = Math.min(
              100,
              Math.round((mw.totalWorkMinutes / MAX_WEEKLY_MINUTES) * 100)
            );
            const colors = WARNING_COLORS[mw.warningLevel] ?? WARNING_COLORS.safe;
            const deptName = mw.departmentId ? deptMap.get(mw.departmentId) : null;

            return (
              <Card key={mw.memberId}>
                <CardContent className="flex items-center gap-4 py-4">
                  {/* Name & Department */}
                  <div className="w-32 shrink-0">
                    <p className="text-sm font-medium">{mw.name}</p>
                    {deptName && (
                      <p className="text-xs text-muted-foreground">{deptName}</p>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="relative flex-1">
                          <div className="h-6 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full transition-all ${colors.bar}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {/* 40h marker */}
                          <div
                            className="absolute top-0 h-6 w-px bg-gray-400"
                            style={{
                              left: `${Math.round(
                                (STANDARD_WEEKLY_MINUTES / MAX_WEEKLY_MINUTES) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {formatHoursMinutes(mw.totalWorkMinutes)} / 52시간 ({pct}
                          %)
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Hours & Badge */}
                  <div className="flex w-40 shrink-0 items-center justify-end gap-2">
                    <span className="text-sm font-medium tabular-nums">
                      {formatHoursMinutes(mw.totalWorkMinutes)}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${colors.badge}`}
                    >
                      {colors.badgeLabel}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <LegalDisclaimer message="근로시간 집계는 참고용이며, 법적 판단은 노무사와 상담하세요." />
    </div>
  );
}
