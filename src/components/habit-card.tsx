import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import type { Habit, HabitEntry, HabitEntryValue, StreakStatus } from "@/lib/types";
import { isHabitCompleted, formatValue } from "@/lib/habit-utils";
import { HabitIcon } from "./habit-icon";
import { HabitLogControl } from "./habit-log-control";
import { cn } from "@/lib/utils";

interface Props {
  habit: Habit;
  entry?: HabitEntry;
  streak: StreakStatus;
  onLog: (value: HabitEntryValue) => void;
}

function streakLine(streak: StreakStatus): { flame: boolean; text: string } | null {
  switch (streak.type) {
    case "daily":
      if (streak.count > 0)
        return { flame: true, text: `${streak.count} day${streak.count === 1 ? "" : "s"}${streak.todayLogged ? "" : " · log today"}` };
      return streak.todayLogged ? null : { flame: false, text: "Today not logged yet" };
    case "weekly":
      if (streak.count > 0)
        return { flame: true, text: `${streak.count} week${streak.count === 1 ? "" : "s"} · ${streak.thisWeek} of ${streak.required} this week` };
      return { flame: false, text: `${streak.thisWeek} of ${streak.required} this week` };
    case "none":
      return null;
  }
}

export function HabitCard({ habit, entry, streak, onLog }: Props) {
  const done = isHabitCompleted(habit, entry);
  // Rating's three buttons are the only control wide enough to wrap on mobile.
  const controlBelow = habit.type === "rating";
  const line = streakLine(streak);
  const subtitle =
    entry !== undefined
      ? formatValue(habit, entry.value)
      : habit.target
        ? `Goal ${habit.target}${habit.type === "duration" ? " minutes" : habit.unit ? ` ${habit.unit}` : ""}`
        : habit.description ?? "";

  const control = <HabitLogControl habit={habit} value={entry?.value} onChange={onLog} />;

  return (
    <div className={cn("rounded-2xl border bg-[var(--card)] p-3", done && "border-[var(--success-soft)]")}>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${habit.color}1a`, color: habit.color }}>
          <HabitIcon name={habit.icon} className="h-5 w-5" />
        </div>
        <Link to={`/habits/${habit.id}`} className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-[var(--foreground)]">{habit.name}</div>
          <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            {line ? (
              <span className="inline-flex items-center gap-0.5">
                {line.flame ? <Flame className="h-3 w-3 text-[#E8A23D]" /> : null} {line.text}
              </span>
            ) : null}
            <span className="truncate">{subtitle}</span>
          </div>
        </Link>
        {!controlBelow ? <div className="shrink-0">{control}</div> : null}
      </div>
      {controlBelow ? <div className="mt-3">{control}</div> : null}
    </div>
  );
}
