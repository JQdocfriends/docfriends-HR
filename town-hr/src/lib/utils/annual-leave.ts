import { differenceInMonths, differenceInYears } from "date-fns";

/**
 * Minimum attendance percentage required for full annual leave (Art. 60)
 */
export const MIN_ATTENDANCE_PERCENT = 80;

/**
 * Calculate annual leave days based on Korean Labor Standards Act (근로기준법 제60조)
 *
 * Rules:
 * - Less than 1 year tenure: 1 day per month worked (max 11 days)
 * - 1 year or more with ≥80% attendance: 15 days per year
 * - 1 year or more with <80% attendance: 0 days (Art. 60 §1)
 * - 3+ years: 15 days + 1 extra day per 2 years of service (max 25 days)
 *
 * @param hireDate - Employee hire date (ISO string "YYYY-MM-DD")
 * @param referenceDate - Date to calculate from (defaults to now)
 * @param attendancePercentage - Attendance rate for the previous year (0-100, defaults to 100)
 * @returns Number of annual leave days
 */
export function calculateAnnualLeaveDays(
  hireDate: string,
  referenceDate: Date = new Date(),
  attendancePercentage: number = 100
): number {
  const hire = new Date(hireDate);
  const totalMonths = differenceInMonths(referenceDate, hire);
  const totalYears = differenceInYears(referenceDate, hire);

  // Less than 1 year: 1 day per month worked (max 11)
  // Monthly leave is not subject to 80% attendance rule
  if (totalYears < 1) {
    return Math.min(totalMonths, 11);
  }

  // Art. 60 §1: Employees with <80% attendance get 0 annual leave days
  if (attendancePercentage < MIN_ATTENDANCE_PERCENT) {
    return 0;
  }

  // 1-2 years: 15 days
  if (totalYears < 3) {
    return 15;
  }

  // 3+ years: 15 + 1 day per 2 years beyond 1st year (max 25)
  const extraYears = totalYears - 1;
  const extraDays = Math.floor(extraYears / 2);
  return Math.min(15 + extraDays, 25);
}

/**
 * Calculate remaining leave balance
 */
export function calculateRemainingLeave(
  granted: number,
  used: number,
  pending: number
): number {
  return Math.max(0, granted - used - pending);
}

/**
 * Check if employee is in probation period
 * @param hireDate - Employee hire date (ISO string)
 * @param probationMonths - Probation period in months (default 3)
 */
export function isInProbation(
  hireDate: string,
  probationMonths: number = 3
): boolean {
  const hire = new Date(hireDate);
  const months = differenceInMonths(new Date(), hire);
  return months < probationMonths;
}
