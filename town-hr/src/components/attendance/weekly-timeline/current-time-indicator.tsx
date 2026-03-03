"use client";

import { useEffect, useState } from "react";
import { minutesToPercent, formatTimeLabel, TIMELINE_START_HOUR, TIMELINE_END_HOUR } from "@/lib/utils/timeline";

interface CurrentTimeIndicatorProps {
  show: boolean;
}

function getCurrentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function CurrentTimeIndicator({ show }: CurrentTimeIndicatorProps) {
  const [minutes, setMinutes] = useState(getCurrentMinutes);

  useEffect(() => {
    if (!show) return;
    const interval = setInterval(() => {
      setMinutes(getCurrentMinutes());
    }, 60_000);
    return () => clearInterval(interval);
  }, [show]);

  if (!show) return null;

  const startMin = TIMELINE_START_HOUR * 60;
  const endMin = TIMELINE_END_HOUR * 60;
  if (minutes < startMin || minutes > endMin) return null;

  const leftPercent = minutesToPercent(minutes);

  return (
    <div
      className="absolute top-0 bottom-0 z-10 pointer-events-none"
      style={{ left: `${leftPercent}%` }}
    >
      <div className="absolute top-0 bottom-0 border-l-2 border-red-500" />
      <div className="absolute top-full mt-0.5 -translate-x-1/2 whitespace-nowrap text-[10px] text-red-500 font-medium">
        {formatTimeLabel(minutes)}
      </div>
    </div>
  );
}
