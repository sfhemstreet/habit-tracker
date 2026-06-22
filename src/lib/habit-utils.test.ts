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
