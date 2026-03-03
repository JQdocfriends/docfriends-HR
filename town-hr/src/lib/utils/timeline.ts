import { Timestamp } from "firebase/firestore";

export const TIMELINE_START_HOUR = 1;
export const TIMELINE_END_HOUR = 23;
const TIMELINE_START_MINUTES = TIMELINE_START_HOUR * 60; // 60
const TIMELINE_END_MINUTES = TIMELINE_END_HOUR * 60; // 1380
const TIMELINE_RANGE = TIMELINE_END_MINUTES - TIMELINE_START_MINUTES; // 1320

const KOREAN_DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * Convert a Firestore Timestamp to minutes since midnight (local time)
 */
export function timestampToMinutes(ts: Timestamp): number {
  const date = ts.toDate();
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Convert minutes since midnight to a percent position on the timeline (0-100)
 * Timeline spans from 1:00 (60 min) to 23:00 (1380 min)
 */
export function minutesToPercent(minutes: number): number {
  const raw = ((minutes - TIMELINE_START_MINUTES) / TIMELINE_RANGE) * 100;
  return Math.min(100, Math.max(0, raw));
}

/**
 * Convert a percent position on the timeline to minutes since midnight
 */
export function percentToMinutes(percent: number): number {
  const clamped = Math.min(100, Math.max(0, percent));
  return Math.round((clamped / 100) * TIMELINE_RANGE + TIMELINE_START_MINUTES);
}

/**
 * Snap minutes to nearest grid increment (default 15 min)
 */
export function snapToGrid(minutes: number, gridSize = 15): number {
  return Math.round(minutes / gridSize) * gridSize;
}

/**
 * Get the 7 days of a week starting from a Monday Date
 * Returns Mon-Sun with Korean labels
 */
export function getWeekDays(weekStart: Date): Array<{
  date: Date;
  dateStr: string;
  dayLabel: string;
  dayNumber: number;
  isToday: boolean;
  isWeekend: boolean;
}> {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
    return {
      date,
      dateStr,
      dayLabel: KOREAN_DAY_LABELS[dayOfWeek],
      dayNumber: date.getDate(),
      isToday: dateStr === todayStr,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    };
  });
}

/**
 * Get Monday and Sunday ISO date strings for the week containing the given date
 */
export function getWeekBounds(date: Date): { weekStart: string; weekEnd: string } {
  const day = date.getDay(); // 0=Sun
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { weekStart: fmt(monday), weekEnd: fmt(sunday) };
}

/**
 * Calculate the break block position within an attendance bar.
 * All returned widths are percentages relative to the check-in → check-out block.
 */
export function getBreakPosition(
  checkInMin: number,
  checkOutMin: number,
  lunchStartMin: number,
  lunchMinutes: number
): {
  hasBreak: boolean;
  beforeBreakWidth: number;
  breakWidth: number;
  afterBreakWidth: number;
} | null {
  const blockDuration = checkOutMin - checkInMin;
  if (blockDuration <= 0) return null;

  const lunchEndMin = lunchStartMin + lunchMinutes;

  // Break must overlap with the work block
  const breakStart = Math.max(checkInMin, lunchStartMin);
  const breakEnd = Math.min(checkOutMin, lunchEndMin);

  if (breakEnd <= breakStart) {
    return { hasBreak: false, beforeBreakWidth: 100, breakWidth: 0, afterBreakWidth: 0 };
  }

  const beforeBreakWidth = ((breakStart - checkInMin) / blockDuration) * 100;
  const breakWidth = ((breakEnd - breakStart) / blockDuration) * 100;
  const afterBreakWidth = ((checkOutMin - breakEnd) / blockDuration) * 100;

  return {
    hasBreak: true,
    beforeBreakWidth,
    breakWidth,
    afterBreakWidth,
  };
}

/**
 * Format total minutes as H:MM or -H:MM (e.g. 1920 → "32:00", -480 → "-8:00")
 */
export function formatMinutesAsHHMM(totalMinutes: number): string {
  const negative = totalMinutes < 0;
  const abs = Math.abs(totalMinutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  const mm = String(mins).padStart(2, "0");
  return `${negative ? "-" : ""}${hours}:${mm}`;
}

/**
 * Format minutes since midnight as Korean time label
 * e.g. 540 → "오전 9:00", 780 → "오후 1:00", 720 → "정오"
 */
export function formatTimeLabel(minutesSinceMidnight: number): string {
  if (minutesSinceMidnight === 720) return "정오";
  const hours = Math.floor(minutesSinceMidnight / 60);
  const mins = minutesSinceMidnight % 60;
  const mm = String(mins).padStart(2, "0");
  if (hours < 12) {
    return `오전 ${hours}:${mm}`;
  }
  return `오후 ${hours - 12}:${mm}`;
}

/**
 * Format a week range as Korean style: "2026. 3. 2 - 3. 8"
 */
export function formatWeekLabel(weekStart: Date, weekEnd: Date): string {
  const sy = weekStart.getFullYear();
  const sm = weekStart.getMonth() + 1;
  const sd = weekStart.getDate();
  const em = weekEnd.getMonth() + 1;
  const ed = weekEnd.getDate();
  return `${sy}. ${sm}. ${sd} - ${em}. ${ed}`;
}
