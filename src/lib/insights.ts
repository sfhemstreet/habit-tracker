import type { AppSettings, Habit, HabitEntry } from "./types";
import {
  completionRate,
  currentStreak,
  isHabitCompleted,
  isScheduledOn,
} from "./habit-utils";
import { addDays, eachDayInRange, isFuture, todayKey } from "./date-utils";

export type InsightKind =
  | "streak-celebration"
  | "lower-target"
  | "stack-habit"
  | "simplify";

export interface Insight {
  id: string;
  kind: InsightKind;
  habitId?: string;
  title: string;
  message: string;
  tone: "positive" | "suggestion";
}

export interface WeeklyReview {
  consistency: number; // 0..1 across all habits this week
  bestHabitId: string | null;
  frictionHabitId: string | null;
  missedDays: number;
  activeStreaks: { habitId: string; streak: number }[];
  insights: Insight[];
}

function entriesFor(habitId: string, entries: HabitEntry[]): HabitEntry[] {
  return entries.filter((e) => e.habitId === habitId);
}

function missesInLast7(habit: Habit, entries: HabitEntry[], todayK: string): number {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const yesterday = addDays(todayK, -1);
  let misses = 0;
  for (const day of eachDayInRange(addDays(todayK, -7), yesterday)) {
    if (!isScheduledOn(habit, day)) continue;
    if (!isHabitCompleted(habit, byDate.get(day))) misses += 1;
  }
  return misses;
}

export function buildWeeklyReview(
  habits: Habit[],
  entries: HabitEntry[],
  todayK: string = todayKey(),
  _settings: AppSettings = { weekStartsOn: 1 },
): WeeklyReview {
  const active = habits.filter((h) => !h.archivedAt);
  const insights: Insight[] = [];
  const activeStreaks: { habitId: string; streak: number }[] = [];

  let bestHabitId: string | null = null;
  let frictionHabitId: string | null = null;
  let bestRate = -1;
  let worstRate = Infinity;

  let totalScheduled = 0;
  let totalCompleted = 0;
  let totalMissed = 0;

  const byDate = (id: string) => new Map(entriesFor(id, entries).map((e) => [e.date, e]));

  for (const h of active) {
    const hEntries = entriesFor(h.id, entries);
    const rate = completionRate(h, hEntries, 7, todayK);
    const streak = currentStreak(h, hEntries, todayK);
    if (streak > 0) activeStreaks.push({ habitId: h.id, streak });

    if (rate > bestRate) {
      bestRate = rate;
      bestHabitId = h.id;
    }
    if (rate < worstRate) {
      worstRate = rate;
      frictionHabitId = h.id;
    }

    // weekly consistency accumulation (this calendar-ish week = trailing 7 days)
    const map = byDate(h.id);
    for (const day of eachDayInRange(addDays(todayK, -6), todayK)) {
      if (isFuture(day) || !isScheduledOn(h, day)) continue;
      totalScheduled += 1;
      if (isHabitCompleted(h, map.get(day))) totalCompleted += 1;
      else if (day !== todayK) totalMissed += 1;
    }

    // Rule: celebrate a streak that is a positive multiple of 7
    if (streak > 0 && streak % 7 === 0) {
      insights.push({
        id: `streak-${h.id}`,
        kind: "streak-celebration",
        habitId: h.id,
        title: `${streak}-day streak on ${h.name}!`,
        message: "Momentum is building. Keep it going.",
        tone: "positive",
      });
    }

    // Rule: lower the target after >3 misses with a target
    if (h.target && h.target > 0 && missesInLast7(h, hEntries, todayK) > 3) {
      insights.push({
        id: `lower-${h.id}`,
        kind: "lower-target",
        habitId: h.id,
        title: `${h.name} may be too heavy`,
        message: "Try lowering the target for next week.",
        tone: "suggestion",
      });
    }

    // Rule: inconsistent (30–70% over 14 days) → stack onto a routine
    const rate14 = completionRate(h, hEntries, 14, todayK);
    if (rate14 >= 0.3 && rate14 <= 0.7) {
      insights.push({
        id: `stack-${h.id}`,
        kind: "stack-habit",
        habitId: h.id,
        title: `${h.name} is hit-or-miss`,
        message: "Try attaching it to an existing routine to stay consistent.",
        tone: "suggestion",
      });
    }
  }

  // Rule: too many habits scheduled today → simplify
  const scheduledToday = active.filter((h) => isScheduledOn(h, todayK)).length;
  if (scheduledToday > 8) {
    insights.push({
      id: "simplify",
      kind: "simplify",
      title: "Your day looks heavy",
      message: `${scheduledToday} habits scheduled today. Consider simplifying.`,
      tone: "suggestion",
    });
  }

  return {
    consistency: totalScheduled === 0 ? 0 : totalCompleted / totalScheduled,
    bestHabitId: active.length ? bestHabitId : null,
    frictionHabitId: active.length ? frictionHabitId : null,
    missedDays: totalMissed,
    activeStreaks,
    insights,
  };
}
