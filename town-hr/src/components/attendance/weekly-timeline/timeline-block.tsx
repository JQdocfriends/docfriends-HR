"use client";

import { useEffect, useRef } from "react";
import { Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  minutesToPercent,
  percentToMinutes,
  snapToGrid,
  timestampToMinutes,
  getBreakPosition,
  formatTimeLabel,
  TIMELINE_START_HOUR,
  TIMELINE_END_HOUR,
} from "@/lib/utils/timeline";
import type { AttendanceRecord } from "@/types";

interface TimelineBlockProps {
  record: AttendanceRecord;
  lunchStartMin: number;
  lunchBreakMinutes: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (startMin: number, endMin: number) => void;
  onDelete: () => void;
}

export function TimelineBlock({
  record,
  lunchStartMin,
  lunchBreakMinutes,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
}: TimelineBlockProps) {
  const blockRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    dragging: boolean;
    side: "left" | "right";
    startX: number;
    startMin: number;
    containerWidth: number;
    currentStart: number;
    currentEnd: number;
  } | null>(null);

  const checkInMin = record.checkInTime ? timestampToMinutes(record.checkInTime) : null;
  const checkOutMin = record.checkOutTime ? timestampToMinutes(record.checkOutTime) : null;

  const startHourMin = TIMELINE_START_HOUR * 60;
  const endHourMin = TIMELINE_END_HOUR * 60;

  if (checkInMin === null || checkOutMin === null) return null;

  const leftPercent = minutesToPercent(checkInMin);
  const rightPercent = minutesToPercent(checkOutMin);
  const widthPercent = rightPercent - leftPercent;

  const breakPos = getBreakPosition(checkInMin, checkOutMin, lunchStartMin, lunchBreakMinutes);

  useEffect(() => {
    if (!isSelected) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        onDelete();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSelected, onDelete]);

  const handleResizePointerDown = (e: React.PointerEvent, side: "left" | "right") => {
    e.stopPropagation();
    e.preventDefault();
    const container = blockRef.current?.parentElement;
    if (!container) return;
    const containerWidth = container.getBoundingClientRect().width;
    dragState.current = {
      dragging: true,
      side,
      startX: e.clientX,
      startMin: side === "left" ? checkInMin : checkOutMin,
      containerWidth,
      currentStart: checkInMin,
      currentEnd: checkOutMin,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizePointerMove = (e: React.PointerEvent) => {
    if (!dragState.current?.dragging || !blockRef.current) return;
    const { side, currentStart, currentEnd } = dragState.current;
    const container = blockRef.current.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const currentPercent = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const newMin = snapToGrid(percentToMinutes(currentPercent), 15);

    const minBlockMin = 15;

    if (side === "left") {
      const maxStart = currentEnd - minBlockMin;
      const clampedStart = Math.max(startHourMin, Math.min(newMin, maxStart));
      dragState.current.currentStart = clampedStart;
      const newLeft = minutesToPercent(clampedStart);
      const newWidth = minutesToPercent(currentEnd) - newLeft;
      blockRef.current.style.left = `${newLeft}%`;
      blockRef.current.style.width = `${newWidth}%`;
    } else {
      const minEnd = currentStart + minBlockMin;
      const clampedEnd = Math.min(endHourMin, Math.max(newMin, minEnd));
      dragState.current.currentEnd = clampedEnd;
      const newWidth = minutesToPercent(clampedEnd) - minutesToPercent(currentStart);
      blockRef.current.style.width = `${newWidth}%`;
    }
  };

  const handleResizePointerUp = () => {
    if (!dragState.current?.dragging) return;
    const { currentStart, currentEnd } = dragState.current;
    dragState.current = null;
    onUpdate(currentStart, currentEnd);
  };

  const blockContent = breakPos?.hasBreak ? (
    <div className="flex h-full w-full">
      <div
        className="bg-teal-100 dark:bg-teal-900 h-full flex-shrink-0"
        style={{ width: `${breakPos.beforeBreakWidth}%` }}
      />
      <div
        className="bg-transparent h-full flex-shrink-0"
        style={{ width: `${breakPos.breakWidth}%` }}
      />
      <div
        className="bg-teal-100 dark:bg-teal-900 h-full flex-shrink-0"
        style={{ width: `${breakPos.afterBreakWidth}%` }}
      />
    </div>
  ) : (
    <div className="bg-teal-100 dark:bg-teal-900 h-full w-full" />
  );

  return (
    <div
      ref={blockRef}
      className={cn(
        "absolute top-1 bottom-1 rounded border border-teal-300 overflow-hidden cursor-pointer select-none",
        isSelected && "ring-2 ring-teal-500 z-20"
      )}
      style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerMove={handleResizePointerMove}
      onPointerUp={handleResizePointerUp}
    >
      {blockContent}

      {/* Icons and labels overlaid */}
      <div className="absolute inset-0 flex items-center pointer-events-none px-1 gap-1">
        <Briefcase className="h-3 w-3 text-teal-600 dark:text-teal-300 flex-shrink-0" />
        <span className="text-[10px] text-teal-700 dark:text-teal-300 truncate">
          {formatTimeLabel(checkInMin)}
        </span>
      </div>
      <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none">
        <span className="text-[10px] text-teal-700 dark:text-teal-300">
          {formatTimeLabel(checkOutMin)}
        </span>
      </div>

      {/* Left resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize opacity-0 hover:opacity-100 bg-teal-400 z-10"
        onPointerDown={(e) => handleResizePointerDown(e, "left")}
      />
      {/* Right resize handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize opacity-0 hover:opacity-100 bg-teal-400 z-10"
        onPointerDown={(e) => handleResizePointerDown(e, "right")}
      />
    </div>
  );
}
