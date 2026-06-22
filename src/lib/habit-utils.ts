import type { Habit, HabitEntry, HabitEntryValue, HabitStats } from "./types";
import { addDays, eachDayInRange, toDayKey, weekdayOf } from "./date-utils";

const pad = (n: number) => String(n).padStart(2, "0");

export function isHabitCompleted(
  habit: Habit,
  entry: HabitEntry | undefined,
): boolean {
  if (!entry) return false;
  const v = entry.value;
  switch (habit.type) {
    case "boolean":
      return v === true;
    case "number":
    case "duration": {
      const n = typeof v === "number" ? v : Number(v);
      if (Number.isNaN(n)) return false;
      if (habit.target && habit.target > 0) return n >= habit.target;
      return n > 0;
    }
    case "time":
    case "category":
      return typeof v === "string" && v.length > 0;
    default:
      return false;
  }
}

export function isScheduledOn(habit: Habit, dayKey: string): boolean {
  if (habit.frequency === "daily") return true;
  return (habit.activeDays ?? []).includes(weekdayOf(dayKey));
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

/** Most recent scheduled day <= fromKey and >= startKey, or null. */
function prevScheduledDay(
  habit: Habit,
  fromKey: string,
  startKey: string,
): string | null {
  let cursor = fromKey;
  while (cursor >= startKey) {
    if (isScheduledOn(habit, cursor)) return cursor;
    cursor = addDays(cursor, -1);
  }
  return null;
}

export function currentStreak(
  habit: Habit,
  entries: HabitEntry[],
  todayK: string,
): number {
  const byDate = indexByDate(entries);
  const start = habitStartKey(habit, entries);
  if (todayK < start) return 0;

  let anchor = prevScheduledDay(habit, todayK, start);
  if (anchor === null) return 0;

  // Grace rule: a not-yet-completed today is "pending", not a miss.
  if (anchor === todayK && !isHabitCompleted(habit, byDate.get(anchor))) {
    anchor = prevScheduledDay(habit, addDays(todayK, -1), start);
    if (anchor === null) return 0;
  }

  let streak = 0;
  let cursor: string | null = anchor;
  while (cursor !== null && cursor >= start) {
    if (isHabitCompleted(habit, byDate.get(cursor))) {
      streak += 1;
      cursor = prevScheduledDay(habit, addDays(cursor, -1), start);
    } else {
      break;
    }
  }
  return streak;
}

export function longestStreak(
  habit: Habit,
  entries: HabitEntry[],
  todayK: string,
): number {
  const byDate = indexByDate(entries);
  const start = habitStartKey(habit, entries);
  let best = 0;
  let run = 0;
  for (const day of eachDayInRange(start, todayK)) {
    if (!isScheduledOn(habit, day)) continue;
    if (isHabitCompleted(habit, byDate.get(day))) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

export function completionRate(
  habit: Habit,
  entries: HabitEntry[],
  windowDays: number,
  todayK: string,
): number {
  const byDate = indexByDate(entries);
  const start = habitStartKey(habit, entries);
  let windowStart = addDays(todayK, -(windowDays - 1));
  if (windowStart < start) windowStart = start;

  let scheduled = 0;
  let completed = 0;
  // Range is already bounded by todayK, so no future days are included.
  for (const day of eachDayInRange(windowStart, todayK)) {
    if (!isScheduledOn(habit, day)) continue;
    scheduled += 1;
    if (isHabitCompleted(habit, byDate.get(day))) completed += 1;
  }
  return scheduled === 0 ? 0 : completed / scheduled;
}

export function totalCompletions(habit: Habit, entries: HabitEntry[]): number {
  let count = 0;
  for (const e of entries) if (isHabitCompleted(habit, e)) count += 1;
  return count;
}

export function missedDays(
  habit: Habit,
  entries: HabitEntry[],
  todayK: string,
): number {
  const byDate = indexByDate(entries);
  const start = habitStartKey(habit, entries);
  const yesterday = addDays(todayK, -1); // exclude pending today
  let missed = 0;
  for (const day of eachDayInRange(start, yesterday)) {
    if (!isScheduledOn(habit, day)) continue;
    if (!isHabitCompleted(habit, byDate.get(day))) missed += 1;
  }
  return missed;
}

export function computeStats(
  habit: Habit,
  entries: HabitEntry[],
  todayK: string,
): HabitStats {
  return {
    currentStreak: currentStreak(habit, entries, todayK),
    longestStreak: longestStreak(habit, entries, todayK),
    completionRate7Days: completionRate(habit, entries, 7, todayK),
    completionRate30Days: completionRate(habit, entries, 30, todayK),
    totalCompletions: totalCompletions(habit, entries),
    missedDays: missedDays(habit, entries, todayK),
  };
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatTime(value: string): string {
  const [hStr, mStr] = value.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const period = h >= 12 ? "PM" : "AM";
  const hr12 = h % 12 === 0 ? 12 : h % 12;
  return `${hr12}:${pad(m)} ${period}`;
}

export function formatValue(habit: Habit, value: HabitEntryValue): string {
  switch (habit.type) {
    case "boolean":
      return value === true ? "Done" : "Not done";
    case "number": {
      const n = Number(value);
      return `${Number.isNaN(n) ? 0 : n}${habit.targetUnit ? ` ${habit.targetUnit}` : ""}`;
    }
    case "duration":
      return formatDuration(Number(value));
    case "time":
      return formatTime(String(value));
    case "category": {
      const opt = habit.categoryOptions?.find((o) => o.id === value);
      return opt?.label ?? String(value);
    }
    default:
      return String(value);
  }
}
