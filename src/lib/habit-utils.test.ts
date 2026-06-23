import { describe, it, expect } from "vitest";
import { isHabitCompleted } from "./habit-utils";
import type { Habit, HabitEntry } from "./types";

function habit(p: Partial<Habit>): Habit {
  return {
    id: "h", name: "H", type: "yes_no", color: "#000",
    intendedRhythm: "daily", streakType: "daily",
    createdAt: "2026-01-01T08:00:00.000Z", archivedAt: null, ...p,
  };
}
function entry(value: HabitEntry["value"]): HabitEntry {
  return { id: "e", habitId: "h", date: "2026-06-01", value,
    createdAt: "x", updatedAt: "x" };
}

describe("isHabitCompleted v2", () => {
  it("yes_no: true completes, false/undefined does not", () => {
    const h = habit({ type: "yes_no" });
    expect(isHabitCompleted(h, entry(true))).toBe(true);
    expect(isHabitCompleted(h, entry(false))).toBe(false);
    expect(isHabitCompleted(h, undefined)).toBe(false);
  });
  it("number with target: >= target completes", () => {
    const h = habit({ type: "number", target: 8 });
    expect(isHabitCompleted(h, entry(8))).toBe(true);
    expect(isHabitCompleted(h, entry(7))).toBe(false);
  });
  it("number without target: > 0 completes", () => {
    const h = habit({ type: "number" });
    expect(isHabitCompleted(h, entry(1))).toBe(true);
    expect(isHabitCompleted(h, entry(0))).toBe(false);
  });
  it("duration with target: >= target completes", () => {
    const h = habit({ type: "duration", target: 20 });
    expect(isHabitCompleted(h, entry(20))).toBe(true);
    expect(isHabitCompleted(h, entry(19))).toBe(false);
  });
  it("rating: any of low/okay/great counts as completed", () => {
    const h = habit({ type: "rating", streakType: "none" });
    expect(isHabitCompleted(h, entry("low"))).toBe(true);
    expect(isHabitCompleted(h, entry("okay"))).toBe(true);
    expect(isHabitCompleted(h, entry("great"))).toBe(true);
    expect(isHabitCompleted(h, undefined)).toBe(false);
  });
});

import { streakStatus, longestStreak, computeStats, completionRate } from "./habit-utils";
import type { AppSettings } from "./types";

const MON: AppSettings = { weekStartsOn: 1 };
function e(date: string, value: HabitEntry["value"] = true): HabitEntry {
  return { id: date, habitId: "h", date, value, createdAt: "x", updatedAt: "x" };
}

describe("streakStatus daily", () => {
  const h = habit({ streakType: "daily", createdAt: "2026-06-01T08:00:00.000Z" });
  it("counts consecutive completed days ending today", () => {
    const s = streakStatus(h, [e("2026-06-08"), e("2026-06-09"), e("2026-06-10")], "2026-06-10", MON);
    expect(s).toEqual({ type: "daily", count: 3, todayLogged: true });
  });
  it("grace: unlogged today keeps streak through yesterday", () => {
    const s = streakStatus(h, [e("2026-06-08"), e("2026-06-09")], "2026-06-10", MON);
    expect(s).toEqual({ type: "daily", count: 2, todayLogged: false });
  });
  it("a gap breaks the streak", () => {
    const s = streakStatus(h, [e("2026-06-07"), e("2026-06-09"), e("2026-06-10")], "2026-06-10", MON);
    expect(s.type === "daily" && s.count).toBe(2);
  });
});

describe("streakStatus weekly", () => {
  // weeks (Mon start): Jun1-7, Jun8-14, Jun15-21, today Jun17
  const h = habit({
    type: "duration", streakType: "weekly", intendedRhythm: "multiple_per_week",
    intendedCountPerWeek: 2, createdAt: "2026-05-25T08:00:00.000Z",
  });
  const v = (d: string) => e(d, 30); // duration completes (>0)
  it("counts met past weeks; current week in-progress doesn't break", () => {
    const s = streakStatus(h, [
      v("2026-06-01"), v("2026-06-03"), // wk Jun1: 2 ✓
      v("2026-06-08"), v("2026-06-10"), // wk Jun8: 2 ✓
      v("2026-06-15"),                  // wk Jun15 (current): 1 of 2
    ], "2026-06-17", MON);
    expect(s).toEqual({ type: "weekly", count: 2, thisWeek: 1, required: 2, met: false });
  });
  it("current week counts once it meets the required count", () => {
    const s = streakStatus(h, [
      v("2026-06-01"), v("2026-06-03"),
      v("2026-06-08"), v("2026-06-10"),
      v("2026-06-15"), v("2026-06-16"), // current week now 2 ✓
    ], "2026-06-17", MON);
    expect(s).toEqual({ type: "weekly", count: 3, thisWeek: 2, required: 2, met: true });
  });
  it("a finished week below target resets the streak", () => {
    const s = streakStatus(h, [
      v("2026-06-01"),                  // wk Jun1: 1 of 2 ✗ (finished)
      v("2026-06-08"), v("2026-06-10"), // wk Jun8: 2 ✓
      v("2026-06-15"), v("2026-06-16"), // current: 2 ✓
    ], "2026-06-17", MON);
    expect(s.type === "weekly" && s.count).toBe(2); // Jun8 + current, Jun1 breaks
  });
});

describe("streakStatus none", () => {
  it("returns none for streakType none", () => {
    const h = habit({ type: "rating", streakType: "none" });
    expect(streakStatus(h, [e("2026-06-10", "great")], "2026-06-10", MON)).toEqual({ type: "none" });
  });
});

describe("longestStreak", () => {
  it("daily: longest completed run", () => {
    const h = habit({ streakType: "daily", createdAt: "2026-06-01T08:00:00.000Z" });
    const got = longestStreak(h, [e("2026-06-01"), e("2026-06-02"), e("2026-06-04")], "2026-06-05", MON);
    expect(got).toBe(2);
  });
  it("none: 0", () => {
    const h = habit({ type: "rating", streakType: "none" });
    expect(longestStreak(h, [e("2026-06-01", "low")], "2026-06-05", MON)).toBe(0);
  });
});
