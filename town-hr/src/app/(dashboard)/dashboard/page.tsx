"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Clock,
  AlertTriangle,
  CheckSquare,
  ArrowRight,
} from "lucide-react";
import { useAuthContext } from "@/contexts/auth-context";
import { useCompany } from "@/contexts/company-context";
import { useMembers } from "@/hooks/use-members";
import { useAttendanceRecords } from "@/hooks/use-attendance";
import { useDepartments } from "@/hooks/use-departments";
import { useWorkflowDocuments } from "@/hooks/use-workflows";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  MAX_WEEKLY_MINUTES,
  getOvertimeWarningLevel,
} from "@/lib/utils/work-hours";

// ---- helpers ----

function getWeekBounds(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { start: fmt(monday), end: fmt(sunday) };
}

function formatHoursMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const WARNING_COLORS: Record<
  string,
  { bar: string; badge: string; badgeLabel: string }
> = {
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

// ---- stat card ----

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  loading?: boolean;
}

function StatCard({ title, value, icon: Icon, description, loading }: StatCardProps) {
  if (loading) return <StatCardSkeleton />;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-5" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16" />
        <Skeleton className="mt-2 h-3 w-32" />
      </CardContent>
    </Card>
  );
}

// ---- main page ----

export default function DashboardPage() {
  const { member, loading: authLoading } = useAuthContext();
  const { company } = useCompany();
  const { members, loading: membersLoading } = useMembers();
  const { departments } = useDepartments();
  const { documents: workflowDocs, loading: workflowsLoading } = useWorkflowDocuments();

  const today = new Date().toISOString().split("T")[0];
  const week = useMemo(() => getWeekBounds(), []);

  const { records: todayRecords, loading: todayLoading } =
    useAttendanceRecords(undefined, { start: today, end: today });

  const { records: weekRecords, loading: weekLoading } =
    useAttendanceRecords(undefined, { start: week.start, end: week.end });

  // Active members
  const activeMembers = useMemo(
    () => members.filter((m) => m.status === "active"),
    [members]
  );

  // Today's present count
  const todayPresentCount = useMemo(
    () => todayRecords.filter((r) => r.status === "present" || r.status === "half_day").length,
    [todayRecords]
  );

  // Overtime alert threshold from company settings (default 48h)
  const alertThresholdHours = company?.workPolicy?.overtimeAlertThreshold ?? 48;

  // Weekly hours per member
  const memberWeeklyData = useMemo(() => {
    const grouped: Record<string, number> = {};
    for (const rec of weekRecords) {
      grouped[rec.memberId] =
        (grouped[rec.memberId] ?? 0) + (rec.workMinutes ?? 0);
    }

    return activeMembers
      .map((m) => {
        const totalWorkMinutes = grouped[m.id] ?? 0;
        return {
          memberId: m.id,
          name: m.name,
          departmentId: m.departmentId,
          totalWorkMinutes,
          warningLevel: getOvertimeWarningLevel(
            totalWorkMinutes,
            alertThresholdHours
          ),
        };
      })
      .sort((a, b) => b.totalWorkMinutes - a.totalWorkMinutes);
  }, [weekRecords, activeMembers, alertThresholdHours]);

  // 52h warning count: members exceeding the alert threshold
  const warningCount = useMemo(
    () =>
      memberWeeklyData.filter(
        (m) => m.totalWorkMinutes > alertThresholdHours * 60
      ).length,
    [memberWeeklyData, alertThresholdHours]
  );

  // Top 5 at risk for overtime widget
  const top5AtRisk = useMemo(
    () => memberWeeklyData.filter((m) => m.totalWorkMinutes > 0).slice(0, 5),
    [memberWeeklyData]
  );

  const pendingDocs = useMemo(
    () => workflowDocs.filter((d) => d.status === "pending"),
    [workflowDocs]
  );
  const recentPending = pendingDocs.slice(0, 5);

  const deptMap = useMemo(
    () => new Map(departments.map((d) => [d.id, d.name])),
    [departments]
  );

  function getMemberName(memberId: string) {
    return members.find((m) => m.id === memberId)?.name ?? "-";
  }

  const statsLoading = authLoading || membersLoading;
  const attendanceLoading = todayLoading || weekLoading;

  const greeting = getGreeting();
  const displayName = member?.name || "사용자";
  const todayFormatted = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting}, {displayName}님
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{todayFormatted}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="전체 구성원"
          value={`${activeMembers.length}명`}
          icon={Users}
          description="활성 구성원 수"
          loading={statsLoading}
        />
        <StatCard
          title="오늘 출근"
          value={`${todayPresentCount} / ${activeMembers.length}`}
          icon={Clock}
          description="출근 현황"
          loading={statsLoading || attendanceLoading}
        />
        <StatCard
          title="주 52시간 임박"
          value={`${warningCount}명`}
          icon={AlertTriangle}
          description="이번 주 기준"
          loading={statsLoading || attendanceLoading}
        />
        <StatCard
          title="대기 결재"
          value={`${pendingDocs.length}건`}
          icon={CheckSquare}
          description="처리 대기 중"
          loading={statsLoading || workflowsLoading}
        />
      </div>

      {/* Bottom Widgets */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* TASK-026: Overtime Monitoring Widget */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">52시간 모니터링</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/attendance/overtime">
                전체 보기
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {attendanceLoading || membersLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : top5AtRisk.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                이번 주 근무 기록이 없습니다
              </div>
            ) : (
              <div className="space-y-4">
                {top5AtRisk.map((mw) => {
                  const pct = Math.min(
                    100,
                    Math.round(
                      (mw.totalWorkMinutes / MAX_WEEKLY_MINUTES) * 100
                    )
                  );
                  const colors =
                    WARNING_COLORS[mw.warningLevel] ?? WARNING_COLORS.safe;
                  const deptName = mw.departmentId
                    ? deptMap.get(mw.departmentId)
                    : null;

                  return (
                    <div key={mw.memberId} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {mw.name}
                          </span>
                          {deptName && (
                            <span className="text-xs text-muted-foreground">
                              {deptName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {formatHoursMinutes(mw.totalWorkMinutes)} / 52h
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${colors.badge}`}
                          >
                            {colors.badgeLabel}
                          </Badge>
                        </div>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all ${colors.bar}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Approvals Widget */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">최근 결재 요청</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/workflows">
                전체 보기
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {workflowsLoading || membersLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                ))}
              </div>
            ) : recentPending.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                대기 중인 결재가 없습니다
              </div>
            ) : (
              <div className="space-y-3">
                {recentPending.map((d) => (
                  <Link
                    key={d.id}
                    href={`/workflows/${d.id}`}
                    className="block rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{d.title}</span>
                      <Badge className="bg-[#FEF3C7] text-[#F59E0B] border-0 text-xs">
                        대기중
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{getMemberName(d.submittedBy)}</span>
                      <span>·</span>
                      <span>
                        {d.createdAt?.toDate
                          ? d.createdAt.toDate().toLocaleDateString("ko-KR")
                          : "-"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "좋은 아침이에요";
  if (hour < 18) return "좋은 오후에요";
  return "좋은 저녁이에요";
}
