import { describe, it, expect } from "vitest";
import {
  toDayKey,
  parseDayKey,
  todayKey,
  addDays,
  weekdayOf,
  eachDayInRange,
  isFuture,
  startOfWeekKey,
  daysBetween,
  formatLongDate,
} from "./date-utils";

describe("toDayKey / parseDayKey", () => {
  it("formats a local date as YYYY-MM-DD", () => {
    expect(toDayKey(new Date(2026, 5, 21))).toBe("2026-06-21"); // June = month 5
  });
  it("zero-pads month and day", () => {
    expect(toDayKey(new Date(2026, 0, 3))).toBe("2026-01-03");
  });
  it("round-trips through parseDayKey", () => {
    const d = parseDayKey("2026-06-21");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(21);
  });
});

describe("todayKey", () => {
  it("uses the provided now", () => {
    expect(todayKey(new Date(2026, 5, 21, 23, 59))).toBe("2026-06-21");
  });
});

describe("addDays", () => {
  it("adds days across a month boundary", () => {
    expect(addDays("2026-06-30", 1)).toBe("2026-07-01");
  });
  it("subtracts days across a year boundary", () => {
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("weekdayOf", () => {
  it("returns 0 for Sunday", () => {
    expect(weekdayOf("2026-06-21")).toBe(0); // 2026-06-21 is a Sunday
  });
  it("returns 1 for Monday", () => {
    expect(weekdayOf("2026-06-22")).toBe(1);
  });
});

describe("eachDayInRange", () => {
  it("returns inclusive range", () => {
    expect(eachDayInRange("2026-06-21", "2026-06-23")).toEqual([
      "2026-06-21",
      "2026-06-22",
      "2026-06-23",
    ]);
  });
  it("returns a single day when from === to", () => {
    expect(eachDayInRange("2026-06-21", "2026-06-21")).toEqual(["2026-06-21"]);
  });
  it("returns empty when from is after to", () => {
    expect(eachDayInRange("2026-06-23", "2026-06-21")).toEqual([]);
  });
});

describe("isFuture", () => {
  it("is true for a day after now", () => {
    expect(isFuture("2026-06-22", new Date(2026, 5, 21))).toBe(true);
  });
  it("is false for today and past", () => {
    expect(isFuture("2026-06-21", new Date(2026, 5, 21))).toBe(false);
    expect(isFuture("2026-06-20", new Date(2026, 5, 21))).toBe(false);
  });
});

describe("startOfWeekKey", () => {
  it("Monday start: Sunday 2026-06-21 belongs to week starting 2026-06-15", () => {
    expect(startOfWeekKey("2026-06-21", 1)).toBe("2026-06-15");
  });
  it("Sunday start: 2026-06-21 is its own week start", () => {
    expect(startOfWeekKey("2026-06-21", 0)).toBe("2026-06-21");
  });
});

describe("daysBetween", () => {
  it("counts whole days from a to b", () => {
    expect(daysBetween("2026-06-21", "2026-06-24")).toBe(3);
    expect(daysBetween("2026-06-24", "2026-06-21")).toBe(-3);
  });
});

describe("formatLongDate", () => {
  it("formats deterministically", () => {
    expect(formatLongDate("2026-06-21")).toBe("Sunday, June 21");
  });
});
