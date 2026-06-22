import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import type { Habit, HabitEntryValue } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  habit: Habit;
  value?: HabitEntryValue;
  onChange: (value: HabitEntryValue) => void;
}

const DURATION_CHIPS = [5, 10, 30, 60];

export function HabitLogControl({ habit, value, onChange }: Props) {
  switch (habit.type) {
    case "boolean": {
      const done = value === true;
      return (
        <button
          type="button"
          aria-label={done ? "Mark not done" : "Mark done"}
          onClick={() => onChange(!done)}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full border transition-colors",
            done ? "bg-[var(--success)] text-white border-transparent" : "border-[var(--input)] text-[var(--muted-foreground)]",
          )}
        >
          <Check className="h-4 w-4" />
        </button>
      );
    }
    case "number": {
      const n = typeof value === "number" ? value : 0;
      return (
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Decrease" onClick={() => onChange(Math.max(0, n - 1))} className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--secondary)] text-[var(--primary)]">
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-6 text-center text-sm font-bold tabular-nums">{n}</span>
          <button type="button" aria-label="Increase" onClick={() => onChange(n + 1)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary)] text-white">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      );
    }
    case "duration": {
      const current = typeof value === "number" ? value : undefined;
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          {DURATION_CHIPS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onChange(m)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium",
                current === m ? "bg-[var(--primary)] text-white" : "bg-[var(--secondary)] text-[var(--muted-foreground)]",
              )}
            >
              {m}m
            </button>
          ))}
          <DurationCustom onSubmit={onChange} />
        </div>
      );
    }
    case "time": {
      const v = typeof value === "string" ? value : "";
      return (
        <input
          type="time"
          aria-label="Time"
          value={v}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-lg bg-[var(--secondary)] px-2.5 py-1.5 text-sm"
        />
      );
    }
    case "category": {
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          {(habit.categoryOptions ?? []).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                value === opt.id ? "bg-[var(--primary)] text-white" : "bg-[var(--secondary)] text-[var(--muted-foreground)]",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      );
    }
    default:
      return null;
  }
}

function DurationCustom({ onSubmit }: { onSubmit: (m: number) => void }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-[var(--secondary)] px-2.5 py-1 text-xs font-medium text-[var(--muted-foreground)]">
        Custom
      </button>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number(val);
        if (!Number.isNaN(n) && n > 0) onSubmit(n);
        setOpen(false);
        setVal("");
      }}
      className="flex items-center gap-1"
    >
      <input autoFocus aria-label="Custom minutes" value={val} onChange={(e) => setVal(e.target.value)} inputMode="numeric" className="w-14 rounded-lg bg-[var(--secondary)] px-2 py-1 text-xs" placeholder="min" />
    </form>
  );
}
