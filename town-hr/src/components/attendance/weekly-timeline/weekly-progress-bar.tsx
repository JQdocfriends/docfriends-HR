"use client";

import { cn } from "@/lib/utils";
import { formatMinutesAsHHMM } from "@/lib/utils/timeline";

interface WeeklyProgressBarProps {
  totalWorkMinutes: number;
  weeklyLimitMinutes?: number;
}

export function WeeklyProgressBar({
  totalWorkMinutes,
  weeklyLimitMinutes = 3120,
}: WeeklyProgressBarProps) {
  const isOver = totalWorkMinutes > weeklyLimitMinutes;
  const fillPercent = Math.min((totalWorkMinutes / weeklyLimitMinutes) * 100, 100);
  const diffMinutes = Math.abs(totalWorkMinutes - weeklyLimitMinutes);

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{formatMinutesAsHHMM(totalWorkMinutes)}</span>
        <span className={cn("text-muted-foreground", isOver && "text-red-500 font-medium")}>
          {isOver
            ? `+${formatMinutesAsHHMM(diffMinutes)} 초과`
            : `-${formatMinutesAsHHMM(diffMinutes)} 남음`}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isOver ? "bg-red-500" : "bg-teal-500"
          )}
          style={{ width: `${fillPercent}%` }}
        />
      </div>
    </div>
  );
}
