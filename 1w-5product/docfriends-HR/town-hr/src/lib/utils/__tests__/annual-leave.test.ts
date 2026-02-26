import { describe, it, expect } from "vitest";
import {
  calculateAnnualLeaveDays,
  calculateRemainingLeave,
  isInProbation,
  MIN_ATTENDANCE_PERCENT,
} from "../annual-leave";

describe("calculateAnnualLeaveDays", () => {
  // ---- Less than 1 year tenure ----
  describe("less than 1 year tenure (월별 발생)", () => {
    it("returns 0 days for same-day hire", () => {
      const today = new Date("2026-03-15");
      expect(calculateAnnualLeaveDays("2026-03-15", today)).toBe(0);
    });

    it("returns 1 day after 1 month", () => {
      const ref = new Date("2026-04-15");
      expect(calculateAnnualLeaveDays("2026-03-15", ref)).toBe(1);
    });

    it("returns 3 days after 3 months", () => {
      const ref = new Date("2026-06-15");
      expect(calculateAnnualLeaveDays("2026-03-15", ref)).toBe(3);
    });

    it("returns 6 days after 6 months", () => {
      const ref = new Date("2026-09-15");
      expect(calculateAnnualLeaveDays("2026-03-15", ref)).toBe(6);
    });

    it("returns max 11 days at 11 months", () => {
      const ref = new Date("2027-02-15");
      expect(calculateAnnualLeaveDays("2026-03-15", ref)).toBe(11);
    });

    it("caps at 11 even at 11.5 months (before 1 year)", () => {
      const ref = new Date("2027-02-28");
      expect(calculateAnnualLeaveDays("2026-03-15", ref)).toBe(11);
    });
  });

  // ---- 1-2 years tenure ----
  describe("1-2 years tenure", () => {
    it("returns 15 days at exactly 1 year", () => {
      const ref = new Date("2027-03-15");
      expect(calculateAnnualLeaveDays("2026-03-15", ref)).toBe(15);
    });

    it("returns 15 days at 1.5 years", () => {
      const ref = new Date("2027-09-15");
      expect(calculateAnnualLeaveDays("2026-03-15", ref)).toBe(15);
    });

    it("returns 15 days at 2 years", () => {
      const ref = new Date("2028-03-15");
      expect(calculateAnnualLeaveDays("2026-03-15", ref)).toBe(15);
    });
  });

  // ---- 3+ years tenure (incremental increase) ----
  describe("3+ years tenure (가산 연차)", () => {
    it("returns 16 days at 3 years (15 + 1)", () => {
      const ref = new Date("2029-03-15");
      expect(calculateAnnualLeaveDays("2026-03-15", ref)).toBe(16);
    });

    it("returns 16 days at 4 years (15 + 1, floor(3/2)=1)", () => {
      const ref = new Date("2030-03-15");
      expect(calculateAnnualLeaveDays("2026-03-15", ref)).toBe(16);
    });

    it("returns 17 days at 5 years (15 + 2, floor(4/2)=2)", () => {
      const ref = new Date("2031-03-15");
      expect(calculateAnnualLeaveDays("2026-03-15", ref)).toBe(17);
    });

    it("returns 18 days at 7 years (15 + 3, floor(6/2)=3)", () => {
      const ref = new Date("2033-03-15");
      expect(calculateAnnualLeaveDays("2026-03-15", ref)).toBe(18);
    });

    it("returns 20 days at 11 years (15 + 5, floor(10/2)=5)", () => {
      const ref = new Date("2037-03-15");
      expect(calculateAnnualLeaveDays("2026-03-15", ref)).toBe(20);
    });

    it("caps at 25 days for very long tenure (21+ years)", () => {
      const ref = new Date("2048-03-15");
      expect(calculateAnnualLeaveDays("2026-03-15", ref)).toBe(25);
    });

    it("caps at 25 days for 30 years tenure", () => {
      const ref = new Date("2056-03-15");
      expect(calculateAnnualLeaveDays("2026-03-15", ref)).toBe(25);
    });
  });

  // ---- Edge cases ----
  describe("edge cases", () => {
    it("handles mid-year hire (July)", () => {
      const ref = new Date("2027-01-15");
      // Hired July 15, 2026 → 6 months at Jan 15, 2027
      expect(calculateAnnualLeaveDays("2026-07-15", ref)).toBe(6);
    });

    it("handles hire on Feb 29 (leap year)", () => {
      const ref = new Date("2029-02-28");
      // Hired Feb 29, 2024 → differenceInYears returns 4 (Feb 28 is before anniversary)
      // 4 years: extraYears=3, extraDays=floor(3/2)=1 → 15+1=16
      expect(calculateAnnualLeaveDays("2024-02-29", ref)).toBe(16);
    });

    it("handles hire on Jan 1", () => {
      const ref = new Date("2027-01-01");
      // Exactly 1 year
      expect(calculateAnnualLeaveDays("2026-01-01", ref)).toBe(15);
    });
  });

  // ---- 80% attendance threshold (Art. 60 §1) ----
  describe("attendance percentage threshold", () => {
    it("MIN_ATTENDANCE_PERCENT is 80", () => {
      expect(MIN_ATTENDANCE_PERCENT).toBe(80);
    });

    it("returns 15 days with exactly 80% attendance at 1 year", () => {
      const ref = new Date("2027-03-15");
      expect(calculateAnnualLeaveDays("2026-03-15", ref, 80)).toBe(15);
    });

    it("returns 0 days with 79% attendance at 1 year", () => {
      const ref = new Date("2027-03-15");
      expect(calculateAnnualLeaveDays("2026-03-15", ref, 79)).toBe(0);
    });

    it("returns 0 days with 50% attendance at 3 years", () => {
      const ref = new Date("2029-03-15");
      expect(calculateAnnualLeaveDays("2026-03-15", ref, 50)).toBe(0);
    });

    it("returns full days with 100% attendance (default)", () => {
      const ref = new Date("2029-03-15");
      expect(calculateAnnualLeaveDays("2026-03-15", ref)).toBe(16);
    });

    it("monthly leave (under 1 year) is not affected by low attendance", () => {
      const ref = new Date("2026-09-15");
      // 6 months, even with 50% attendance — monthly leave not subject to 80% rule
      expect(calculateAnnualLeaveDays("2026-03-15", ref, 50)).toBe(6);
    });

    it("returns 0 with 0% attendance at 5 years", () => {
      const ref = new Date("2031-03-15");
      expect(calculateAnnualLeaveDays("2026-03-15", ref, 0)).toBe(0);
    });
  });
});

describe("calculateRemainingLeave", () => {
  it("returns correct remaining when some used and pending", () => {
    expect(calculateRemainingLeave(15, 5, 2)).toBe(8);
  });

  it("returns 0 when all used", () => {
    expect(calculateRemainingLeave(15, 15, 0)).toBe(0);
  });

  it("returns 0 when overused (should not go negative)", () => {
    expect(calculateRemainingLeave(15, 16, 0)).toBe(0);
  });

  it("returns 0 when pending exceeds remaining", () => {
    expect(calculateRemainingLeave(15, 10, 10)).toBe(0);
  });

  it("returns full grant when nothing used or pending", () => {
    expect(calculateRemainingLeave(15, 0, 0)).toBe(15);
  });

  it("handles half-day values", () => {
    expect(calculateRemainingLeave(15, 3.5, 0.5)).toBe(11);
  });
});

describe("isInProbation", () => {
  it("returns true for hire date less than 3 months ago", () => {
    // Use a date 2 months ago
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const hireDate = twoMonthsAgo.toISOString().split("T")[0];
    expect(isInProbation(hireDate)).toBe(true);
  });

  it("returns false for hire date more than 3 months ago", () => {
    const fourMonthsAgo = new Date();
    fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);
    const hireDate = fourMonthsAgo.toISOString().split("T")[0];
    expect(isInProbation(hireDate)).toBe(false);
  });

  it("respects custom probation period", () => {
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const hireDate = twoMonthsAgo.toISOString().split("T")[0];
    // 1-month probation → 2 months ago should be past probation
    expect(isInProbation(hireDate, 1)).toBe(false);
    // 6-month probation → 2 months ago should be in probation
    expect(isInProbation(hireDate, 6)).toBe(true);
  });

  it("returns false for very old hire date", () => {
    expect(isInProbation("2020-01-01")).toBe(false);
  });
});
