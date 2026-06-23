import type { Habit, HabitEntry, RatingValue } from "./types";
import { addDays, eachDayInRange } from "./date-utils";
import { isHabitCompleted } from "./habit-utils";

export interface TrendPoint {
  date: string;
  value: number | null;
}

export function buildTrendSeries(
  habit: Habit, entries: HabitEntry[], windowDays: number, todayK: string,
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
      case "yes_no":
      case "rating":
        value = isHabitCompleted(habit, e) ? 1 : 0;
        break;
    }
    return { date, value };
  });
}

export interface RatingSlice {
  label: string;
  value: RatingValue;
  count: number;
}

const RATING_ORDER: { label: string; value: RatingValue }[] = [
  { label: "Low", value: "low" },
  { label: "Okay", value: "okay" },
  { label: "Great", value: "great" },
];

export function buildRatingDistribution(_habit: Habit, entries: HabitEntry[]): RatingSlice[] {
  const counts = new Map<string, number>();
  for (const e of entries) {
    if (typeof e.value !== "string") continue;
    counts.set(e.value, (counts.get(e.value) ?? 0) + 1);
  }
  return RATING_ORDER.map(({ label, value }) => ({ label, value, count: counts.get(value) ?? 0 }));
}
