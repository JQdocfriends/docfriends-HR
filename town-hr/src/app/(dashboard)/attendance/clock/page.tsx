"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, LogIn, LogOut, CheckCircle2 } from "lucide-react";
import { useAuthContext } from "@/contexts/auth-context";
import {
  useTodayRecord,
  useAttendanceRecords,
  clockIn,
  clockOut,
} from "@/hooks/use-attendance";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import type { Timestamp } from "firebase/firestore";

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

function getWeekRange(): { start: string; end: string; days: string[] } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d.toISOString().split("T")[0]);
  }

  return {
    start: monday.toISOString().split("T")[0],
    end: sunday.toISOString().split("T")[0],
    days,
  };
}

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

export default function AttendanceClockPage() {
  const { member } = useAuthContext();
  const memberId = member?.id ?? "";
  const { record: todayRecord, loading: todayLoading } = useTodayRecord(memberId);

  const weekRange = getWeekRange();
  const { records: weekRecords, loading: weekLoading } = useAttendanceRecords(
    memberId,
    { start: weekRange.start, end: weekRange.end }
  );

  const [currentTime, setCurrentTime] = useState(new Date());
  const [acting, setActing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isClockedIn = todayRecord?.checkInTime != null;
  const isClockedOut = todayRecord?.checkOutTime != null;

  const handleClockIn = useCallback(async () => {
    if (!memberId) return;
    setActing(true);
    try {
      await clockIn(memberId);
      toast.success("출근이 기록되었습니다");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "출근 처리에 실패했습니다");
    } finally {
      setActing(false);
    }
  }, [memberId]);

  const handleClockOut = useCallback(async () => {
    if (!memberId) return;
    setActing(true);
    try {
      await clockOut(memberId);
      toast.success("퇴근이 기록되었습니다");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "퇴근 처리에 실패했습니다");
    } finally {
      setActing(false);
    }
  }, [memberId]);

  // Build a map of date -> workMinutes for the week
  const weekMap = new Map<string, number | null>();
  for (const rec of weekRecords) {
    weekMap.set(rec.date, rec.workMinutes);
  }

  const statusLabel = isClockedOut
    ? "퇴근"
    : isClockedIn
      ? "근무 중"
      : "미출근";

  const statusColor = isClockedOut
    ? "bg-[#F5F5F5] text-[#737373]"
    : isClockedIn
      ? "bg-[#DCFCE7] text-[#16A34A]"
      : "bg-[#FEF3C7] text-[#F59E0B]";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/attendance">
            <ArrowLeft className="mr-1 h-4 w-4" />
            뒤로
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">출퇴근</h1>
      </div>

      {/* Current time + clock action */}
      <Card>
        <CardContent className="flex flex-col items-center gap-6 py-10">
          {/* Real-time clock */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-5 w-5" />
            <span className="text-sm">
              {currentTime.toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "long",
              })}
            </span>
          </div>
          <div className="text-5xl font-bold tabular-nums tracking-tight">
            {currentTime.toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            })}
          </div>

          {/* Status badge */}
          {todayLoading ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <span
              className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusColor}`}
            >
              {statusLabel}
            </span>
          )}

          {/* Action button */}
          {todayLoading ? (
            <Skeleton className="h-14 w-48" />
          ) : !isClockedIn ? (
            <Button
              size="lg"
              className="h-14 w-48 text-lg"
              onClick={handleClockIn}
              disabled={acting}
            >
              <LogIn className="mr-2 h-5 w-5" />
              {acting ? "처리 중..." : "출근"}
            </Button>
          ) : !isClockedOut ? (
            <Button
              size="lg"
              variant="destructive"
              className="h-14 w-48 text-lg"
              onClick={handleClockOut}
              disabled={acting}
            >
              <LogOut className="mr-2 h-5 w-5" />
              {acting ? "처리 중..." : "퇴근"}
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 text-[#16A34A]" />
              <span className="text-sm font-medium">오늘 근무가 완료되었습니다</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's record */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">오늘의 근태</CardTitle>
        </CardHeader>
        <CardContent>
          {todayLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">출근 시간</p>
                <p className="mt-1 text-lg font-semibold">
                  {formatTime(todayRecord?.checkInTime ?? null)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">퇴근 시간</p>
                <p className="mt-1 text-lg font-semibold">
                  {formatTime(todayRecord?.checkOutTime ?? null)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">근무 시간</p>
                <p className="mt-1 text-lg font-semibold">
                  {formatMinutes(todayRecord?.workMinutes ?? null)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">이번 주 요약</CardTitle>
        </CardHeader>
        <CardContent>
          {weekLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {DAY_LABELS.map((label) => (
                      <TableHead key={label} className="text-center">
                        {label}
                      </TableHead>
                    ))}
                    <TableHead className="text-center">합계</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    {weekRange.days.map((day) => {
                      const minutes = weekMap.get(day);
                      const isToday = day === new Date().toISOString().split("T")[0];
                      return (
                        <TableCell
                          key={day}
                          className={`text-center text-sm ${isToday ? "font-bold" : ""}`}
                        >
                          {minutes != null
                            ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
                            : "-"}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center text-sm font-semibold">
                      {(() => {
                        const total = weekRecords.reduce(
                          (sum, r) => sum + (r.workMinutes ?? 0),
                          0
                        );
                        return `${Math.floor(total / 60)}h ${total % 60}m`;
                      })()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
