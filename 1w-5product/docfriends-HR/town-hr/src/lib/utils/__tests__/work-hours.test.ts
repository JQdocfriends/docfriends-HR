import { describe, it, expect } from "vitest";
import {
  calculateDailyOvertime,
  calculateWeeklyTotal,
  getOvertimeWarningLevel,
  STANDARD_WEEKLY_MINUTES,
  MAX_WEEKLY_MINUTES,
  DEFAULT_DAILY_WORK_MINUTES,
} from "../work-hours";

describe("constants", () => {
  it("STANDARD_WEEKLY_MINUTES is 40 hours", () => {
    expect(STANDARD_WEEKLY_MINUTES).toBe(2400);
  });

  it("MAX_WEEKLY_MINUTES is 52 hours", () => {
    expect(MAX_WEEKLY_MINUTES).toBe(3120);
  });

  it("DEFAULT_DAILY_WORK_MINUTES is 8 hours", () => {
    expect(DEFAULT_DAILY_WORK_MINUTES).toBe(480);
  });
});

describe("calculateDailyOvertime", () => {
  it("returns 0 for exactly 8 hours (480 min)", () => {
    expect(calculateDailyOvertime(480)).toBe(0);
  });

  it("returns 0 for less than 8 hours", () => {
    expect(calculateDailyOvertime(360)).toBe(0);
  });

  it("returns 60 for 9 hours (540 min)", () => {
    expect(calculateDailyOvertime(540)).toBe(60);
  });

  it("returns 120 for 10 hours (600 min)", () => {
    expect(calculateDailyOvertime(600)).toBe(120);
  });

  it("returns 0 for 0 minutes", () => {
    expect(calculateDailyOvertime(0)).toBe(0);
  });

  it("respects custom standard minutes", () => {
    // 7-hour standard
    expect(calculateDailyOvertime(480, 420)).toBe(60);
  });

  it("returns 0 when work matches custom standard", () => {
    expect(calculateDailyOvertime(420, 420)).toBe(0);
  });
});

describe("calculateWeeklyTotal", () => {
  it("calculates standard 40-hour week correctly", () => {
    // 5 days x 480 min = 2400
    const daily = [480, 480, 480, 480, 480];
    const result = calculateWeeklyTotal(daily);
    expect(result.totalWorkMinutes).toBe(2400);
    expect(result.totalOvertimeMinutes).toBe(0);
    expect(result.isOverLimit).toBe(false);
    expect(result.remainingMinutes).toBe(720); // 3120 - 2400
    expect(result.utilizationPercent).toBe(77); // 2400/3120
  });

  it("detects overtime but within 52-hour limit", () => {
    // 5 days x 540 min = 2700 (45 hours)
    const daily = [540, 540, 540, 540, 540];
    const result = calculateWeeklyTotal(daily);
    expect(result.totalWorkMinutes).toBe(2700);
    expect(result.totalOvertimeMinutes).toBe(300); // 2700 - 2400
    expect(result.isOverLimit).toBe(false);
    expect(result.remainingMinutes).toBe(420); // 3120 - 2700
  });

  it("detects exactly 52-hour week (not over limit)", () => {
    // 3120 minutes = 52 hours
    const daily = [624, 624, 624, 624, 624]; // 5 x 624 = 3120
    const result = calculateWeeklyTotal(daily);
    expect(result.totalWorkMinutes).toBe(3120);
    expect(result.totalOvertimeMinutes).toBe(720);
    expect(result.isOverLimit).toBe(false); // exactly 52 is NOT over
    expect(result.remainingMinutes).toBe(0);
    expect(result.utilizationPercent).toBe(100);
  });

  it("detects over 52-hour limit", () => {
    // 5 days x 660 min = 3300 (55 hours)
    const daily = [660, 660, 660, 660, 660];
    const result = calculateWeeklyTotal(daily);
    expect(result.totalWorkMinutes).toBe(3300);
    expect(result.totalOvertimeMinutes).toBe(900);
    expect(result.isOverLimit).toBe(true);
    expect(result.remainingMinutes).toBe(0);
  });

  it("handles empty array (no work)", () => {
    const result = calculateWeeklyTotal([]);
    expect(result.totalWorkMinutes).toBe(0);
    expect(result.totalOvertimeMinutes).toBe(0);
    expect(result.isOverLimit).toBe(false);
    expect(result.remainingMinutes).toBe(3120);
    expect(result.utilizationPercent).toBe(0);
  });

  it("handles partial week (3 days)", () => {
    const daily = [480, 480, 480];
    const result = calculateWeeklyTotal(daily);
    expect(result.totalWorkMinutes).toBe(1440);
    expect(result.totalOvertimeMinutes).toBe(0);
    expect(result.isOverLimit).toBe(false);
  });

  it("handles weekend work (7 days)", () => {
    // Mon-Fri: 480 each, Sat-Sun: 300 each = 3000
    const daily = [480, 480, 480, 480, 480, 300, 300];
    const result = calculateWeeklyTotal(daily);
    expect(result.totalWorkMinutes).toBe(3000);
    expect(result.totalOvertimeMinutes).toBe(600);
    expect(result.isOverLimit).toBe(false);
  });

  it("handles extreme case: 1 minute over 52 hours", () => {
    const result = calculateWeeklyTotal([3121]);
    expect(result.isOverLimit).toBe(true);
    expect(result.remainingMinutes).toBe(0);
  });
});

describe("getOvertimeWarningLevel", () => {
  it("returns 'safe' for under 40 hours", () => {
    expect(getOvertimeWarningLevel(2000)).toBe("safe");
  });

  it("returns 'safe' for exactly 40 hours", () => {
    expect(getOvertimeWarningLevel(2400)).toBe("safe");
  });

  it("returns 'warning' for 41 hours (just over standard)", () => {
    expect(getOvertimeWarningLevel(2460)).toBe("warning");
  });

  it("returns 'warning' for 47 hours (below alert threshold)", () => {
    expect(getOvertimeWarningLevel(2820)).toBe("warning");
  });

  it("returns 'danger' at default 48-hour threshold", () => {
    expect(getOvertimeWarningLevel(2881)).toBe("danger");
  });

  it("returns 'danger' for 50 hours", () => {
    expect(getOvertimeWarningLevel(3000)).toBe("danger");
  });

  it("returns 'exceeded' for over 52 hours", () => {
    expect(getOvertimeWarningLevel(3121)).toBe("exceeded");
  });

  it("returns 'exceeded' for exactly 52 hours + 1 min", () => {
    expect(getOvertimeWarningLevel(3121)).toBe("exceeded");
  });

  it("returns 'danger' at exactly 52 hours (not exceeded)", () => {
    // 3120 = exactly 52 hours, which is > 48*60=2880 → danger
    expect(getOvertimeWarningLevel(3120)).toBe("danger");
  });

  it("respects custom alert threshold (45 hours)", () => {
    // 46 hours = 2760 min, threshold at 45 hours = 2700 min
    expect(getOvertimeWarningLevel(2760, 45)).toBe("danger");
    // 44 hours = 2640 min, threshold at 45 hours
    expect(getOvertimeWarningLevel(2640, 45)).toBe("warning");
  });

  it("returns 'safe' for 0 minutes", () => {
    expect(getOvertimeWarningLevel(0)).toBe("safe");
  });
});
