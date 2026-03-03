"use client";

import { useRef } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  percentToMinutes,
  snapToGrid,
  formatMinutesAsHHMM,
  TIMELINE_START_HOUR,
  TIMELINE_END_HOUR,
} from "@/lib/utils/timeline";
import { Button } from "@/components/ui/button";
import { TimelineBlock } from "./timeline-block";
import { CurrentTimeIndicator } from "./current-time-indicator";
import type { AttendanceRecord } from "@/types";

interface WeekDay {
  date: Date;
  dateStr: string;
  dayLabel: string;
  dayNumber: number;
  isToday: boolean;
  isWeekend: boolean;
}

interface TimelineRowProps {
  day: WeekDay;
  records: AttendanceRecord[];
  onCreateRecord: (date: string, startMin: number, endMin: number) => void;
  onUpdateRecord: (id: string, date: string, startMin: number, endMin: number) => void;
  onDeleteRecord: (id: string) => void;
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  lunchStartMin: number;
  lunchBreakMinutes: number;
  onAddClick?: (date: string) => void;
}

export function TimelineRow({
  day,
  records,
  onCreateRecord,
  onUpdateRecord,
  onDeleteRecord,
  selectedBlockId,
  onSelectBlock,
  lunchStartMin,
  lunchBreakMinutes,
  onAddClick,
}: TimelineRowProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    dragging: boolean;
    startX: number;
    startPercent: number;
    ghostEl: HTMLDivElement | null;
  } | null>(null);

  const totalWorkMinutes = records.reduce((sum, r) => sum + (r.workMinutes ?? 0), 0);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only initiate drag on direct track clicks (not on blocks)
    if ((e.target as HTMLElement).closest("[data-block]")) return;
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const startPercent = ((e.clientX - rect.left) / rect.width) * 100;

    const ghost = document.createElement("div");
    ghost.className =
      "absolute top-1 bottom-1 bg-teal-200/50 border border-teal-400 rounded pointer-events-none z-30";
    ghost.style.left = `${startPercent}%`;
    ghost.style.width = "0%";
    track.appendChild(ghost);

    dragState.current = { dragging: true, startX: e.clientX, startPercent, ghostEl: ghost };
    track.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current?.dragging || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const currentPercent = Math.min(
      100,
      Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)
    );
    const { startPercent, ghostEl } = dragState.current;
    const left = Math.min(startPercent, currentPercent);
    const width = Math.abs(currentPercent - startPercent);
    if (ghostEl) {
      ghostEl.style.left = `${left}%`;
      ghostEl.style.width = `${width}%`;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current?.dragging || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const endPercent = Math.min(
      100,
      Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)
    );
    const { startPercent, ghostEl } = dragState.current;
    dragState.current = null;

    if (ghostEl) ghostEl.remove();

    const rawStartMin = percentToMinutes(Math.min(startPercent, endPercent));
    const rawEndMin = percentToMinutes(Math.max(startPercent, endPercent));
    const startMin = snapToGrid(rawStartMin, 15);
    const endMin = snapToGrid(rawEndMin, 15);

    if (endMin - startMin < 15) return;
    onCreateRecord(day.dateStr, startMin, endMin);
  };

  return (
    <div className={cn("flex border-b border-border last:border-b-0", day.isToday && "bg-teal-50/40 dark:bg-teal-950/20")} style={{ minHeight: "64px" }}>
      {/* Left info section */}
      <div className="flex items-center gap-2 px-3 flex-shrink-0 w-[120px]">
        <div className="flex flex-col items-center">
          <div
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
              day.isToday
                ? "bg-red-500 text-white"
                : day.isWeekend
                ? "text-red-500"
                : "text-foreground"
            )}
          >
            {day.dayNumber}
          </div>
          <span
            className={cn(
              "text-[10px]",
              day.isWeekend ? "text-red-500" : "text-muted-foreground"
            )}
          >
            {day.dayLabel}
          </span>
        </div>
        <div className="flex flex-col items-start">
          <span className="text-xs font-medium text-foreground">
            {totalWorkMinutes > 0 ? formatMinutesAsHHMM(totalWorkMinutes) : "-"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => onAddClick?.(day.dateStr)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Timeline track */}
      <div className="flex-1 relative min-h-[48px]">
        <div
          ref={trackRef}
          className="absolute inset-0 cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={() => onSelectBlock(null)}
        >
          {records.map((record) => (
            <div key={record.id} data-block="true" className="contents">
              <TimelineBlock
                record={record}
                lunchStartMin={lunchStartMin}
                lunchBreakMinutes={lunchBreakMinutes}
                isSelected={selectedBlockId === record.id}
                onSelect={() => onSelectBlock(record.id)}
                onUpdate={(startMin, endMin) => onUpdateRecord(record.id, day.dateStr, startMin, endMin)}
                onDelete={() => onDeleteRecord(record.id)}
              />
            </div>
          ))}
          <CurrentTimeIndicator show={day.isToday} />
        </div>
      </div>
    </div>
  );
}
