import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import type { Habit, HabitEntry, HabitEntryValue } from "@/lib/types";
import { isHabitCompleted, formatValue } from "@/lib/habit-utils";
import { HabitIcon } from "./habit-icon";
import { HabitLogControl } from "./habit-log-control";
import { cn } from "@/lib/utils";

interface Props {
  habit: Habit;
  entry?: HabitEntry;
  streak: number;
  onLog: (value: HabitEntryValue) => void;
}

export function HabitCard({ habit, entry, streak, onLog }: Props) {
  const done = isHabitCompleted(habit, entry);
  const subtitle =
    entry !== undefined
      ? formatValue(habit, entry.value)
      : habit.target
        ? `Goal ${habit.target}${habit.targetUnit ? ` ${habit.targetUnit}` : ""}`
        : habit.description ?? "";

  return (
    <div className={cn("flex items-center gap-3 rounded-2xl border bg-[var(--card)] p-3", done && "border-[var(--success-soft)]")}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${habit.color}1a`, color: habit.color }}>
        <HabitIcon name={habit.icon} className="h-5 w-5" />
      </div>
      <Link to={`/habits/${habit.id}`} className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-[var(--foreground)]">{habit.name}</div>
        <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
          {streak > 0 ? (
            <span className="inline-flex items-center gap-0.5">
              <Flame className="h-3 w-3 text-[#E8A23D]" /> {streak}
            </span>
          ) : null}
          <span className="truncate">{subtitle}</span>
        </div>
      </Link>
      <div className="shrink-0">
        <HabitLogControl habit={habit} value={entry?.value} onChange={onLog} />
      </div>
    </div>
  );
}
