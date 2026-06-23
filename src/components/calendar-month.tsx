import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Habit, HabitEntry } from "@/lib/types";
import { buildMonthGrid, monthLabel, shiftMonth } from "@/lib/calendar-utils";
import { isFuture, parseDayKey, todayKey } from "@/lib/date-utils";
import { isHabitCompleted } from "@/lib/habit-utils";
import { CalendarDayCell } from "./calendar-day-cell";

const HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Props {
  anchorKey: string;
  onAnchorChange: (key: string) => void;
  habits: Habit[];
  entries: HabitEntry[];
  selected: string;
  onSelect: (key: string) => void;
}

export function CalendarMonth({ anchorKey, onAnchorChange, habits, entries, selected, onSelect }: Props) {
  const cells = buildMonthGrid(anchorKey, 1);
  const today = todayKey();
  const active = habits.filter((h) => !h.archivedAt);

  function ratioForDay(day: string): number {
    const relevant = active.filter((h) => h.intendedRhythm === "daily");
    if (relevant.length === 0) return 0;
    const done = relevant.filter((h) =>
      isHabitCompleted(h, entries.find((e) => e.habitId === h.id && e.date === day)),
    ).length;
    return done / relevant.length;
  }

  return (
    <div className="rounded-2xl border bg-[var(--card)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <button aria-label="Previous month" onClick={() => onAnchorChange(shiftMonth(anchorKey, -1))} className="rounded-lg bg-[var(--secondary)] p-1.5"><ChevronLeft className="h-4 w-4" /></button>
        <div className="text-sm font-semibold">{monthLabel(anchorKey)}</div>
        <button aria-label="Next month" onClick={() => onAnchorChange(shiftMonth(anchorKey, 1))} className="rounded-lg bg-[var(--secondary)] p-1.5"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] uppercase text-[var(--muted-foreground)]">
        {HEADERS.map((h) => <div key={h}>{h}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => (
          <CalendarDayCell
            key={cell.key}
            dayNumber={parseDayKey(cell.key).getDate()}
            inMonth={cell.inMonth}
            ratio={ratioForDay(cell.key)}
            isToday={cell.key === today}
            disabled={isFuture(cell.key)}
            selected={cell.key === selected}
            onClick={() => onSelect(cell.key)}
          />
        ))}
      </div>
    </div>
  );
}
