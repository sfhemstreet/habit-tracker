import type { Habit, HabitEntry } from "@/lib/types";
import { addDays, todayKey, eachDayInRange, startOfWeekKey, formatLongDate } from "@/lib/date-utils";
import { isHabitCompleted, isScheduledOn } from "@/lib/habit-utils";

interface Props {
  habit: Habit;
  entries: HabitEntry[];
  weeks?: number;
}

export function HabitHeatmap({ habit, entries, weeks = 16 }: Props) {
  const today = todayKey();
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const start = startOfWeekKey(addDays(today, -(weeks * 7 - 1)), 1);
  const days = eachDayInRange(start, today);

  // group into columns of 7 (weeks)
  const columns: string[][] = [];
  for (let i = 0; i < days.length; i += 7) columns.push(days.slice(i, i + 7));

  function tint(day: string): string {
    if (!isScheduledOn(habit, day)) return "var(--line)";
    if (isHabitCompleted(habit, byDate.get(day))) return habit.color;
    return "var(--secondary)";
  }

  return (
    <div className="flex gap-1 overflow-x-auto">
      {columns.map((col, ci) => (
        <div key={ci} className="flex flex-col gap-1">
          {col.map((day) => (
            <div
              key={day}
              title={`${formatLongDate(day)}`}
              className="h-3 w-3 rounded-[3px]"
              style={{ backgroundColor: tint(day), opacity: isHabitCompleted(habit, byDate.get(day)) ? 1 : 0.55 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
