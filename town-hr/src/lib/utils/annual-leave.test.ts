import { describe, it, expect } from "vitest";
import {
  calculateAnnualLeaveDays,
  calculateRemainingLeave,
  isInProbation,
} from "./annual-leave";

describe("calculateAnnualLeaveDays", () => {
  // Helper: create a hire date N years and M months before reference
  function hireDate(yearsAgo: number, monthsAgo: number = 0): string {
    const ref = new Date("2026-03-01");
    const d = new Date(ref);
    d.setFullYear(d.getFullYear() - yearsAgo);
    d.setMonth(d.getMonth() - monthsAgo);
    return d.toISOString().split("T")[0];
  }

  const REF = new Date("2026-03-01");

  describe("under 1 year tenure (1 day per month worked, max 11)", () => {
    it.each([
      { monthsWorked: 0, expected: 0 },
      { monthsWorked: 1, expected: 1 },
      { monthsWorked: 3, expected: 3 },
      { monthsWorked: 6, expected: 6 },
      { monthsWorked: 10, expected: 10 },
      { monthsWorked: 11, expected: 11 },
    ])(
      "returns $expected days for $monthsWorked months worked",
      ({ monthsWorked, expected }) => {
        const hire = new Date(REF);
        hire.setMonth(hire.getMonth() - monthsWorked);
        const hireDateStr = hire.toISOString().split("T")[0];
        expect(calculateAnnualLeaveDays(hireDateStr, REF)).toBe(expected);
      }
    );

    it("caps at 11 days even if close to 12 months", () => {
      // 11.5 months ago — still under 1 year
      const hire = new Date("2025-03-15");
      const ref = new Date("2026-03-01");
      const result = calculateAnnualLeaveDays(
        hire.toISOString().split("T")[0],
        ref
      );
      expect(result).toBeLessThanOrEqual(11);
    });
  });

  describe("1-2 years tenure (15 days)", () => {
    it("returns 15 days at exactly 1 year", () => {
      expect(calculateAnnualLeaveDays(hireDate(1), REF)).toBe(15);
    });

    it("returns 15 days at 1.5 years", () => {
      expect(calculateAnnualLeaveDays(hireDate(1, 6), REF)).toBe(15);
    });

    it("returns 15 days at 2 years", () => {
      expect(calculateAnnualLeaveDays(hireDate(2), REF)).toBe(15);
    });

    it("returns 15 days at 2 years 11 months", () => {
      expect(calculateAnnualLeaveDays(hireDate(2, 11), REF)).toBe(15);
    });
  });

  describe("3+ years tenure (15 + 1 per 2 years beyond 1st year, max 25)", () => {
    it.each([
      { years: 3, expected: 16 },  // extraYears=2, extraDays=1
      { years: 4, expected: 16 },  // extraYears=3, extraDays=1
      { years: 5, expected: 17 },  // extraYears=4, extraDays=2
      { years: 6, expected: 17 },  // extraYears=5, extraDays=2
      { years: 7, expected: 18 },  // extraYears=6, extraDays=3
      { years: 9, expected: 19 },  // extraYears=8, extraDays=4
      { years: 11, expected: 20 }, // extraYears=10, extraDays=5
      { years: 13, expected: 21 }, // extraYears=12, extraDays=6
      { years: 15, expected: 22 }, // extraYears=14, extraDays=7
      { years: 17, expected: 23 }, // extraYears=16, extraDays=8
      { years: 19, expected: 24 }, // extraYears=18, extraDays=9
      { years: 21, expected: 25 }, // extraYears=20, extraDays=10
    ])(
      "returns $expected days for $years years tenure",
      ({ years, expected }) => {
        expect(calculateAnnualLeaveDays(hireDate(years), REF)).toBe(expected);
      }
    );

    it("caps at 25 days for very long tenure (30 years)", () => {
      expect(calculateAnnualLeaveDays(hireDate(30), REF)).toBe(25);
    });

    it("caps at 25 days for 50 years tenure", () => {
      expect(calculateAnnualLeaveDays(hireDate(50), REF)).toBe(25);
    });
  });

  describe("edge cases", () => {
    it("returns 0 for hire date = reference date (0 months worked)", () => {
      expect(
        calculateAnnualLeaveDays("2026-03-01", new Date("2026-03-01"))
      ).toBe(0);
    });

    it("handles leap year hire date (Feb 29)", () => {
      // Hired Feb 29, 2024 — reference Mar 1, 2026 = ~2 years
      const result = calculateAnnualLeaveDays("2024-02-29", REF);
      expect(result).toBe(15);
    });

    it("handles year-end boundary (Dec 31 hire, Jan 1 reference)", () => {
      const result = calculateAnnualLeaveDays(
        "2025-12-31",
        new Date("2026-01-01")
      );
      // 1 day later — 0 full months
      expect(result).toBe(0);
    });

    it("defaults to current date when no reference date provided", () => {
      // Just ensure it doesn't throw
      const result = calculateAnnualLeaveDays("2020-01-01");
      expect(result).toBeGreaterThanOrEqual(15);
    });
  });
});

describe("calculateRemainingLeave", () => {
  it("returns correct remaining when leave is available", () => {
    expect(calculateRemainingLeave(15, 5, 2)).toBe(8);
  });

  it("returns 0 when all leave is used", () => {
    expect(calculateRemainingLeave(15, 15, 0)).toBe(0);
  });

  it("returns 0 when used + pending exceeds granted (no negative)", () => {
    expect(calculateRemainingLeave(15, 10, 8)).toBe(0);
  });

  it("returns full balance when nothing used or pending", () => {
    expect(calculateRemainingLeave(15, 0, 0)).toBe(15);
  });

  it("accounts for pending leave in balance", () => {
    expect(calculateRemainingLeave(15, 0, 15)).toBe(0);
  });
});

describe("isInProbation", () => {
  it("returns true for employee hired 1 month ago", () => {
    const hire = new Date();
    hire.setMonth(hire.getMonth() - 1);
    expect(isInProbation(hire.toISOString().split("T")[0])).toBe(true);
  });

  it("returns false for employee hired 4 months ago (default 3mo probation)", () => {
    const hire = new Date();
    hire.setMonth(hire.getMonth() - 4);
    expect(isInProbation(hire.toISOString().split("T")[0])).toBe(false);
  });

  it("respects custom probation period", () => {
    const hire = new Date();
    hire.setMonth(hire.getMonth() - 5);
    // 5 months ago with 6-month probation = still in probation
    expect(isInProbation(hire.toISOString().split("T")[0], 6)).toBe(true);
  });

  it("returns false for employee hired exactly at probation boundary", () => {
    const hire = new Date();
    hire.setMonth(hire.getMonth() - 3);
    // differenceInMonths returns 3, which is not < 3
    expect(isInProbation(hire.toISOString().split("T")[0])).toBe(false);
  });
});
