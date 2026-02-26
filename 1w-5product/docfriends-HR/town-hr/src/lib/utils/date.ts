import { format, startOfWeek, endOfWeek, differenceInMinutes } from "date-fns";
import { ko } from "date-fns/locale";

const KST_TIMEZONE = "Asia/Seoul";

/**
 * Get current time in KST
 */
export function nowKST(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: KST_TIMEZONE })
  );
}

/**
 * Format date in Korean style: YYYY년 MM월 DD일
 */
export function formatDateKo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "yyyy년 MM월 dd일", { locale: ko });
}

/**
 * Format date as ISO date string: YYYY-MM-DD
 */
export function formatDateISO(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Format time in Korean style: HH시 MM분
 */
export function formatTimeKo(date: Date): string {
  return format(date, "HH시 mm분", { locale: ko });
}

/**
 * Format datetime: YYYY년 MM월 DD일 HH:MM
 */
export function formatDateTimeKo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "yyyy년 MM월 dd일 HH:mm", { locale: ko });
}

/**
 * Get Monday of the week for 52-hour calculation
 */
export function getWeekStartMonday(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

/**
 * Get Sunday of the week for 52-hour calculation
 */
export function getWeekEndSunday(date: Date): Date {
  return endOfWeek(date, { weekStartsOn: 1 });
}

/**
 * Calculate work minutes between check-in and check-out, minus lunch break
 */
export function calculateWorkMinutes(
  checkIn: Date,
  checkOut: Date,
  lunchBreakMinutes: number = 60
): number {
  const totalMinutes = differenceInMinutes(checkOut, checkIn);
  return Math.max(0, totalMinutes - lunchBreakMinutes);
}

/**
 * Format minutes to hours and minutes string
 * e.g., 510 -> "8시간 30분"
 */
export function formatMinutesKo(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}분`;
  if (mins === 0) return `${hours}시간`;
  return `${hours}시간 ${mins}분`;
}

/**
 * Format number in Korean style: 1,000
 */
export function formatNumberKo(num: number): string {
  return num.toLocaleString("ko-KR");
}
