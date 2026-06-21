import { useState } from "react";
import { useHabitStore } from "@/store/habit-store";
import { todayKey } from "@/lib/date-utils";
import { CalendarMonth } from "@/components/calendar-month";
import { DayEditor } from "@/components/day-editor";

export default function CalendarRoute() {
  const habits = useHabitStore((s) => s.habits);
  const entries = useHabitStore((s) => s.entries);
  const addOrUpdateEntry = useHabitStore((s) => s.addOrUpdateEntry);

  const today = todayKey();
  const [anchor, setAnchor] = useState(today);
  const [selected, setSelected] = useState(today);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold">Calendar</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Tap a day to review or fill in what you missed.</p>
      </header>
      <CalendarMonth
        anchorKey={anchor}
        onAnchorChange={setAnchor}
        habits={habits}
        entries={entries}
        selected={selected}
        onSelect={setSelected}
      />
      <DayEditor
        dateKey={selected}
        habits={habits}
        entries={entries}
        onLog={(habitId, value) => addOrUpdateEntry({ habitId, date: selected, value })}
      />
    </div>
  );
}
