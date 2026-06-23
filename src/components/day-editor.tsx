import type { Habit, HabitEntry, HabitEntryValue } from "@/lib/types";
import { formatLongDate } from "@/lib/date-utils";
import { HabitCard } from "./habit-card";

interface Props {
  dateKey: string;
  habits: Habit[];
  entries: HabitEntry[];
  onLog: (habitId: string, value: HabitEntryValue) => void;
}

export function DayEditor({ dateKey, habits, entries, onLog }: Props) {
  const shown = habits.filter((h) => !h.archivedAt);
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold">{formatLongDate(dateKey)}</h2>
      {shown.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">No habits yet.</p>
      ) : (
        shown.map((h) => {
          const entry = entries.find((e) => e.habitId === h.id && e.date === dateKey);
          // No streak here: streaks are today-relative and would be misleading on a past day.
          return <HabitCard key={h.id} habit={h} entry={entry} onLog={(v) => onLog(h.id, v)} />;
        })
      )}
    </div>
  );
}
