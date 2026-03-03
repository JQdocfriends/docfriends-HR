"use client";

import { useState, useMemo, useCallback } from "react";
import type { AttendanceRecord } from "@/types";
import { useAttendanceRecords } from "@/hooks/use-attendance";
import { useCompany } from "@/contexts/company-context";
import { calculateWeeklyTotal } from "@/lib/utils/work-hours";
import {
  getWeekBounds,
  getWeekDays,
  formatWeekLabel,
  timestampToMinutes,
} from "@/lib/utils/timeline";
import {
  createAttendanceRecord,
  updateAttendanceRecord,
  deleteAttendanceRecord,
} from "@/lib/repositories/attendance-repository";
import type { Timestamp } from "firebase/firestore";

export function useWeeklyTimeline(memberId: string) {
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => new Date());

  const { weekStart, weekEnd } = useMemo(
    () => getWeekBounds(weekAnchor),
    [weekAnchor]
  );

  const weekStartDate = useMemo(() => new Date(weekStart + "T00:00:00"), [weekStart]);
  const weekEndDate = useMemo(() => new Date(weekEnd + "T00:00:00"), [weekEnd]);

  const weekDays = useMemo(() => getWeekDays(weekStartDate), [weekStartDate]);
  const weekLabel = useMemo(
    () => formatWeekLabel(weekStartDate, weekEndDate),
    [weekStartDate, weekEndDate]
  );

  const { records, loading, mutate } = useAttendanceRecords(memberId, {
    start: weekStart,
    end: weekEnd,
  });

  const { company } = useCompany();
  const workPolicy = company?.workPolicy;

  const lunchStartMin = useMemo(() => {
    if (!workPolicy?.lunchStartTime) return 12 * 60; // default noon
    const [h, m] = workPolicy.lunchStartTime.split(":").map(Number);
    return h * 60 + m;
  }, [workPolicy]);

  const lunchBreakMinutes = useMemo(
    () => workPolicy?.lunchBreakMinutes ?? 60,
    [workPolicy]
  );

  const recordsByDate = useMemo(() => {
    const map: Record<string, AttendanceRecord[]> = {};
    for (const record of records) {
      if (!map[record.date]) map[record.date] = [];
      map[record.date].push(record);
    }
    return map;
  }, [records]);

  const summary = useMemo(() => {
    const dailyMinutes = records.map((r) => r.workMinutes ?? 0);
    return calculateWeeklyTotal(dailyMinutes);
  }, [records]);

  const goToPrevWeek = useCallback(() => {
    setWeekAnchor((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }, []);

  const goToNextWeek = useCallback(() => {
    setWeekAnchor((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }, []);

  const goToToday = useCallback(() => {
    setWeekAnchor(new Date());
  }, []);

  const createRecord = useCallback(
    async (date: string, checkInMinutes: number, checkOutMinutes: number) => {
      await createAttendanceRecord(memberId, date, checkInMinutes, checkOutMinutes);
      await mutate();
    },
    [memberId, mutate]
  );

  const updateRecord = useCallback(
    async (
      recordId: string,
      date: string,
      checkInMinutes: number,
      checkOutMinutes: number
    ) => {
      await updateAttendanceRecord(recordId, memberId, date, checkInMinutes, checkOutMinutes);
      await mutate();
    },
    [memberId, mutate]
  );

  const deleteRecord = useCallback(
    async (recordId: string) => {
      await deleteAttendanceRecord(recordId, memberId);
      await mutate();
    },
    [memberId, mutate]
  );

  return {
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
  };
}
