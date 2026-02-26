import { describe, it, expect } from "vitest";
import {
  calculateDailyOvertime,
  calculateWeeklyTotal,
  getOvertimeWarningLevel,
  STANDARD_WEEKLY_MINUTES,
  MAX_WEEKLY_MINUTES,
  DEFAULT_DAILY_WORK_MINUTES,
} from "./work-hours";

describe("constants", () => {
  it("STANDARD_WEEKLY_MINUTES is 2400 (40 hours)", () => {
    expect(STANDARD_WEEKLY_MINUTES).toBe(2400);
  });

  it("MAX_WEEKLY_MINUTES is 3120 (52 hours)", () => {
    expect(MAX_WEEKLY_MINUTES).toBe(3120);
  });

  it("DEFAULT_DAILY_WORK_MINUTES is 480 (8 hours)", () => {
    expect(DEFAULT_DAILY_WORK_MINUTES).toBe(480);
  });
});

describe("calculateDailyOvertime", () => {
  it("returns 0 for exactly 8 hours (no overtime)", () => {
    expect(calculateDailyOvertime(480)).toBe(0);
  });

  it("returns 0 for under 8 hours", () => {
    expect(calculateDailyOvertime(420)).toBe(0);
  });

  it("returns overtime minutes for over 8 hours", () => {
    expect(calculateDailyOvertime(600)).toBe(120); // 10hrs - 8hrs = 2hrs
  });

  it("returns 0 for 0 minutes worked", () => {
    expect(calculateDailyOvertime(0)).toBe(0);
  });

  it("respects custom standard minutes", () => {
    // 6-hour standard, worked 7 hours
    expect(calculateDailyOvertime(420, 360)).toBe(60);
  });

  it("handles 1 minute of overtime", () => {
    expect(calculateDailyOvertime(481)).toBe(1);
  });
});

describe("calculateWeeklyTotal", () => {
  describe("normal work week (40 hours)", () => {
    it("calculates standard 5-day work week correctly", () => {
      const daily = [480, 480, 480, 480, 480]; // Mon-Fri, 8hrs each
      const result = calculateWeeklyTotal(daily);

      expect(result.totalWorkMinutes).toBe(2400);
      expect(result.totalOvertimeMinutes).toBe(0);
      expect(result.isOverLimit).toBe(false);
      expect(result.remainingMinutes).toBe(720); // 12hrs overtime available
      expect(result.utilizationPercent).toBe(77); // 2400/3120 ~ 77%
    });
  });

  describe("overtime scenarios", () => {
    it("calculates overtime for 48-hour week", () => {
      // 5 days x 8hrs + Saturday 8hrs = 48hrs
      const daily = [480, 480, 480, 480, 480, 480];
      const result = calculateWeeklyTotal(daily);

      expect(result.totalWorkMinutes).toBe(2880);
      expect(result.totalOvertimeMinutes).toBe(480); // 8hrs overtime
      expect(result.isOverLimit).toBe(false);
      expect(result.remainingMinutes).toBe(240); // 4hrs remaining
    });

    it("handles exactly 52 hours (at the legal limit)", () => {
      // 52 hours = 3120 minutes
      const daily = [540, 540, 540, 540, 540, 420]; // ~52hrs total
      const totalMins = daily.reduce((a, b) => a + b, 0);
      expect(totalMins).toBe(3120);

      const result = calculateWeeklyTotal(daily);

      expect(result.totalWorkMinutes).toBe(3120);
      expect(result.totalOvertimeMinutes).toBe(720); // 12hrs overtime
      expect(result.isOverLimit).toBe(false); // exactly at limit, not over
      expect(result.remainingMinutes).toBe(0);
      expect(result.utilizationPercent).toBe(100);
    });

    it("flags over-limit for 52 hours + 1 minute", () => {
      const daily = [540, 540, 540, 540, 540, 421]; // 3121 minutes
      const result = calculateWeeklyTotal(daily);

      expect(result.totalWorkMinutes).toBe(3121);
      expect(result.isOverLimit).toBe(true);
      expect(result.remainingMinutes).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("handles empty array (no work days)", () => {
      const result = calculateWeeklyTotal([]);

      expect(result.totalWorkMinutes).toBe(0);
      expect(result.totalOvertimeMinutes).toBe(0);
      expect(result.isOverLimit).toBe(false);
      expect(result.remainingMinutes).toBe(3120);
      expect(result.utilizationPercent).toBe(0);
    });

    it("handles single day of work", () => {
      const result = calculateWeeklyTotal([480]);

      expect(result.totalWorkMinutes).toBe(480);
      expect(result.totalOvertimeMinutes).toBe(0);
      expect(result.isOverLimit).toBe(false);
    });

    it("handles 7-day work week", () => {
      const daily = [480, 480, 480, 480, 480, 480, 480]; // 56hrs
      const result = calculateWeeklyTotal(daily);

      expect(result.totalWorkMinutes).toBe(3360);
      expect(result.isOverLimit).toBe(true);
      expect(result.totalOvertimeMinutes).toBe(960); // 16hrs overtime
    });

    it("handles very short work days", () => {
      const daily = [60, 60, 60]; // 3 hours total
      const result = calculateWeeklyTotal(daily);

      expect(result.totalWorkMinutes).toBe(180);
      expect(result.totalOvertimeMinutes).toBe(0);
      expect(result.isOverLimit).toBe(false);
    });
  });
});

describe("getOvertimeWarningLevel", () => {
  it("returns 'safe' for under 40 hours (2400 min)", () => {
    expect(getOvertimeWarningLevel(2000)).toBe("safe");
  });

  it("returns 'safe' for exactly 40 hours", () => {
    expect(getOvertimeWarningLevel(2400)).toBe("safe");
  });

  it("returns 'warning' for over 40 hours but under alert threshold", () => {
    // Default alert threshold is 48hrs (2880 min)
    expect(getOvertimeWarningLevel(2500)).toBe("warning");
    expect(getOvertimeWarningLevel(2879)).toBe("warning");
  });

  it("returns 'danger' for over alert threshold (48hrs) but under 52hrs", () => {
    expect(getOvertimeWarningLevel(2881)).toBe("danger");
    expect(getOvertimeWarningLevel(3000)).toBe("danger");
    expect(getOvertimeWarningLevel(3119)).toBe("danger");
  });

  it("returns 'danger' for exactly at alert threshold (48hrs)", () => {
    // 48 * 60 = 2880, which is NOT > 2880, so it's 'warning'
    expect(getOvertimeWarningLevel(2880)).toBe("warning");
  });

  it("returns 'exceeded' for over 52 hours", () => {
    expect(getOvertimeWarningLevel(3121)).toBe("exceeded");
    expect(getOvertimeWarningLevel(4000)).toBe("exceeded");
  });

  it("returns 'exceeded' for exactly at 52-hour limit + 1 min", () => {
    // 3120 is NOT > 3120, so it's 'danger'
    expect(getOvertimeWarningLevel(3120)).toBe("danger");
    expect(getOvertimeWarningLevel(3121)).toBe("exceeded");
  });

  it("respects custom alert threshold", () => {
    // Custom threshold at 45 hours (2700 min)
    expect(getOvertimeWarningLevel(2600, 45)).toBe("warning"); // over 40, under 45
    expect(getOvertimeWarningLevel(2701, 45)).toBe("danger");  // over 45, under 52
  });
});
