import { describe, it, expect } from "vitest";
import {
  formatDateKo,
  formatDateISO,
  formatTimeKo,
  formatDateTimeKo,
  getWeekStartMonday,
  getWeekEndSunday,
  calculateWorkMinutes,
  formatMinutesKo,
  formatNumberKo,
} from "./date";

describe("formatDateKo", () => {
  it("formats Date object in Korean style", () => {
    const result = formatDateKo(new Date("2026-03-15"));
    expect(result).toBe("2026년 03월 15일");
  });

  it("formats ISO string in Korean style", () => {
    const result = formatDateKo("2026-01-01");
    expect(result).toBe("2026년 01월 01일");
  });

  it("handles leap year date", () => {
    const result = formatDateKo(new Date("2024-02-29"));
    expect(result).toBe("2024년 02월 29일");
  });
});

describe("formatDateISO", () => {
  it("formats date as YYYY-MM-DD", () => {
    const result = formatDateISO(new Date("2026-03-15"));
    expect(result).toBe("2026-03-15");
  });

  it("pads single-digit months and days", () => {
    const result = formatDateISO(new Date("2026-01-05"));
    expect(result).toBe("2026-01-05");
  });
});

describe("formatTimeKo", () => {
  it("formats time in Korean style", () => {
    const d = new Date("2026-03-15T14:30:00");
    const result = formatTimeKo(d);
    expect(result).toBe("14시 30분");
  });

  it("formats midnight correctly", () => {
    const d = new Date("2026-03-15T00:00:00");
    const result = formatTimeKo(d);
    expect(result).toBe("00시 00분");
  });
});

describe("formatDateTimeKo", () => {
  it("formats full datetime in Korean style", () => {
    const result = formatDateTimeKo(new Date("2026-03-15T09:30:00"));
    expect(result).toBe("2026년 03월 15일 09:30");
  });

  it("accepts ISO string input", () => {
    const result = formatDateTimeKo("2026-03-15T14:00:00");
    expect(result).toBe("2026년 03월 15일 14:00");
  });
});

describe("getWeekStartMonday", () => {
  it("returns Monday for a Wednesday", () => {
    // March 18, 2026 is a Wednesday
    const result = getWeekStartMonday(new Date("2026-03-18"));
    expect(result.getDay()).toBe(1); // Monday
    expect(formatDateISO(result)).toBe("2026-03-16");
  });

  it("returns same day for Monday", () => {
    // March 16, 2026 is a Monday
    const result = getWeekStartMonday(new Date("2026-03-16"));
    expect(formatDateISO(result)).toBe("2026-03-16");
  });

  it("returns previous Monday for Sunday", () => {
    // March 22, 2026 is a Sunday
    const result = getWeekStartMonday(new Date("2026-03-22"));
    expect(formatDateISO(result)).toBe("2026-03-16");
  });
});

describe("getWeekEndSunday", () => {
  it("returns Sunday for a Wednesday", () => {
    // March 18, 2026 is a Wednesday
    const result = getWeekEndSunday(new Date("2026-03-18"));
    expect(result.getDay()).toBe(0); // Sunday
    expect(formatDateISO(result)).toBe("2026-03-22");
  });

  it("returns same day for Sunday", () => {
    // March 22, 2026 is a Sunday
    const result = getWeekEndSunday(new Date("2026-03-22"));
    expect(formatDateISO(result)).toBe("2026-03-22");
  });
});

describe("calculateWorkMinutes", () => {
  it("calculates standard 9-18 workday with 1hr lunch as 480 min", () => {
    const checkIn = new Date("2026-03-15T09:00:00");
    const checkOut = new Date("2026-03-15T18:00:00");
    expect(calculateWorkMinutes(checkIn, checkOut)).toBe(480); // 9hrs - 1hr lunch
  });

  it("calculates overtime day (9-21) correctly", () => {
    const checkIn = new Date("2026-03-15T09:00:00");
    const checkOut = new Date("2026-03-15T21:00:00");
    expect(calculateWorkMinutes(checkIn, checkOut)).toBe(660); // 12hrs - 1hr
  });

  it("handles custom lunch break duration", () => {
    const checkIn = new Date("2026-03-15T09:00:00");
    const checkOut = new Date("2026-03-15T18:00:00");
    expect(calculateWorkMinutes(checkIn, checkOut, 90)).toBe(450); // 9hrs - 1.5hr
  });

  it("handles no lunch break", () => {
    const checkIn = new Date("2026-03-15T09:00:00");
    const checkOut = new Date("2026-03-15T13:00:00");
    expect(calculateWorkMinutes(checkIn, checkOut, 0)).toBe(240); // 4hrs exactly
  });

  it("returns 0 when work time is less than lunch break", () => {
    const checkIn = new Date("2026-03-15T09:00:00");
    const checkOut = new Date("2026-03-15T09:30:00");
    expect(calculateWorkMinutes(checkIn, checkOut)).toBe(0); // 30min - 60min lunch = 0 (clamped)
  });

  it("handles cross-midnight shift", () => {
    const checkIn = new Date("2026-03-15T22:00:00");
    const checkOut = new Date("2026-03-16T06:00:00");
    expect(calculateWorkMinutes(checkIn, checkOut)).toBe(420); // 8hrs - 1hr lunch
  });
});

describe("formatMinutesKo", () => {
  it("formats hours and minutes", () => {
    expect(formatMinutesKo(510)).toBe("8시간 30분");
  });

  it("formats whole hours only", () => {
    expect(formatMinutesKo(480)).toBe("8시간");
  });

  it("formats minutes only (under 1 hour)", () => {
    expect(formatMinutesKo(45)).toBe("45분");
  });

  it("formats zero minutes", () => {
    expect(formatMinutesKo(0)).toBe("0분");
  });

  it("formats large values", () => {
    expect(formatMinutesKo(3120)).toBe("52시간");
  });
});

describe("formatNumberKo", () => {
  it("formats number with Korean locale (comma separator)", () => {
    expect(formatNumberKo(1000)).toBe("1,000");
  });

  it("formats large number", () => {
    expect(formatNumberKo(1234567)).toBe("1,234,567");
  });

  it("formats number under 1000 without comma", () => {
    expect(formatNumberKo(999)).toBe("999");
  });
});
