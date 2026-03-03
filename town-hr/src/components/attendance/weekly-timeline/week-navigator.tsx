"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WeekNavigatorProps {
  weekLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function WeekNavigator({ weekLabel, onPrev, onNext, onToday }: WeekNavigatorProps) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" onClick={onPrev} aria-label="이전 주">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="font-medium text-sm min-w-[140px] text-center">{weekLabel}</span>
      <Button variant="ghost" size="icon" onClick={onNext} aria-label="다음 주">
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={onToday}>
        오늘
      </Button>
    </div>
  );
}
