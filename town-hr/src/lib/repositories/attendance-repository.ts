import {
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  type QueryConstraint,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { attendanceRecordsRef } from "@/lib/firebase/collections";
import { fetchCollection } from "@/lib/firebase/swr";
import type { AttendanceRecord } from "@/types";

export async function fetchAttendanceRecords(
  memberId?: string,
  dateRange?: { start: string; end: string }
): Promise<AttendanceRecord[]> {
  return fetchCollection<AttendanceRecord>(getAttendanceRecordsQuery(memberId, dateRange));
}

export function getAttendanceRecordsQuery(
  memberId?: string,
  dateRange?: { start: string; end: string }
) {
  const constraints: QueryConstraint[] = [];
  if (memberId) {
    constraints.push(where("memberId", "==", memberId));
  }
  if (dateRange) {
    constraints.push(where("date", ">=", dateRange.start));
    constraints.push(where("date", "<=", dateRange.end));
  }
  constraints.push(orderBy("date", "desc"));
  return query(attendanceRecordsRef, ...constraints);
}

export function subscribeTodayRecord(
  memberId: string,
  today: string,
  onData: (record: AttendanceRecord | null) => void,
  onError?: () => void
): Unsubscribe {
  const docId = `${memberId}_${today}`;
  return onSnapshot(
    doc(db, "attendance_records", docId),
    (docSnap) => {
      if (docSnap.exists()) {
        onData({ id: docSnap.id, ...docSnap.data() } as AttendanceRecord);
      } else {
        onData(null);
      }
    },
    onError
  );
}

export async function clockIn(memberId: string): Promise<void> {
  const res = await fetch("/api/attendance/clock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "clock-in", memberId }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to clock in");
  }
}

export async function clockOut(
  memberId: string,
  lunchBreakMinutes: number = 60
): Promise<void> {
  const res = await fetch("/api/attendance/clock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "clock-out", memberId, lunchBreakMinutes }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to clock out");
  }
}

export async function createAttendanceRecord(
  memberId: string,
  date: string,
  checkInMinutes: number,
  checkOutMinutes: number
): Promise<void> {
  const res = await fetch("/api/attendance/record", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memberId, date, checkInMinutes, checkOutMinutes }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to create attendance record");
  }
}

export async function updateAttendanceRecord(
  recordId: string,
  memberId: string,
  date: string,
  checkInMinutes: number,
  checkOutMinutes: number
): Promise<void> {
  const res = await fetch("/api/attendance/record", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recordId, memberId, date, checkInMinutes, checkOutMinutes }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to update attendance record");
  }
}

export async function deleteAttendanceRecord(
  recordId: string,
  memberId: string
): Promise<void> {
  const res = await fetch("/api/attendance/record", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recordId, memberId }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to delete attendance record");
  }
}
