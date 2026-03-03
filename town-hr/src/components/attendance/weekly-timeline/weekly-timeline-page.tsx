"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useAuthContext } from "@/contexts/auth-context";
import { useWeeklyTimeline } from "@/hooks/use-weekly-timeline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WeekNavigator } from "./week-navigator";
import { WeeklyProgressBar } from "./weekly-progress-bar";
import { TimelineGrid } from "./timeline-grid";
import { AddWorkDialog } from "./add-work-dialog";
import { TeamTimelineView } from "./team-timeline-view";

export function WeeklyTimelinePage() {
  const { member } = useAuthContext();
  const memberId = member?.id ?? "";

  const {
    records,
    recordsByDate,
    weekDays,
    weekLabel,
    weekStart,
    weekEnd,
    summary,
    loading,
    goToPrevWeek,
    goToNextWeek,
    goToToday,
    createRecord,
    updateRecord,
    deleteRecord,
    lunchStartMin,
    lunchBreakMinutes,
  } = useWeeklyTimeline(memberId);

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDate, setDialogDate] = useState<string>("");

  function handleAddClick(date: string) {
    setDialogDate(date);
    setDialogOpen(true);
  }

  function handleAddToday() {
    const today = new Date().toISOString().split("T")[0];
    setDialogDate(today);
    setDialogOpen(true);
  }

  const weeklyLimitMinutes = 3120; // 52 hours default

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">근무</h1>
        <Button size="sm" onClick={handleAddToday}>
          <Plus className="mr-1 h-4 w-4" />
          추가하기
        </Button>
      </div>

      <Tabs defaultValue="my">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="my">내 근무</TabsTrigger>
            <TabsTrigger value="team">구성원 근무</TabsTrigger>
          </TabsList>
          <WeekNavigator
            weekLabel={weekLabel}
            onPrev={goToPrevWeek}
            onNext={goToNextWeek}
            onToday={goToToday}
          />
        </div>

        <TabsContent value="my" className="mt-4 space-y-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-[400px] w-full" />
            </div>
          ) : (
            <>
              <WeeklyProgressBar
                totalWorkMinutes={summary?.totalWorkMinutes ?? 0}
                weeklyLimitMinutes={weeklyLimitMinutes}
              />
              <div className="rounded-md border border-border bg-card overflow-hidden">
                <TimelineGrid
                  weekDays={weekDays}
                  recordsByDate={recordsByDate}
                  onCreateRecord={createRecord}
                  onUpdateRecord={(id, date, startMin, endMin) =>
                    updateRecord(id, date, startMin, endMin)
                  }
                  onDeleteRecord={deleteRecord}
                  selectedBlockId={selectedBlockId}
                  onSelectBlock={setSelectedBlockId}
                  lunchStartMin={lunchStartMin}
                  lunchBreakMinutes={lunchBreakMinutes}
                  onAddClick={handleAddClick}
                />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <div className="rounded-md border border-border bg-card overflow-hidden">
            <TeamTimelineView
              weekStart={weekStart}
              weekEnd={weekEnd}
              weekDays={weekDays}
            />
          </div>
        </TabsContent>
      </Tabs>

      <AddWorkDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        date={dialogDate}
        onSubmit={(startMin, endMin) => createRecord(dialogDate, startMin, endMin)}
      />
    </div>
  );
}
