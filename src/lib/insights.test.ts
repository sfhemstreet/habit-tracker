import { describe, it, expect } from "vitest";
import type { Habit, HabitEntry } from "./types";
import { buildWeeklyReview } from "./insights";

function habit(p: Partial<Habit>): Habit {
  return {
    id: p.id ?? "h1",
    name: p.name ?? "Test",
    type: p.type ?? "boolean",
    color: "#5B6CF0",
    frequency: "daily",
    createdAt: "2026-05-01T08:00:00.000Z",
    archivedAt: null,
    ...p,
  };
}
function entry(habitId: string, date: string, value: HabitEntry["value"]): HabitEntry {
  return { id: `${habitId}-${date}`, habitId, date, value, createdAt: date, updatedAt: date };
}

const today = "2026-06-21";

describe("buildWeeklyReview", () => {
  it("celebrates a 7-day streak", () => {
    const h = habit({ id: "h1", name: "Meditate" });
    const entries: HabitEntry[] = [];
    for (let i = 0; i < 7; i++) entries.push(entry("h1", `2026-06-${15 + i}`, true));
    const review = buildWeeklyReview([h], entries, today, { weekStartsOn: 1 });
    expect(review.insights.some((x) => x.kind === "streak-celebration" && x.habitId === "h1")).toBe(true);
  });

  it("suggests lowering target after >3 misses with a target", () => {
    const h = habit({ id: "h2", name: "Water", type: "number", target: 8 });
    // last 7 days: 4 misses (value 0), 3 hits
    const entries = [
      entry("h2", "2026-06-15", 0),
      entry("h2", "2026-06-16", 0),
      entry("h2", "2026-06-17", 0),
      entry("h2", "2026-06-18", 0),
      entry("h2", "2026-06-19", 8),
      entry("h2", "2026-06-20", 8),
      entry("h2", "2026-06-21", 8),
    ];
    const review = buildWeeklyReview([h], entries, today, { weekStartsOn: 1 });
    expect(review.insights.some((x) => x.kind === "lower-target" && x.habitId === "h2")).toBe(true);
  });

  it("flags an overloaded day when more than 8 habits are scheduled", () => {
    const habits = Array.from({ length: 9 }, (_, i) => habit({ id: `h${i}`, name: `H${i}` }));
    const review = buildWeeklyReview(habits, [], today, { weekStartsOn: 1 });
    expect(review.insights.some((x) => x.kind === "simplify")).toBe(true);
  });

  it("computes best and friction habits", () => {
    const a = habit({ id: "a", name: "Easy" });
    const b = habit({ id: "b", name: "Hard" });
    const entries = [
      ...["15", "16", "17", "18", "19", "20", "21"].map((d) => entry("a", `2026-06-${d}`, true)),
      entry("b", "2026-06-15", true),
    ];
    const review = buildWeeklyReview([a, b], entries, today, { weekStartsOn: 1 });
    expect(review.bestHabitId).toBe("a");
    expect(review.frictionHabitId).toBe("b");
  });

  it("ignores archived habits", () => {
    const h = habit({ id: "h1", archivedAt: "2026-06-01T00:00:00Z" });
    const review = buildWeeklyReview([h], [], today, { weekStartsOn: 1 });
    expect(review.bestHabitId).toBeNull();
  });

  it("suggests stacking for an inconsistent (30-70%) habit", () => {
    const h = habit({ id: "h3", name: "Floss" });
    const entries = ["08", "10", "12", "14", "16", "18", "20"].map((d) =>
      entry("h3", `2026-06-${d}`, true),
    ); // 7 of the trailing 14 days completed => ~50%
    const review = buildWeeklyReview([h], entries, today, { weekStartsOn: 1 });
    expect(review.insights.some((x) => x.kind === "stack-habit" && x.habitId === "h3")).toBe(true);
  });
});
