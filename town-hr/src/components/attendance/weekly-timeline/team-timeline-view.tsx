"use client";

import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMembers } from "@/hooks/use-members";
import { useAttendanceRecords } from "@/hooks/use-attendance";
import {
  minutesToPercent,
  timestampToMinutes,
  formatMinutesAsHHMM,
  TIMELINE_START_HOUR,
  TIMELINE_END_HOUR,
} from "@/lib/utils/timeline";
import type { AttendanceRecord } from "@/types";

interface WeekDay {
  date: Date;
  dateStr: string;
  dayLabel: string;
  dayNumber: number;
  isToday: boolean;
  isWeekend: boolean;
}

interface TeamTimelineViewProps {
  weekStart: string;
  weekEnd: string;
  weekDays: WeekDay[];
}

function MemberRow({
  name,
  avatarUrl,
  records,
}: {
  name: string;
  avatarUrl: string | null;
  records: AttendanceRecord[];
}) {
  const totalMinutes = records.reduce((sum, r) => sum + (r.workMinutes ?? 0), 0);
  const initials = name.slice(0, 2);

  return (
    <div className="flex items-center border-b border-border last:border-b-0 min-h-[52px]">
      {/* Member info */}
      <div className="flex items-center gap-2 flex-shrink-0 w-[140px] px-3">
        <Avatar className="h-7 w-7">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <span className="text-xs font-medium truncate">{name}</span>
      </div>

      {/* Timeline track (read-only) */}
      <div className="flex-1 relative h-[52px]">
        {records.map((record) => {
          const checkInMin = record.checkInTime ? timestampToMinutes(record.checkInTime) : null;
          const checkOutMin = record.checkOutTime ? timestampToMinutes(record.checkOutTime) : null;
          if (checkInMin === null || checkOutMin === null) return null;
          const leftPercent = minutesToPercent(checkInMin);
          const widthPercent = minutesToPercent(checkOutMin) - leftPercent;
          return (
            <div
              key={record.id}
              className="absolute top-2 bottom-2 rounded bg-teal-100 dark:bg-teal-900 border border-teal-300"
              style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
            />
          );
        })}
      </div>

      {/* Total */}
      <div className="flex-shrink-0 w-[60px] px-2 text-right">
        <span className="text-xs text-muted-foreground">
          {totalMinutes > 0 ? formatMinutesAsHHMM(totalMinutes) : "-"}
        </span>
      </div>
    </div>
  );
}

export function TeamTimelineView({ weekStart, weekEnd, weekDays }: TeamTimelineViewProps) {
  const { members, loading: membersLoading } = useMembers();
  const { records, loading: recordsLoading } = useAttendanceRecords(undefined, {
    start: weekStart,
    end: weekEnd,
  });

  const recordsByMember = useMemo(() => {
    const map: Record<string, AttendanceRecord[]> = {};
    for (const record of records) {
      if (!map[record.memberId]) map[record.memberId] = [];
      map[record.memberId].push(record);
    }
    return map;
  }, [records]);

  const totalHours = TIMELINE_END_HOUR - TIMELINE_START_HOUR;

  if (membersLoading || recordsLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">불러오는 중...</div>;
  }

  return (
    <div className="w-full overflow-x-auto">
      <div style={{ minWidth: "900px" }}>
        {/* Hour header */}
        <div className="flex border-b border-border">
          <div className="flex-shrink-0 w-[140px]" />
          <div className="flex-1 relative h-7">
            {Array.from({ length: totalHours }).map((_, i) => {
              const hour = TIMELINE_START_HOUR + i;
              const leftPercent = minutesToPercent(hour * 60);
              return (
                <div
                  key={hour}
                  className="absolute top-0 bottom-0 flex items-center"
                  style={{ left: `${leftPercent}%` }}
                >
                  <div className="absolute top-0 bottom-0 border-l border-border/40" />
                  <span className="text-[10px] text-muted-foreground pl-1 select-none">
                    {hour === 12 ? "정오" : hour > 12 ? hour - 12 : hour}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex-shrink-0 w-[60px]" />
        </div>

        {/* Member rows */}
        {members.map((member) => (
          <MemberRow
            key={member.id}
            name={member.name}
            avatarUrl={member.profileImageUrl}
            records={recordsByMember[member.id] ?? []}
          />
        ))}

        {members.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">구성원이 없습니다.</div>
        )}
      </div>
    </div>
  );
}
