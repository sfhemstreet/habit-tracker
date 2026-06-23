import { describe, it, expect } from "vitest";
import { buildWeeklyReview } from "./insights";
import type { Habit, HabitEntry } from "./types";

function h(p: Partial<Habit>): Habit {
  return { id: "h", name: "H", type: "yes_no", color: "#000",
    intendedRhythm: "daily", streakType: "daily",
    createdAt: "2026-05-01T08:00:00.000Z", archivedAt: null, ...p };
}
function days(habitId: string, from: string, count: number, value: HabitEntry["value"] = true): HabitEntry[] {
  const out: HabitEntry[] = [];
  const d = new Date(`${from}T08:00:00.000Z`);
  for (let i = 0; i < count; i++) {
    const key = new Date(d.getTime() + i * 86400000).toISOString().slice(0, 10);
    out.push({ id: `${habitId}-${key}`, habitId, date: key, value, createdAt: "x", updatedAt: "x" });
  }
  return out;
}

describe("buildWeeklyReview v2", () => {
  it("celebrates a daily streak that is a multiple of 7", () => {
    const habit = h({ id: "a", name: "Meditate" });
    const entries = days("a", "2026-06-01", 14); // 14-day streak ending 06-14
    const review = buildWeeklyReview([habit], entries, "2026-06-14");
    expect(review.insights.some((i) => i.kind === "streak-celebration" && i.message.includes("14"))).toBe(true);
  });

  it("rating habit: summarizes distribution, never flags a miss", () => {
    const habit = h({ id: "r", name: "Energy", type: "rating", intendedRhythm: "whenever", streakType: "none" });
    const entries = days("r", "2026-06-08", 5, "great");
    const review = buildWeeklyReview([habit], entries, "2026-06-12");
    const ins = review.insights.find((i) => i.habitId === "r");
    expect(ins?.message.toLowerCase()).toContain("mostly great");
    expect(review.insights.every((i) => i.tone !== "suggestion" || !/missed/i.test(i.message))).toBe(true);
  });

  it("active streaks carry a unit (days/weeks)", () => {
    const habit = h({ id: "a" });
    const entries = days("a", "2026-06-08", 3);
    const review = buildWeeklyReview([habit], entries, "2026-06-10");
    const s = review.activeStreaks.find((x) => x.habitId === "a");
    expect(s?.unit).toBe("days");
  });
});
