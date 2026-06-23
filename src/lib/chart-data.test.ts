import { describe, it, expect } from "vitest";
import { buildRatingDistribution, buildTrendSeries } from "./chart-data";
import type { Habit, HabitEntry } from "./types";

function h(p: Partial<Habit>): Habit {
  return { id: "h", name: "H", type: "rating", color: "#000",
    intendedRhythm: "whenever", streakType: "none",
    createdAt: "2026-06-01T08:00:00.000Z", archivedAt: null, ...p };
}
function e(date: string, value: HabitEntry["value"]): HabitEntry {
  return { id: date, habitId: "h", date, value, createdAt: "x", updatedAt: "x" };
}

describe("buildRatingDistribution", () => {
  it("counts low/okay/great in fixed order", () => {
    const d = buildRatingDistribution(h({}), [e("2026-06-01", "great"), e("2026-06-02", "great"), e("2026-06-03", "low")]);
    expect(d).toEqual([
      { label: "Low", value: "low", count: 1 },
      { label: "Okay", value: "okay", count: 0 },
      { label: "Great", value: "great", count: 2 },
    ]);
  });
});

describe("buildTrendSeries v2", () => {
  it("duration → numeric minutes; missing day → 0", () => {
    const habit = h({ type: "duration", streakType: "daily", intendedRhythm: "daily" });
    const s = buildTrendSeries(habit, [e("2026-06-03", 20)], 3, "2026-06-03");
    expect(s.map((p) => p.value)).toEqual([0, 0, 20]);
  });
  it("yes_no → 0/1 completion", () => {
    const habit = h({ type: "yes_no", streakType: "daily", intendedRhythm: "daily" });
    const s = buildTrendSeries(habit, [e("2026-06-03", true)], 2, "2026-06-03");
    expect(s.map((p) => p.value)).toEqual([0, 1]);
  });
});
