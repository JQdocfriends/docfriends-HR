"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  LogIn,
  LogOut,
} from "lucide-react";
import { useAuthContext } from "@/contexts/auth-context";
import { useAttendanceRecords } from "@/hooks/use-attendance";
import { useMembers } from "@/hooks/use-members";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  isKoreanHoliday,
  getHolidayName,
} from "@/constants/korean-holidays";
import type { AttendanceRecord, AttendanceStatus } from "@/types";
import type { Timestamp } from "firebase/firestore";

// ---- constants ----

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; dotClass: string; bgClass: string }
> = {
  present: {
    label: "출근",
    dotClass: "bg-blue-500",
    bgClass: "bg-blue-50 hover:bg-blue-100",
  },
  on_leave: {
    label: "휴가",
    dotClass: "bg-emerald-500",
    bgClass: "bg-emerald-50 hover:bg-emerald-100",
  },
  holiday: {
    label: "휴일",
    dotClass: "bg-red-500",
    bgClass: "bg-red-50 hover:bg-red-100",
  },
  absent: {
    label: "결근",
    dotClass: "bg-gray-400",
    bgClass: "bg-gray-50 hover:bg-gray-100",
  },
  half_day: {
    label: "반차",
    dotClass: "bg-yellow-500",
    bgClass: "bg-yellow-50 hover:bg-yellow-100",
  },
};

// ---- helpers ----

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

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ---- component ----

export default function AttendanceCalendarPage() {
  const { member, role } = useAuthContext();
  const { members } = useMembers();
  const canViewAll = role === "admin" || role === "manager";

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    canViewAll ? "all" : member?.id ?? ""
  );

  // Date range for the displayed month
  const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthEnd = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  const { records, loading } = useAttendanceRecords(
    selectedMemberId === "all" ? undefined : selectedMemberId,
    { start: monthStart, end: monthEnd }
  );

  // Build a map: dateKey -> AttendanceRecord[]
  const recordsByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord[]>();
    for (const rec of records) {
      const existing = map.get(rec.date) ?? [];
      existing.push(rec);
      map.set(rec.date, existing);
    }
    return map;
  }, [records]);

  // Calendar grid data
  const calendarDays = useMemo(() => {
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun
    const days: Array<{
      day: number | null;
      dateKey: string | null;
      isToday: boolean;
      isHoliday: boolean;
      holidayName: string | null;
      isWeekend: boolean;
      records: AttendanceRecord[];
      primaryStatus: AttendanceStatus | null;
    }> = [];

    // Leading empty cells
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({
        day: null,
        dateKey: null,
        isToday: false,
        isHoliday: false,
        holidayName: null,
        isWeekend: false,
        records: [],
        primaryStatus: null,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dateKey = formatDateKey(year, month, d);
      const dayOfWeek = dateObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = isKoreanHoliday(dateObj);
      const holidayName = getHolidayName(dateObj);
      const dayRecords = recordsByDate.get(dateKey) ?? [];

      const isToday =
        dateObj.getFullYear() === today.getFullYear() &&
        dateObj.getMonth() === today.getMonth() &&
        dateObj.getDate() === today.getDate();

      // Determine primary status
      let primaryStatus: AttendanceStatus | null = null;
      if (isHoliday || isWeekend) {
        primaryStatus = "holiday";
      }
      if (dayRecords.length > 0) {
        // Use first record's status (or most relevant)
        primaryStatus = dayRecords[0].status;
      }

      days.push({
        day: d,
        dateKey,
        isToday,
        isHoliday,
        holidayName,
        isWeekend,
        records: dayRecords,
        primaryStatus,
      });
    }

    return days;
  }, [year, month, daysInMonth, recordsByDate, today]);

  // Navigation
  function goMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }

  const monthLabel = `${year}년 ${month + 1}월`;

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
        <h1 className="text-2xl font-bold tracking-tight">근무 캘린더</h1>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Month Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => goMonth(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[120px] text-center text-sm font-medium">
                {monthLabel}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => goMonth(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={goToday}>
                이번 달
              </Button>
            </div>

            {/* Member Selector (admin/manager) */}
            {canViewAll && (
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
            )}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {(Object.entries(STATUS_CONFIG) as [AttendanceStatus, (typeof STATUS_CONFIG)[AttendanceStatus]][]).map(
          ([status, config]) => (
            <div key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${config.dotClass}`} />
              {config.label}
            </div>
          )
        )}
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <Skeleton className="h-[480px] w-full" />
      ) : (
        <Card>
          <CardContent className="p-2 sm:p-4">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-px">
              {DAY_LABELS.map((label, i) => (
                <div
                  key={label}
                  className={`py-2 text-center text-xs font-medium ${
                    i === 0
                      ? "text-red-500"
                      : i === 6
                        ? "text-blue-500"
                        : "text-muted-foreground"
                  }`}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Day Cells */}
            <div className="grid grid-cols-7 gap-px">
              {calendarDays.map((cell, idx) => {
                if (cell.day === null) {
                  return <div key={`empty-${idx}`} className="min-h-[80px]" />;
                }

                const statusConfig = cell.primaryStatus
                  ? STATUS_CONFIG[cell.primaryStatus]
                  : null;
                const dayOfWeek = new Date(year, month, cell.day).getDay();

                return (
                  <Popover key={cell.dateKey}>
                    <PopoverTrigger asChild>
                      <button
                        className={`min-h-[80px] w-full rounded-md border p-1.5 text-left transition-colors ${
                          cell.isToday
                            ? "border-blue-500 ring-1 ring-blue-500"
                            : "border-transparent"
                        } ${
                          statusConfig
                            ? statusConfig.bgClass
                            : "hover:bg-accent"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span
                            className={`text-xs font-medium ${
                              cell.isHoliday || dayOfWeek === 0
                                ? "text-red-500"
                                : dayOfWeek === 6
                                  ? "text-blue-500"
                                  : ""
                            }`}
                          >
                            {cell.day}
                          </span>
                          {statusConfig && (
                            <span
                              className={`inline-block h-2 w-2 rounded-full ${statusConfig.dotClass}`}
                            />
                          )}
                        </div>
                        {cell.holidayName && (
                          <p className="mt-0.5 truncate text-[10px] text-red-500">
                            {cell.holidayName}
                          </p>
                        )}
                        {cell.records.length > 0 && selectedMemberId !== "all" && (
                          <p className="mt-1 truncate text-[10px] text-muted-foreground">
                            {formatMinutes(cell.records[0].workMinutes)}
                          </p>
                        )}
                        {cell.records.length > 0 && selectedMemberId === "all" && (
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {cell.records.length}명
                          </p>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72" align="start">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold">
                            {cell.dateKey}
                          </h4>
                          {cell.holidayName && (
                            <Badge variant="outline" className="text-xs text-red-500 border-red-200">
                              {cell.holidayName}
                            </Badge>
                          )}
                        </div>

                        {cell.records.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            {cell.isHoliday || cell.isWeekend
                              ? "휴일"
                              : "근태 기록 없음"}
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {cell.records.map((rec) => {
                              const recStatus = STATUS_CONFIG[rec.status];
                              const memberName =
                                selectedMemberId === "all"
                                  ? members.find((m) => m.id === rec.memberId)?.name
                                  : undefined;

                              return (
                                <div
                                  key={rec.id}
                                  className="rounded-md border p-2 text-xs"
                                >
                                  {memberName && (
                                    <p className="mb-1 font-medium">
                                      {memberName}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span
                                      className={`inline-block h-2 w-2 rounded-full ${recStatus.dotClass}`}
                                    />
                                    <span>{recStatus.label}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <LogIn className="h-3 w-3" />
                                      {formatTime(rec.checkInTime)}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <LogOut className="h-3 w-3" />
                                      {formatTime(rec.checkOutTime)}
                                    </div>
                                    <div className="col-span-2 flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {formatMinutes(rec.workMinutes)}
                                      {rec.overtimeMinutes > 0 && (
                                        <span className="text-red-500">
                                          (+{formatMinutes(rec.overtimeMinutes)})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
