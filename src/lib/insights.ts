import type { AppSettings, Habit, HabitEntry } from "./types";
import { completionRate, isHabitCompleted, streakStatus } from "./habit-utils";
import { buildRatingDistribution } from "./chart-data";
import { addDays, eachDayInRange, todayKey } from "./date-utils";

export type InsightKind =
  | "streak-celebration"
  | "weekly-rhythm"
  | "rating-summary"
  | "lower-target"
  | "simplify";

export interface Insight {
  id: string;
  kind: InsightKind;
  habitId?: string;
  title: string;
  message: string;
  tone: "positive" | "suggestion";
}

export interface ActiveStreak {
  habitId: string;
  streak: number;
  unit: "days" | "weeks";
}

export interface WeeklyReview {
  consistency: number; // 0..1 across daily habits this week
  bestHabitId: string | null;
  frictionHabitId: string | null;
  missedDays: number;
  activeStreaks: ActiveStreak[];
  insights: Insight[];
}

function entriesFor(habitId: string, entries: HabitEntry[]): HabitEntry[] {
  return entries.filter((e) => e.habitId === habitId);
}

function missesInLast7(habit: Habit, entries: HabitEntry[], todayK: string): number {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const yesterday = addDays(todayK, -1);
  let from = addDays(todayK, -7);
  const start = habit.createdAt.slice(0, 10);
  if (from < start) from = start;
  let misses = 0;
  for (const day of eachDayInRange(from, yesterday)) {
    if (!isHabitCompleted(habit, byDate.get(day))) misses += 1;
  }
  return misses;
}

function ratingSummary(habit: Habit, entries: HabitEntry[], todayK: string): Insight | null {
  const from = addDays(todayK, -6);
  const recent = entries.filter((e) => e.date >= from && e.date <= todayK);
  if (recent.length === 0) return null;
  const dist = buildRatingDistribution(habit, recent);
  const total = dist.reduce((s, d) => s + d.count, 0);
  if (total === 0) return null;
  const top = dist.reduce((a, b) => (b.count > a.count ? b : a));
  const mostly = top.count / total >= 0.6;
  return {
    id: `rating-${habit.id}`,
    kind: "rating-summary",
    habitId: habit.id,
    title: `${habit.name} this week`,
    message: mostly
      ? `${habit.name} was mostly ${top.label} this week.`
      : `${habit.name} was mixed this week.`,
    tone: "positive",
  };
}

export function buildWeeklyReview(
  habits: Habit[],
  entries: HabitEntry[],
  todayK: string = todayKey(),
  settings: AppSettings = { weekStartsOn: 1 },
): WeeklyReview {
  const active = habits.filter((h) => !h.archivedAt);
  const insights: Insight[] = [];
  const activeStreaks: ActiveStreak[] = [];

  let bestHabitId: string | null = null;
  let frictionHabitId: string | null = null;
  let bestRate = -1;
  let worstRate = Infinity;

  let totalDays = 0;
  let completedDays = 0;
  let missed = 0;

  for (const h of active) {
    const hEntries = entriesFor(h.id, entries);
    const status = streakStatus(h, hEntries, todayK, settings);

    if (status.type === "daily" && status.count > 0) {
      activeStreaks.push({ habitId: h.id, streak: status.count, unit: "days" });
    } else if (status.type === "weekly" && status.count > 0) {
      activeStreaks.push({ habitId: h.id, streak: status.count, unit: "weeks" });
    }

    // best/friction + consistency only consider daily habits (rate is meaningful there)
    if (h.streakType === "daily") {
      const rate = completionRate(h, hEntries, 7, todayK);
      if (rate > bestRate) { bestRate = rate; bestHabitId = h.id; }
      if (rate < worstRate) { worstRate = rate; frictionHabitId = h.id; }
      const byDate = new Map(hEntries.map((e) => [e.date, e]));
      for (const day of eachDayInRange(addDays(todayK, -6), todayK)) {
        totalDays += 1;
        if (isHabitCompleted(h, byDate.get(day))) completedDays += 1;
        else if (day !== todayK) missed += 1;
      }
    }

    // Rule: celebrate daily streaks that are a positive multiple of 7
    if (status.type === "daily" && status.count > 0 && status.count % 7 === 0) {
      insights.push({
        id: `streak-${h.id}`, kind: "streak-celebration", habitId: h.id,
        title: `${status.count}-day streak on ${h.name}!`,
        message: `${status.count} days and counting. Momentum is building.`, tone: "positive",
      });
    }

    // Rule: celebrate weekly rhythm held for a multiple of 4 weeks
    if (status.type === "weekly" && status.count > 0 && status.count % 4 === 0) {
      insights.push({
        id: `weekly-${h.id}`, kind: "weekly-rhythm", habitId: h.id,
        title: `${h.name} is holding its rhythm`,
        message: `${h.name} has hit its ${status.required}×/week rhythm for ${status.count} weeks in a row.`,
        tone: "positive",
      });
    }

    // Rule: rating habits get a neutral distribution summary
    if (h.type === "rating") {
      const ins = ratingSummary(h, hEntries, todayK);
      if (ins) insights.push(ins);
    }

    // Rule: targeted habit missed >3 of last 7 → suggest lowering the target
    if (h.streakType !== "none" && h.target && h.target > 0 && missesInLast7(h, hEntries, todayK) > 3) {
      insights.push({
        id: `lower-${h.id}`, kind: "lower-target", habitId: h.id,
        title: `${h.name} may be too heavy`,
        message: "Try lowering the target for next week.", tone: "suggestion",
      });
    }
  }

  // Rule: a lot of active habits → suggest simplifying
  if (active.length > 8) {
    insights.push({
      id: "simplify", kind: "simplify",
      title: "Your tracker looks heavy",
      message: `${active.length} active habits. Consider simplifying.`, tone: "suggestion",
    });
  }

  return {
    consistency: totalDays === 0 ? 0 : completedDays / totalDays,
    bestHabitId: active.length ? bestHabitId : null,
    frictionHabitId: active.length ? frictionHabitId : null,
    missedDays: missed,
    activeStreaks,
    insights,
  };
}
