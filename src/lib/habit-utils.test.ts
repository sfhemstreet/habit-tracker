import { describe, it, expect } from "vitest";
import type { Habit, HabitEntry } from "./types";
import {
  isHabitCompleted,
  isScheduledOn,
  currentStreak,
  longestStreak,
  completionRate,
  totalCompletions,
  missedDays,
  computeStats,
  formatValue,
} from "./habit-utils";

function habit(partial: Partial<Habit>): Habit {
  return {
    id: "h1",
    name: "Test",
    type: "boolean",
    color: "#5B6CF0",
    frequency: "daily",
    createdAt: "2026-06-01T08:00:00.000Z",
    archivedAt: null,
    ...partial,
  };
}

function entry(date: string, value: HabitEntry["value"]): HabitEntry {
  return {
    id: `e-${date}`,
    habitId: "h1",
    date,
    value,
    createdAt: `${date}T08:00:00.000Z`,
    updatedAt: `${date}T08:00:00.000Z`,
  };
}

describe("isHabitCompleted", () => {
  it("boolean: true only when value is true", () => {
    const h = habit({ type: "boolean" });
    expect(isHabitCompleted(h, entry("2026-06-10", true))).toBe(true);
    expect(isHabitCompleted(h, entry("2026-06-10", false))).toBe(false);
    expect(isHabitCompleted(h, undefined)).toBe(false);
  });

  it("number without target: completed when > 0", () => {
    const h = habit({ type: "number" });
    expect(isHabitCompleted(h, entry("2026-06-10", 1))).toBe(true);
    expect(isHabitCompleted(h, entry("2026-06-10", 0))).toBe(false);
  });

  it("number with target: completed when >= target", () => {
    const h = habit({ type: "number", target: 8 });
    expect(isHabitCompleted(h, entry("2026-06-10", 8))).toBe(true);
    expect(isHabitCompleted(h, entry("2026-06-10", 7))).toBe(false);
  });

  it("duration with target behaves like number", () => {
    const h = habit({ type: "duration", target: 20 });
    expect(isHabitCompleted(h, entry("2026-06-10", 25))).toBe(true);
    expect(isHabitCompleted(h, entry("2026-06-10", 5))).toBe(false);
  });

  it("time: completed when a non-empty string value exists", () => {
    const h = habit({ type: "time" });
    expect(isHabitCompleted(h, entry("2026-06-10", "23:20"))).toBe(true);
    expect(isHabitCompleted(h, entry("2026-06-10", ""))).toBe(false);
  });

  it("category: completed when an option id exists", () => {
    const h = habit({ type: "category" });
    expect(isHabitCompleted(h, entry("2026-06-10", "opt-1"))).toBe(true);
    expect(isHabitCompleted(h, entry("2026-06-10", ""))).toBe(false);
  });
});

describe("isScheduledOn", () => {
  it("daily is always scheduled", () => {
    expect(isScheduledOn(habit({ frequency: "daily" }), "2026-06-21")).toBe(true);
  });
  it("custom respects activeDays (0=Sun)", () => {
    const h = habit({ frequency: "custom", activeDays: [1, 3, 5] }); // Mon/Wed/Fri
    expect(isScheduledOn(h, "2026-06-22")).toBe(true); // Monday
    expect(isScheduledOn(h, "2026-06-21")).toBe(false); // Sunday
  });
});

describe("currentStreak (daily, boolean)", () => {
  const today = "2026-06-21";
  it("counts consecutive completed days including today", () => {
    const h = habit({ createdAt: "2026-06-01T08:00:00.000Z" });
    const entries = [entry("2026-06-19", true), entry("2026-06-20", true), entry("2026-06-21", true)];
    expect(currentStreak(h, entries, today)).toBe(3);
  });

  it("today not logged does NOT break the streak (grace rule)", () => {
    const h = habit({ createdAt: "2026-06-01T08:00:00.000Z" });
    const entries = [entry("2026-06-19", true), entry("2026-06-20", true)]; // no today
    expect(currentStreak(h, entries, today)).toBe(2);
  });

  it("a past missed day breaks the streak", () => {
    const h = habit({ createdAt: "2026-06-01T08:00:00.000Z" });
    const entries = [entry("2026-06-18", true), entry("2026-06-20", true), entry("2026-06-21", true)];
    // 2026-06-19 is missing → streak is only 20th + 21st
    expect(currentStreak(h, entries, today)).toBe(2);
  });

  it("returns 0 when today incomplete and yesterday missed", () => {
    const h = habit({ createdAt: "2026-06-01T08:00:00.000Z" });
    const entries = [entry("2026-06-19", true)];
    expect(currentStreak(h, entries, today)).toBe(0);
  });
});

describe("currentStreak (custom schedule)", () => {
  it("skips unscheduled days when counting", () => {
    // Mon/Wed/Fri habit. Today Fri 2026-06-19.
    const h = habit({ frequency: "custom", activeDays: [1, 3, 5], createdAt: "2026-06-01T08:00:00.000Z" });
    const entries = [entry("2026-06-15", true), entry("2026-06-17", true), entry("2026-06-19", true)];
    expect(currentStreak(h, entries, "2026-06-19")).toBe(3);
  });
});

describe("longestStreak", () => {
  it("finds the longest historical run", () => {
    const h = habit({ createdAt: "2026-06-01T08:00:00.000Z" });
    const entries = [
      entry("2026-06-01", true),
      entry("2026-06-02", true),
      entry("2026-06-03", true),
      // gap on 4th
      entry("2026-06-05", true),
      entry("2026-06-06", true),
    ];
    expect(longestStreak(h, entries, "2026-06-21")).toBe(3);
  });

  it("respects a custom Mon/Wed/Fri schedule", () => {
    const h = habit({ frequency: "custom", activeDays: [1, 3, 5], createdAt: "2026-06-01T08:00:00.000Z" });
    // Mon 06-15, Wed 06-17, Fri 06-19, Mon 06-22 completed (4 in a row); Wed 06-24 missed
    const entries = [
      entry("2026-06-15", true),
      entry("2026-06-17", true),
      entry("2026-06-19", true),
      entry("2026-06-22", true),
    ];
    expect(longestStreak(h, entries, "2026-06-26")).toBe(4);
  });
});

describe("completionRate", () => {
  it("is completed/scheduled within the window", () => {
    const h = habit({ createdAt: "2026-06-01T08:00:00.000Z" });
    const entries = [
      entry("2026-06-15", true),
      entry("2026-06-16", true),
      entry("2026-06-17", false),
      entry("2026-06-18", true),
      entry("2026-06-19", true),
      entry("2026-06-20", true),
      entry("2026-06-21", true),
    ];
    // 7-day window ending 2026-06-21: 7 scheduled, 6 completed
    expect(completionRate(h, entries, 7, "2026-06-21")).toBeCloseTo(6 / 7);
  });

  it("returns 0 when nothing scheduled in window", () => {
    const h = habit({ frequency: "custom", activeDays: [], createdAt: "2026-06-01T08:00:00.000Z" });
    expect(completionRate(h, [], 7, "2026-06-21")).toBe(0);
  });
});

describe("totalCompletions & missedDays", () => {
  it("counts completed entries and past missed scheduled days", () => {
    const h = habit({ createdAt: "2026-06-19T08:00:00.000Z" });
    const entries = [entry("2026-06-19", true), entry("2026-06-20", false)];
    // today = 21 (pending, excluded). Day 19 completed, day 20 missed.
    expect(totalCompletions(h, entries)).toBe(1);
    expect(missedDays(h, entries, "2026-06-21")).toBe(1);
  });
});

describe("computeStats", () => {
  it("bundles all stats", () => {
    const h = habit({ createdAt: "2026-06-19T08:00:00.000Z" });
    const entries = [entry("2026-06-19", true), entry("2026-06-20", true), entry("2026-06-21", true)];
    const s = computeStats(h, entries, "2026-06-21");
    expect(s.currentStreak).toBe(3);
    expect(s.longestStreak).toBe(3);
    expect(s.totalCompletions).toBe(3);
    expect(s.missedDays).toBe(0);
  });
});

describe("formatValue", () => {
  it("boolean", () => {
    expect(formatValue(habit({ type: "boolean" }), true)).toBe("Done");
    expect(formatValue(habit({ type: "boolean" }), false)).toBe("Not done");
  });
  it("number with unit", () => {
    expect(formatValue(habit({ type: "number", targetUnit: "glasses" }), 5)).toBe("5 glasses");
  });
  it("duration", () => {
    expect(formatValue(habit({ type: "duration" }), 20)).toBe("20m");
    expect(formatValue(habit({ type: "duration" }), 65)).toBe("1h 5m");
    expect(formatValue(habit({ type: "duration" }), 120)).toBe("2h");
  });
  it("time to 12-hour", () => {
    expect(formatValue(habit({ type: "time" }), "23:20")).toBe("11:20 PM");
    expect(formatValue(habit({ type: "time" }), "00:05")).toBe("12:05 AM");
  });
  it("category resolves the option label", () => {
    const h = habit({
      type: "category",
      categoryOptions: [{ id: "opt-1", label: "Strength" }],
    });
    expect(formatValue(h, "opt-1")).toBe("Strength");
  });
});
