"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import type { AttendanceRecord } from "@/types";
import {
  fetchAttendanceRecords,
  subscribeTodayRecord,
  clockIn,
  clockOut,
} from "@/lib/repositories/attendance-repository";

export { clockIn, clockOut };

export function useAttendanceRecords(memberId?: string, dateRange?: { start: string; end: string }) {
  const key = dateRange
    ? `attendance/${memberId ?? "all"}/${dateRange.start}/${dateRange.end}`
    : `attendance/${memberId ?? "all"}`;

  const { data, isLoading, mutate } = useSWR(
    key,
    () => fetchAttendanceRecords(memberId, dateRange)
  );

  return { records: data ?? [], loading: isLoading, mutate };
}

// Keep onSnapshot for real-time today record (clock-in/out live updates)
export function useTodayRecord(memberId: string) {
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!memberId) {
      setLoading(false);
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const unsubscribe = subscribeTodayRecord(
      memberId,
      today,
      (data) => {
        setRecord(data);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return unsubscribe;
  }, [memberId]);

  return { record, loading };
}
