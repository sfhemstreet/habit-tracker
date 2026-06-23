import type { Habit, HabitEntry, HabitEntryValue } from "@/lib/types";
import { formatLongDate } from "@/lib/date-utils";
import { HabitIcon } from "./habit-icon";
import { HabitLogControl } from "./habit-log-control";

interface Props {
  dateKey: string;
  habits: Habit[];
  entries: HabitEntry[];
  onLog: (habitId: string, value: HabitEntryValue) => void;
}

export function DayEditor({ dateKey, habits, entries, onLog }: Props) {
  const shown = habits.filter((h) => !h.archivedAt);
  return (
    <div className="rounded-2xl border bg-[var(--card)] p-4">
      <h2 className="mb-3 text-sm font-semibold">{formatLongDate(dateKey)}</h2>
      {shown.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">No habits yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {shown.map((h) => {
            const entry = entries.find((e) => e.habitId === h.id && e.date === dateKey);
            return (
              <div key={h.id} className="flex items-center gap-3 rounded-xl border p-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${h.color}1a`, color: h.color }}>
                  <HabitIcon name={h.icon} className="h-4 w-4" />
                </div>
                <span className="flex-1 truncate text-sm font-medium">{h.name}</span>
                <HabitLogControl habit={h} value={entry?.value} onChange={(v) => onLog(h.id, v)} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
