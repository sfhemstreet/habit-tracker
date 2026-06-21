import { describe, it, expect } from "vitest";
import type { Habit, HabitEntry } from "./types";
import { buildTrendSeries, buildCategoryDistribution } from "./chart-data";

function habit(p: Partial<Habit>): Habit {
  return {
    id: "h1", name: "T", type: "number", color: "#000",
    frequency: "daily", createdAt: "2026-06-01T00:00:00Z", archivedAt: null, ...p,
  };
}
const entry = (date: string, value: HabitEntry["value"]): HabitEntry => ({
  id: date, habitId: "h1", date, value, createdAt: date, updatedAt: date,
});

describe("buildTrendSeries (number/duration/time/boolean)", () => {
  it("returns one point per day in the window with numeric y for numbers", () => {
    const h = habit({ type: "number" });
    const series = buildTrendSeries(h, [entry("2026-06-20", 5)], 7, "2026-06-21");
    expect(series).toHaveLength(7);
    const last = series[series.length - 1];
    expect(last.date).toBe("2026-06-21");
    const logged = series.find((p) => p.date === "2026-06-20");
    expect(logged?.value).toBe(5);
  });

  it("maps time values to minutes-since-midnight", () => {
    const h = habit({ type: "time" });
    const series = buildTrendSeries(h, [entry("2026-06-21", "23:20")], 7, "2026-06-21");
    expect(series.find((p) => p.date === "2026-06-21")?.value).toBe(23 * 60 + 20);
  });

  it("maps boolean completion to 1/0", () => {
    const h = habit({ type: "boolean" });
    const series = buildTrendSeries(h, [entry("2026-06-21", true)], 7, "2026-06-21");
    expect(series.find((p) => p.date === "2026-06-21")?.value).toBe(1);
    expect(series.find((p) => p.date === "2026-06-20")?.value).toBe(0);
  });
});

describe("buildCategoryDistribution", () => {
  it("counts entries per category label", () => {
    const h = habit({
      type: "category",
      categoryOptions: [{ id: "a", label: "Strength" }, { id: "b", label: "Cardio" }],
    });
    const dist = buildCategoryDistribution(h, [
      entry("2026-06-19", "a"), entry("2026-06-20", "a"), entry("2026-06-21", "b"),
    ]);
    expect(dist).toEqual([
      { label: "Strength", count: 2 },
      { label: "Cardio", count: 1 },
    ]);
  });
});
