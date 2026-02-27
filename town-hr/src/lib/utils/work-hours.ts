/**
 * 52-hour work week monitoring utilities
 * Based on Korean Labor Standards Act (근로기준법)
 *
 * Standard: 40 hours base + max 12 hours overtime = 52 hours/week
 */

const STANDARD_WEEKLY_MINUTES = 40 * 60; // 2400 minutes
const MAX_WEEKLY_MINUTES = 52 * 60; // 3120 minutes
const DEFAULT_DAILY_WORK_MINUTES = 8 * 60; // 480 minutes

/**
 * Calculate overtime minutes for a day
 */
export function calculateDailyOvertime(
  workMinutes: number,
  standardMinutes: number = DEFAULT_DAILY_WORK_MINUTES
): number {
  return Math.max(0, workMinutes - standardMinutes);
}

/**
 * Calculate weekly total from daily records
 */
export function calculateWeeklyTotal(
  dailyMinutes: number[]
): {
  totalWorkMinutes: number;
  totalOvertimeMinutes: number;
  isOverLimit: boolean;
  remainingMinutes: number;
  utilizationPercent: number;
} {
  const totalWorkMinutes = dailyMinutes.reduce((sum, m) => sum + m, 0);
  const totalOvertimeMinutes = Math.max(
    0,
    totalWorkMinutes - STANDARD_WEEKLY_MINUTES
  );
  const isOverLimit = totalWorkMinutes > MAX_WEEKLY_MINUTES;
  const remainingMinutes = Math.max(0, MAX_WEEKLY_MINUTES - totalWorkMinutes);
  const utilizationPercent = Math.round(
    (totalWorkMinutes / MAX_WEEKLY_MINUTES) * 100
  );

  return {
    totalWorkMinutes,
    totalOvertimeMinutes,
    isOverLimit,
    remainingMinutes,
    utilizationPercent,
  };
}

/**
 * Get warning level based on weekly work hours
 */
export function getOvertimeWarningLevel(
  totalWorkMinutes: number,
  alertThresholdHours: number = 48
): "safe" | "warning" | "danger" | "exceeded" {
  const alertThresholdMinutes = alertThresholdHours * 60;

  if (totalWorkMinutes > MAX_WEEKLY_MINUTES) return "exceeded";
  if (totalWorkMinutes > alertThresholdMinutes) return "danger";
  if (totalWorkMinutes > STANDARD_WEEKLY_MINUTES) return "warning";
  return "safe";
}

export { STANDARD_WEEKLY_MINUTES, MAX_WEEKLY_MINUTES, DEFAULT_DAILY_WORK_MINUTES };
