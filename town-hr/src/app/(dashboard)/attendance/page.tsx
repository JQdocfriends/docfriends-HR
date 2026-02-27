"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, CalendarDays, FileText, Settings } from "lucide-react";
import { useAuthContext } from "@/contexts/auth-context";
import { useTodayRecord, clockIn, clockOut } from "@/hooks/use-attendance";
import { useLeaveBalances } from "@/hooks/use-leave";
import { useCompany } from "@/contexts/company-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function AttendancePage() {
  const { member, role } = useAuthContext();
  const { company } = useCompany();
  const { record, loading: recordLoading } = useTodayRecord(member?.id ?? "");
  const { balances, loading: balanceLoading } = useLeaveBalances(
    member?.id ?? ""
  );
  const [clocking, setClocking] = useState(false);

  const canManage = role === "admin" || role === "manager";
  const lunchBreakMinutes = company?.workPolicy?.lunchBreakMinutes ?? 60;

  async function handleClockIn() {
    if (!member) return;
    setClocking(true);
    try {
      await clockIn(member.id);
      toast.success("출근 처리되었습니다.");
    } catch (error) {
      console.error("Clock in error:", error);
      toast.error("출근 처리에 실패했습니다.");
    } finally {
      setClocking(false);
    }
  }

  async function handleClockOut() {
    if (!member) return;
    setClocking(true);
    try {
      await clockOut(member.id, lunchBreakMinutes);
      toast.success("퇴근 처리되었습니다.");
    } catch (error) {
      console.error("Clock out error:", error);
      toast.error("퇴근 처리에 실패했습니다.");
    } finally {
      setClocking(false);
    }
  }

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const checkInTime = record?.checkInTime
    ? new Date(record.checkInTime.toMillis()).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const checkOutTime = record?.checkOutTime
    ? new Date(record.checkOutTime.toMillis()).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const annualBalance = balances.find((b) => {
    return true; // Show first balance; will be filtered by policy later
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">근무</h1>
          <p className="mt-1 text-sm text-muted-foreground">{today}</p>
        </div>
        {canManage && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/attendance/settings">
              <Settings className="mr-1 h-4 w-4" />
              근무정책 설정
            </Link>
          </Button>
        )}
      </div>

      {/* Clock In/Out Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5 text-primary" />
            오늘의 출퇴근
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recordLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-8">
                <div>
                  <div className="text-xs text-muted-foreground">출근</div>
                  <div className="mt-1 text-2xl font-semibold">
                    {checkInTime ?? "--:--"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">퇴근</div>
                  <div className="mt-1 text-2xl font-semibold">
                    {checkOutTime ?? "--:--"}
                  </div>
                </div>
                {record?.workMinutes != null && (
                  <div>
                    <div className="text-xs text-muted-foreground">
                      근무시간
                    </div>
                    <div className="mt-1 text-2xl font-semibold">
                      {Math.floor(record.workMinutes / 60)}시간{" "}
                      {record.workMinutes % 60}분
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {!record ? (
                  <Button onClick={handleClockIn} disabled={clocking}>
                    {clocking ? "처리 중..." : "출근하기"}
                  </Button>
                ) : !record.checkOutTime ? (
                  <Button
                    onClick={handleClockOut}
                    disabled={clocking}
                    variant="secondary"
                  >
                    {clocking ? "처리 중..." : "퇴근하기"}
                  </Button>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    오늘 근무가 완료되었습니다
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/attendance/records">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardContent className="flex items-center gap-3 py-4">
              <CalendarDays className="h-5 w-5 text-primary" />
              <div>
                <div className="text-sm font-medium">근태 기록</div>
                <div className="text-xs text-muted-foreground">
                  출퇴근 이력 조회
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/attendance/leave">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardContent className="flex items-center gap-3 py-4">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <div className="text-sm font-medium">휴가 관리</div>
                <div className="text-xs text-muted-foreground">
                  {balanceLoading
                    ? "..."
                    : `잔여 ${annualBalance?.remaining ?? 0}일`}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/attendance/leave/request">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardContent className="flex items-center gap-3 py-4">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">휴가 신청</div>
                <div className="text-xs text-muted-foreground">
                  새 휴가 신청하기
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
