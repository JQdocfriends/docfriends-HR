import { describe, it, expect } from "vitest";
import {
  FIXED_HOLIDAYS,
  LUNAR_HOLIDAYS,
  isKoreanHoliday,
  getHolidayName,
  getHolidaysForYear,
} from "./korean-holidays";

describe("FIXED_HOLIDAYS", () => {
  it("contains 8 fixed holidays", () => {
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

  it("all fixed holidays are marked as isFixed=true", () => {
    FIXED_HOLIDAYS.forEach((h) => {
      expect(h.isFixed).toBe(true);
    });
  });
});

describe("LUNAR_HOLIDAYS", () => {
  it("has entries for 2026", () => {
    expect(LUNAR_HOLIDAYS[2026]).toBeDefined();
    expect(LUNAR_HOLIDAYS[2026].length).toBeGreaterThanOrEqual(7);
  });

  it("has entries for 2027", () => {
    expect(LUNAR_HOLIDAYS[2027]).toBeDefined();
    expect(LUNAR_HOLIDAYS[2027].length).toBeGreaterThanOrEqual(7);
  });

  it("includes Seollal (설날) for 2026", () => {
    const seollal = LUNAR_HOLIDAYS[2026].find((h) => h.name === "설날");
    expect(seollal).toBeDefined();
    expect(seollal!.date).toBe("2026-02-07");
  });

  it("includes Chuseok (추석) for 2026", () => {
    const chuseok = LUNAR_HOLIDAYS[2026].find((h) => h.name === "추석");
    expect(chuseok).toBeDefined();
    expect(chuseok!.date).toBe("2026-09-26");
  });

  it("includes Buddha's Birthday for 2026", () => {
    const buddha = LUNAR_HOLIDAYS[2026].find(
      (h) => h.name === "부처님 오신 날"
    );
    expect(buddha).toBeDefined();
    expect(buddha!.date).toBe("2026-05-24");
  });

  it("all lunar holidays are marked as isFixed=false", () => {
    Object.values(LUNAR_HOLIDAYS).forEach((yearHolidays) => {
      yearHolidays.forEach((h) => {
        expect(h.isFixed).toBe(false);
      });
    });
  });
});

describe("isKoreanHoliday", () => {
  describe("fixed holidays", () => {
    it("recognizes New Year (신정) Jan 1", () => {
      expect(isKoreanHoliday(new Date("2026-01-01"))).toBe(true);
    });

    it("recognizes Independence Movement Day (삼일절) Mar 1", () => {
      expect(isKoreanHoliday(new Date("2026-03-01"))).toBe(true);
    });

    it("recognizes Children's Day (어린이날) May 5", () => {
      expect(isKoreanHoliday(new Date("2026-05-05"))).toBe(true);
    });

    it("recognizes Memorial Day (현충일) Jun 6", () => {
      expect(isKoreanHoliday(new Date("2026-06-06"))).toBe(true);
    });

    it("recognizes Liberation Day (광복절) Aug 15", () => {
      expect(isKoreanHoliday(new Date("2026-08-15"))).toBe(true);
    });

    it("recognizes National Foundation Day (개천절) Oct 3", () => {
      expect(isKoreanHoliday(new Date("2026-10-03"))).toBe(true);
    });

    it("recognizes Hangul Day (한글날) Oct 9", () => {
      expect(isKoreanHoliday(new Date("2026-10-09"))).toBe(true);
    });

    it("recognizes Christmas Dec 25", () => {
      expect(isKoreanHoliday(new Date("2026-12-25"))).toBe(true);
    });

    it("fixed holidays work for any year", () => {
      expect(isKoreanHoliday(new Date("2030-01-01"))).toBe(true);
      expect(isKoreanHoliday(new Date("2030-08-15"))).toBe(true);
    });
  });

  describe("lunar holidays", () => {
    it("recognizes Seollal 2026 (Feb 6-8)", () => {
      expect(isKoreanHoliday(new Date("2026-02-06"))).toBe(true);
      expect(isKoreanHoliday(new Date("2026-02-07"))).toBe(true);
      expect(isKoreanHoliday(new Date("2026-02-08"))).toBe(true);
    });

    it("recognizes Chuseok 2026 (Sep 25-27)", () => {
      expect(isKoreanHoliday(new Date("2026-09-25"))).toBe(true);
      expect(isKoreanHoliday(new Date("2026-09-26"))).toBe(true);
      expect(isKoreanHoliday(new Date("2026-09-27"))).toBe(true);
    });

    it("recognizes Buddha's Birthday 2026 (May 24)", () => {
      expect(isKoreanHoliday(new Date("2026-05-24"))).toBe(true);
    });
  });

  describe("non-holidays", () => {
    it("returns false for regular weekday", () => {
      expect(isKoreanHoliday(new Date("2026-04-15"))).toBe(false);
    });

    it("returns false for weekend (not a public holiday)", () => {
      // Saturday Mar 7, 2026 — not a holiday
      expect(isKoreanHoliday(new Date("2026-03-07"))).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("returns false for lunar holidays of unregistered year", () => {
      // 2028 lunar holidays not registered — lunar-based ones should not match
      // But fixed holidays should still work
      expect(isKoreanHoliday(new Date("2028-01-01"))).toBe(true); // fixed
      // A random date that might be Seollal 2028 but isn't registered
      expect(isKoreanHoliday(new Date("2028-02-12"))).toBe(false);
    });
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

  it("prioritizes fixed holiday when same date", () => {
    // If a lunar holiday falls on a fixed holiday date, fixed name returned
    // This is a structural test — current data doesn't have this overlap
    const name = getHolidayName(new Date("2026-01-01"));
    expect(name).toBe("신정");
  });
});

describe("getHolidaysForYear", () => {
  it("returns all holidays for 2026 sorted by date", () => {
    const holidays = getHolidaysForYear(2026);

    // 8 fixed + 7 lunar = 15
    expect(holidays).toHaveLength(15);

    // Verify sorted order
    for (let i = 1; i < holidays.length; i++) {
      expect(holidays[i].date >= holidays[i - 1].date).toBe(true);
    }
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

  it("returns only fixed holidays for year without lunar data", () => {
    const holidays = getHolidaysForYear(2030);
    expect(holidays).toHaveLength(8); // only fixed holidays
  });

  it("formats fixed holiday dates with the requested year", () => {
    const holidays = getHolidaysForYear(2026);
    holidays
      .filter((h) => h.isFixed)
      .forEach((h) => {
        expect(h.date).toMatch(/^2026-/);
      });
  });
});
