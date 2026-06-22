import type { Habit, HabitEntry } from "./types";
import { addDays, eachDayInRange } from "./date-utils";
import { isHabitCompleted } from "./habit-utils";

export interface TrendPoint {
  date: string;
  value: number | null;
}

function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export function buildTrendSeries(
  habit: Habit,
  entries: HabitEntry[],
  windowDays: number,
  todayK: string,
): TrendPoint[] {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const from = addDays(todayK, -(windowDays - 1));
  return eachDayInRange(from, todayK).map((date) => {
    const e = byDate.get(date);
    let value: number | null = null;
    switch (habit.type) {
      case "number":
      case "duration":
        value = e && typeof e.value === "number" ? e.value : 0;
        break;
      case "time":
        value = e && typeof e.value === "string" && e.value ? timeToMinutes(e.value) : null;
        break;
      case "boolean":
      case "category":
        value = isHabitCompleted(habit, e) ? 1 : 0;
        break;
    }
    return { date, value };
  });
}

export interface CategorySlice {
  label: string;
  count: number;
}

export function buildCategoryDistribution(habit: Habit, entries: HabitEntry[]): CategorySlice[] {
  const counts = new Map<string, number>();
  for (const e of entries) {
    if (typeof e.value !== "string") continue;
    counts.set(e.value, (counts.get(e.value) ?? 0) + 1);
  }
  return (habit.categoryOptions ?? [])
    .map((opt) => ({ label: opt.label, count: counts.get(opt.id) ?? 0 }))
    .filter((s) => s.count > 0);
}
