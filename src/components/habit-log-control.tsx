import { useState } from "react";
import { Check } from "lucide-react";
import type { Habit, HabitEntryValue, RatingValue } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  habit: Habit;
  value?: HabitEntryValue;
  onChange: (value: HabitEntryValue) => void;
}

const RATINGS: { value: RatingValue; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "okay", label: "Okay" },
  { value: "great", label: "Great" },
];

export function HabitLogControl({ habit, value, onChange }: Props) {
  switch (habit.type) {
    case "yes_no": {
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
    case "number":
    case "duration":
      return <NumberDurationInput habit={habit} value={value} onChange={onChange} />;
    case "rating": {
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          {RATINGS.map((r) => (
            <button
              key={r.value}
              type="button"
              aria-label={r.label}
              onClick={() => onChange(r.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                value === r.value ? "bg-[var(--primary)] text-white" : "bg-[var(--secondary)] text-[var(--muted-foreground)]",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      );
    }
    default:
      return null;
  }
}

function NumberDurationInput({ habit, value, onChange }: Props) {
  const unit = habit.type === "duration" ? "minutes" : (habit.unit ?? "");
  const [text, setText] = useState(typeof value === "number" ? String(value) : "");
  const [lastValue, setLastValue] = useState(value);
  // Sync the field when the parent value changes externally (e.g. switching days),
  // using the set-state-during-render pattern instead of a useEffect.
  if (value !== lastValue) {
    setLastValue(value);
    setText(typeof value === "number" ? String(value) : "");
  }
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        inputMode="numeric"
        min={0}
        aria-label={habit.name}
        value={text}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          if (raw === "") return; // an empty field is a mid-edit state, not a logged 0
          const parsed = Number(raw);
          if (!Number.isNaN(parsed) && parsed >= 0) onChange(parsed);
        }}
        className="w-16 rounded-lg border bg-[var(--card)] px-2 py-1 text-sm tabular-nums"
      />
      {unit ? <span className="text-xs text-[var(--muted-foreground)]">{unit}</span> : null}
    </div>
  );
}
