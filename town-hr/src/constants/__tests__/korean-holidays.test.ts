import { describe, it, expect } from "vitest";
import {
  FIXED_HOLIDAYS,
  LUNAR_HOLIDAYS,
  isKoreanHoliday,
  getHolidayName,
  getHolidaysForYear,
} from "../korean-holidays";

describe("FIXED_HOLIDAYS", () => {
  it("has 8 fixed holidays", () => {
    expect(FIXED_HOLIDAYS).toHaveLength(8);
  });

  it("includes all major fixed holidays", () => {
    const dates = FIXED_HOLIDAYS.map((h) => h.date);
    expect(dates).toContain("01-01"); // 신정
    expect(dates).toContain("03-01"); // 삼일절
    expect(dates).toContain("05-05"); // 어린이날
    expect(dates).toContain("06-06"); // 현충일
    expect(dates).toContain("08-15"); // 광복절
    expect(dates).toContain("10-03"); // 개천절
    expect(dates).toContain("10-09"); // 한글날
    expect(dates).toContain("12-25"); // 크리스마스
  });

  it("all fixed holidays have isFixed=true", () => {
    FIXED_HOLIDAYS.forEach((h) => {
      expect(h.isFixed).toBe(true);
    });
  });

  it("all fixed holidays have Korean names", () => {
    FIXED_HOLIDAYS.forEach((h) => {
      expect(h.name.length).toBeGreaterThan(0);
    });
  });
});

describe("LUNAR_HOLIDAYS", () => {
  it("has 2026 lunar holidays", () => {
    expect(LUNAR_HOLIDAYS[2026]).toBeDefined();
    expect(LUNAR_HOLIDAYS[2026]).toHaveLength(7);
  });

  it("has 2027 lunar holidays", () => {
    expect(LUNAR_HOLIDAYS[2027]).toBeDefined();
    expect(LUNAR_HOLIDAYS[2027]).toHaveLength(7);
  });

  it("2026 includes 설날 (3 days) and 추석 (3 days) and 부처님 오신 날", () => {
    const names2026 = LUNAR_HOLIDAYS[2026].map((h) => h.name);
    expect(names2026).toContain("설날");
    expect(names2026).toContain("설날 전날");
    expect(names2026).toContain("설날 다음날");
    expect(names2026).toContain("추석");
    expect(names2026).toContain("추석 전날");
    expect(names2026).toContain("추석 다음날");
    expect(names2026).toContain("부처님 오신 날");
  });

  it("all lunar holidays have isFixed=false", () => {
    Object.values(LUNAR_HOLIDAYS)
      .flat()
      .forEach((h) => {
        expect(h.isFixed).toBe(false);
      });
  });

  it("lunar holiday dates are in YYYY-MM-DD format", () => {
    Object.values(LUNAR_HOLIDAYS)
      .flat()
      .forEach((h) => {
        expect(h.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
  });
});

describe("isKoreanHoliday", () => {
  // Fixed holidays
  it("detects New Year (신정) - Jan 1", () => {
    expect(isKoreanHoliday(new Date("2026-01-01"))).toBe(true);
  });

  it("detects Independence Movement Day (삼일절) - Mar 1", () => {
    expect(isKoreanHoliday(new Date("2026-03-01"))).toBe(true);
  });

  it("detects Children's Day (어린이날) - May 5", () => {
    expect(isKoreanHoliday(new Date("2026-05-05"))).toBe(true);
  });

  it("detects Memorial Day (현충일) - Jun 6", () => {
    expect(isKoreanHoliday(new Date("2026-06-06"))).toBe(true);
  });

  it("detects Liberation Day (광복절) - Aug 15", () => {
    expect(isKoreanHoliday(new Date("2026-08-15"))).toBe(true);
  });

  it("detects National Foundation Day (개천절) - Oct 3", () => {
    expect(isKoreanHoliday(new Date("2026-10-03"))).toBe(true);
  });

  it("detects Hangul Day (한글날) - Oct 9", () => {
    expect(isKoreanHoliday(new Date("2026-10-09"))).toBe(true);
  });

  it("detects Christmas - Dec 25", () => {
    expect(isKoreanHoliday(new Date("2026-12-25"))).toBe(true);
  });

  // Fixed holidays work across years
  it("detects fixed holidays in other years too", () => {
    expect(isKoreanHoliday(new Date("2030-01-01"))).toBe(true);
    expect(isKoreanHoliday(new Date("2030-03-01"))).toBe(true);
  });

  // Lunar holidays
  it("detects 2026 설날 (Feb 7)", () => {
    expect(isKoreanHoliday(new Date("2026-02-07"))).toBe(true);
  });

  it("detects 2026 추석 (Sep 26)", () => {
    expect(isKoreanHoliday(new Date("2026-09-26"))).toBe(true);
  });

  it("detects 2026 부처님 오신 날 (May 24)", () => {
    expect(isKoreanHoliday(new Date("2026-05-24"))).toBe(true);
  });

  // Non-holidays
  it("returns false for regular weekday", () => {
    expect(isKoreanHoliday(new Date("2026-04-15"))).toBe(false);
  });

  it("returns false for Saturday (not a public holiday)", () => {
    expect(isKoreanHoliday(new Date("2026-04-18"))).toBe(false);
  });

  // Edge: lunar holiday for a year without data
  it("returns false for lunar holiday date in year without data", () => {
    // 2028 lunar holidays not defined
    expect(isKoreanHoliday(new Date("2028-02-07"))).toBe(false);
  });
});

describe("getHolidayName", () => {
  it("returns name for fixed holiday", () => {
    expect(getHolidayName(new Date("2026-01-01"))).toBe("신정");
    expect(getHolidayName(new Date("2026-03-01"))).toBe("삼일절");
    expect(getHolidayName(new Date("2026-12-25"))).toBe("크리스마스");
  });

  it("returns name for lunar holiday", () => {
    expect(getHolidayName(new Date("2026-02-07"))).toBe("설날");
    expect(getHolidayName(new Date("2026-09-26"))).toBe("추석");
  });

  it("returns null for non-holiday", () => {
    expect(getHolidayName(new Date("2026-04-15"))).toBeNull();
  });

  it("returns null for unknown lunar year", () => {
    expect(getHolidayName(new Date("2028-02-07"))).toBeNull();
  });
});

describe("getHolidaysForYear", () => {
  it("returns 15 holidays for 2026 (8 fixed + 7 lunar)", () => {
    const holidays = getHolidaysForYear(2026);
    expect(holidays).toHaveLength(15);
  });

  it("returns 15 holidays for 2027 (8 fixed + 7 lunar)", () => {
    const holidays = getHolidaysForYear(2027);
    expect(holidays).toHaveLength(15);
  });

  it("returns only 8 fixed holidays for year without lunar data", () => {
    const holidays = getHolidaysForYear(2030);
    expect(holidays).toHaveLength(8);
  });

  it("returns holidays sorted by date", () => {
    const holidays = getHolidaysForYear(2026);
    for (let i = 1; i < holidays.length; i++) {
      expect(holidays[i].date >= holidays[i - 1].date).toBe(true);
    }
  });

  it("all dates have full YYYY-MM-DD format", () => {
    const holidays = getHolidaysForYear(2026);
    holidays.forEach((h) => {
      expect(h.date).toMatch(/^2026-\d{2}-\d{2}$/);
    });
  });

  it("first holiday of 2026 is 신정 (Jan 1)", () => {
    const holidays = getHolidaysForYear(2026);
    expect(holidays[0].name).toBe("신정");
    expect(holidays[0].date).toBe("2026-01-01");
  });

  it("last holiday of 2026 is 크리스마스 (Dec 25)", () => {
    const holidays = getHolidaysForYear(2026);
    expect(holidays[holidays.length - 1].name).toBe("크리스마스");
    expect(holidays[holidays.length - 1].date).toBe("2026-12-25");
  });
});
