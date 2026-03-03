"use client";

import { minutesToPercent, TIMELINE_START_HOUR, TIMELINE_END_HOUR } from "@/lib/utils/timeline";
import { TimelineRow } from "./timeline-row";
import type { AttendanceRecord } from "@/types";

interface WeekDay {
  date: Date;
  dateStr: string;
  dayLabel: string;
  dayNumber: number;
  isToday: boolean;
  isWeekend: boolean;
}

interface TimelineGridProps {
  weekDays: WeekDay[];
  recordsByDate: Record<string, AttendanceRecord[]>;
  onCreateRecord: (date: string, startMin: number, endMin: number) => void;
  onUpdateRecord: (id: string, date: string, startMin: number, endMin: number) => void;
  onDeleteRecord: (id: string) => void;
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  lunchStartMin: number;
  lunchBreakMinutes: number;
  onAddClick?: (date: string) => void;
}

const HOUR_LABELS: string[] = [
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11",
  "정오",
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11",
];

export function TimelineGrid({
  weekDays,
  recordsByDate,
  onCreateRecord,
  onUpdateRecord,
  onDeleteRecord,
  selectedBlockId,
  onSelectBlock,
  lunchStartMin,
  lunchBreakMinutes,
  onAddClick,
}: TimelineGridProps) {
  const totalHours = TIMELINE_END_HOUR - TIMELINE_START_HOUR; // 22 hours (1AM to 11PM)

  return (
    <div className="w-full overflow-x-auto">
      <div style={{ minWidth: "900px" }}>
        {/* Header row with hour labels */}
        <div className="flex border-b border-border">
          {/* Left spacer matching the info section width */}
          <div className="flex-shrink-0 w-[120px]" />
          {/* Hour labels track */}
          <div className="flex-1 relative h-8">
            {Array.from({ length: totalHours }).map((_, i) => {
              const hour = TIMELINE_START_HOUR + i; // 1 to 22
              const leftPercent = minutesToPercent(hour * 60);
              const label = HOUR_LABELS[i];
              return (
                <div
                  key={hour}
                  className="absolute top-0 bottom-0 flex flex-col"
                  style={{ left: `${leftPercent}%` }}
                >
                  {/* Vertical grid line (extends down into rows via border) */}
                  <div className="absolute top-0 bottom-0 border-l border-border/40" />
                  <span className="text-[10px] text-muted-foreground pl-1 leading-8 select-none">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Day rows */}
        <div className="relative">
          {/* Background vertical grid lines */}
          <div className="absolute inset-0 flex pointer-events-none" style={{ paddingLeft: "120px" }}>
            <div className="flex-1 relative">
              {Array.from({ length: totalHours }).map((_, i) => {
                const hour = TIMELINE_START_HOUR + i;
                const leftPercent = minutesToPercent(hour * 60);
                return (
                  <div
                    key={hour}
                    className="absolute top-0 bottom-0 border-l border-border/40"
                    style={{ left: `${leftPercent}%` }}
                  />
                );
              })}
            </div>
          </div>

          {weekDays.map((day) => (
            <TimelineRow
              key={day.dateStr}
              day={day}
              records={recordsByDate[day.dateStr] ?? []}
              onCreateRecord={onCreateRecord}
              onUpdateRecord={onUpdateRecord}
              onDeleteRecord={onDeleteRecord}
              selectedBlockId={selectedBlockId}
              onSelectBlock={onSelectBlock}
              lunchStartMin={lunchStartMin}
              lunchBreakMinutes={lunchBreakMinutes}
              onAddClick={onAddClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
