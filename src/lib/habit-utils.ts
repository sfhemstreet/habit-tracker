import type { AppSettings, Habit, HabitEntry, HabitEntryValue, HabitStats, StreakStatus } from "./types";
import { addDays, eachDayInRange, startOfWeekKey, toDayKey } from "./date-utils";

export function isHabitCompleted(habit: Habit, entry: HabitEntry | undefined): boolean {
  if (!entry) return false;
  const v = entry.value;
  switch (habit.type) {
    case "yes_no":
      return v === true;
    case "number":
    case "duration": {
      const n = typeof v === "number" ? v : Number(v);
      if (Number.isNaN(n)) return false;
      if (habit.target && habit.target > 0) return n >= habit.target;
      return n > 0;
    }
    case "rating":
      return v === "low" || v === "okay" || v === "great";
    default:
      return false;
  }
}

function indexByDate(entries: HabitEntry[]): Map<string, HabitEntry> {
  const map = new Map<string, HabitEntry>();
  for (const e of entries) map.set(e.date, e);
  return map;
}

function habitStartKey(habit: Habit, entries: HabitEntry[]): string {
  let start = toDayKey(new Date(habit.createdAt));
  for (const e of entries) if (e.date < start) start = e.date;
  return start;
}

function dailyStreak(habit: Habit, entries: HabitEntry[], todayK: string) {
  const byDate = indexByDate(entries);
  const start = habitStartKey(habit, entries);
  const todayLogged = isHabitCompleted(habit, byDate.get(todayK));
  if (todayK < start) return { count: 0, todayLogged };
  let cursor = todayLogged ? todayK : addDays(todayK, -1);
  let count = 0;
  while (cursor >= start) {
    if (isHabitCompleted(habit, byDate.get(cursor))) {
      count += 1;
      cursor = addDays(cursor, -1);
    } else break;
  }
  return { count, todayLogged };
}

function requiredPerWeek(habit: Habit): number {
  if (habit.intendedRhythm === "multiple_per_week") {
    return Math.max(1, habit.intendedCountPerWeek ?? 1);
  }
  // weekly/daily/whenever rhythms just need any one completion in the week
  return 1;
}

function weeklyCompletedCounts(
  habit: Habit, entries: HabitEntry[], todayK: string, weekStartsOn: 0 | 1,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const e of entries) {
    if (e.date > todayK) continue;
    if (!isHabitCompleted(habit, e)) continue;
    const wk = startOfWeekKey(e.date, weekStartsOn);
    counts.set(wk, (counts.get(wk) ?? 0) + 1);
  }
  return counts;
}

function weeklyStreak(habit: Habit, entries: HabitEntry[], todayK: string, weekStartsOn: 0 | 1) {
  const required = requiredPerWeek(habit);
  const counts = weeklyCompletedCounts(habit, entries, todayK, weekStartsOn);
  const currentWeek = startOfWeekKey(todayK, weekStartsOn);
  const thisWeek = counts.get(currentWeek) ?? 0;
  const met = thisWeek >= required;
  const startWeek = startOfWeekKey(habitStartKey(habit, entries), weekStartsOn);

  let count = 0;
  let cursor = currentWeek;
  if (met) count += 1; // current week only counts once met
  cursor = addDays(cursor, -7); // step to previous week (cursor is week-aligned)
  while (cursor >= startWeek) {
    if ((counts.get(cursor) ?? 0) >= required) {
      count += 1;
      cursor = addDays(cursor, -7);
    } else break;
  }
  return { count, thisWeek, required, met };
}

export function streakStatus(
  habit: Habit, entries: HabitEntry[], todayK: string, settings: AppSettings,
): StreakStatus {
  if (habit.streakType === "daily") {
    const { count, todayLogged } = dailyStreak(habit, entries, todayK);
    return { type: "daily", count, todayLogged };
  }
  if (habit.streakType === "weekly") {
    const w = weeklyStreak(habit, entries, todayK, settings.weekStartsOn);
    return { type: "weekly", count: w.count, thisWeek: w.thisWeek, required: w.required, met: w.met };
  }
  return { type: "none" };
}

export function longestStreak(
  habit: Habit, entries: HabitEntry[], todayK: string, settings: AppSettings,
): number {
  if (habit.streakType === "none") return 0;
  const start = habitStartKey(habit, entries);
  if (habit.streakType === "weekly") {
    const required = requiredPerWeek(habit);
    const counts = weeklyCompletedCounts(habit, entries, todayK, settings.weekStartsOn);
    let best = 0, run = 0;
    let cursor = startOfWeekKey(start, settings.weekStartsOn);
    const last = startOfWeekKey(todayK, settings.weekStartsOn);
    while (cursor <= last) {
      if ((counts.get(cursor) ?? 0) >= required) { run += 1; if (run > best) best = run; }
      else run = 0;
      cursor = addDays(cursor, 7);
    }
    return best;
  }
  // daily
  const byDate = indexByDate(entries);
  let best = 0, run = 0;
  for (const day of eachDayInRange(start, todayK)) {
    if (isHabitCompleted(habit, byDate.get(day))) { run += 1; if (run > best) best = run; }
    else run = 0;
  }
  return best;
}

export function completionRate(
  habit: Habit, entries: HabitEntry[], windowDays: number, todayK: string,
): number {
  const byDate = indexByDate(entries);
  const start = habitStartKey(habit, entries);
  let windowStart = addDays(todayK, -(windowDays - 1));
  if (windowStart < start) windowStart = start;
  let total = 0, completed = 0;
  for (const day of eachDayInRange(windowStart, todayK)) {
    total += 1;
    if (isHabitCompleted(habit, byDate.get(day))) completed += 1;
  }
  return total === 0 ? 0 : completed / total;
}

export function totalCompletions(habit: Habit, entries: HabitEntry[]): number {
  let count = 0;
  for (const e of entries) if (isHabitCompleted(habit, e)) count += 1;
  return count;
}

export function missedDays(habit: Habit, entries: HabitEntry[], todayK: string): number {
  const byDate = indexByDate(entries);
  const start = habitStartKey(habit, entries);
  const yesterday = addDays(todayK, -1); // exclude pending today
  let missed = 0;
  for (const day of eachDayInRange(start, yesterday)) {
    if (!isHabitCompleted(habit, byDate.get(day))) missed += 1;
  }
  return missed;
}

export function computeStats(
  habit: Habit, entries: HabitEntry[], todayK: string, settings: AppSettings,
): HabitStats {
  return {
    streak: streakStatus(habit, entries, todayK, settings),
    longestStreak: longestStreak(habit, entries, todayK, settings),
    completionRate7Days: completionRate(habit, entries, 7, todayK),
    completionRate30Days: completionRate(habit, entries, 30, todayK),
    totalCompletions: totalCompletions(habit, entries),
    missedDays: missedDays(habit, entries, todayK),
  };
}

export function formatValue(habit: Habit, value: HabitEntryValue): string {
  switch (habit.type) {
    case "yes_no":
      return value === true ? "Done" : "Not done";
    case "number": {
      const n = Number(value);
      return `${Number.isNaN(n) ? 0 : n}${habit.unit ? ` ${habit.unit}` : ""}`;
    }
    case "duration": {
      const n = Number(value);
      return `${Number.isNaN(n) ? 0 : n} minutes`;
    }
    case "rating": {
      const v = String(value);
      return v.charAt(0).toUpperCase() + v.slice(1);
    }
    default:
      return String(value);
  }
}
