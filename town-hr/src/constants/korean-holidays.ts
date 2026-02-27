/**
 * Korean public holidays (공휴일)
 * Note: Some holidays follow the lunar calendar and change each year.
 * This list provides fixed-date holidays and needs annual updates for lunar dates.
 */

export interface KoreanHoliday {
  date: string; // "MM-DD" for fixed, "YYYY-MM-DD" for lunar-based
  name: string;
  isFixed: boolean; // true = same date every year
}

// Fixed-date holidays (매년 동일)
export const FIXED_HOLIDAYS: KoreanHoliday[] = [
  { date: "01-01", name: "신정", isFixed: true },
  { date: "03-01", name: "삼일절", isFixed: true },
  { date: "05-05", name: "어린이날", isFixed: true },
  { date: "06-06", name: "현충일", isFixed: true },
  { date: "08-15", name: "광복절", isFixed: true },
  { date: "10-03", name: "개천절", isFixed: true },
  { date: "10-09", name: "한글날", isFixed: true },
  { date: "12-25", name: "크리스마스", isFixed: true },
];

// Lunar-based holidays by year (음력 기반 - 매년 갱신 필요)
export const LUNAR_HOLIDAYS: Record<number, KoreanHoliday[]> = {
  2026: [
    { date: "2026-02-06", name: "설날 전날", isFixed: false },
    { date: "2026-02-07", name: "설날", isFixed: false },
    { date: "2026-02-08", name: "설날 다음날", isFixed: false },
    { date: "2026-05-24", name: "부처님 오신 날", isFixed: false },
    { date: "2026-09-25", name: "추석 전날", isFixed: false },
    { date: "2026-09-26", name: "추석", isFixed: false },
    { date: "2026-09-27", name: "추석 다음날", isFixed: false },
  ],
  2027: [
    { date: "2027-01-26", name: "설날 전날", isFixed: false },
    { date: "2027-01-27", name: "설날", isFixed: false },
    { date: "2027-01-28", name: "설날 다음날", isFixed: false },
    { date: "2027-05-13", name: "부처님 오신 날", isFixed: false },
    { date: "2027-09-14", name: "추석 전날", isFixed: false },
    { date: "2027-09-15", name: "추석", isFixed: false },
    { date: "2027-09-16", name: "추석 다음날", isFixed: false },
  ],
};

/**
 * Check if a given date is a Korean public holiday
 */
export function isKoreanHoliday(date: Date): boolean {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const mmdd = `${month}-${day}`;
  const year = date.getFullYear();

  // Check fixed holidays
  if (FIXED_HOLIDAYS.some((h) => h.date === mmdd)) {
    return true;
  }

  // Check lunar holidays for the year
  const yyyy = `${year}-${mmdd}`;
  const lunarForYear = LUNAR_HOLIDAYS[year];
  if (lunarForYear?.some((h) => h.date === yyyy)) {
    return true;
  }

  return false;
}

/**
 * Get holiday name for a given date
 */
export function getHolidayName(date: Date): string | null {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const mmdd = `${month}-${day}`;
  const year = date.getFullYear();

  const fixed = FIXED_HOLIDAYS.find((h) => h.date === mmdd);
  if (fixed) return fixed.name;

  const yyyy = `${year}-${mmdd}`;
  const lunar = LUNAR_HOLIDAYS[year]?.find((h) => h.date === yyyy);
  if (lunar) return lunar.name;

  return null;
}

/**
 * Get all holidays for a given year
 */
export function getHolidaysForYear(year: number): KoreanHoliday[] {
  const fixed = FIXED_HOLIDAYS.map((h) => ({
    ...h,
    date: `${year}-${h.date}`,
  }));
  const lunar = LUNAR_HOLIDAYS[year] ?? [];
  return [...fixed, ...lunar].sort((a, b) => a.date.localeCompare(b.date));
}
