import { useState } from "react";
import type { ReactNode } from "react";
import type { CategoryOption, Habit, HabitType, HabitFrequency } from "@/lib/types";
import type { AddHabitInput } from "@/store/habit-store";
import { newId } from "@/lib/id";
import { presetFor } from "@/lib/habit-presets";
import { HABIT_COLORS } from "@/lib/color-palette";
import { HABIT_ICONS } from "@/lib/habit-icons";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<HabitType, string> = {
  boolean: "Yes / No",
  number: "Number",
  duration: "Duration",
  time: "Time",
  category: "Category",
};
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export type HabitFormValue = AddHabitInput;

interface Props {
  initial?: Habit;
  onSubmit: (value: HabitFormValue) => void;
  onCancel: () => void;
}

export function HabitForm({ initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [type, setType] = useState<HabitType>(initial?.type ?? "boolean");
  const [color, setColor] = useState(initial?.color ?? HABIT_COLORS[0]);
  const [icon, setIcon] = useState<string>(initial?.icon ?? presetFor(type).icon ?? "check");
  const [target, setTarget] = useState<string>(initial?.target?.toString() ?? "");
  const [targetUnit, setTargetUnit] = useState(initial?.targetUnit ?? "");
  const [frequency, setFrequency] = useState<HabitFrequency>(initial?.frequency ?? "daily");
  const [activeDays, setActiveDays] = useState<number[]>(initial?.activeDays ?? [1, 2, 3, 4, 5]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>(initial?.categoryOptions ?? []);
  const [error, setError] = useState("");

  // Apply presets when changing type while creating (not editing).
  function changeType(t: HabitType) {
    setType(t);
    if (initial) return;
    const p = presetFor(t);
    setColor(p.color);
    setIcon(p.icon ?? "check");
    setTarget(p.target?.toString() ?? "");
    setTargetUnit(p.targetUnit ?? "");
    setCategoryOptions(t === "category" ? (p.categoryOptions ?? []) : []);
  }

  const showTarget = type === "number" || type === "duration";

  function submit() {
    if (!name.trim()) {
      setError("Give your habit a name.");
      return;
    }
    const cleanedCategories = categoryOptions
      .map((o) => ({ id: o.id, label: o.label.trim() }))
      .filter((o) => o.label.length > 0);
    if (type === "category" && cleanedCategories.length === 0) {
      setError("Add at least one category option.");
      return;
    }
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      color,
      icon,
      target: showTarget && target ? Number(target) : undefined,
      targetUnit: showTarget && targetUnit ? targetUnit : undefined,
      categoryOptions: type === "category" ? cleanedCategories : undefined,
      frequency,
      activeDays: frequency === "custom" ? activeDays : undefined,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="Name">
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="e.g. Read" className="w-full rounded-lg border bg-[var(--card)] px-3 py-2 text-sm" />
      </Field>

      <Field label="Description (optional)">
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A short reminder of why" className="w-full rounded-lg border bg-[var(--card)] px-3 py-2 text-sm" />
      </Field>

      <Field label="Type">
        <div className="grid grid-cols-3 gap-1.5">
          {(Object.keys(TYPE_LABELS) as HabitType[]).map((t) => (
            <button key={t} type="button" onClick={() => changeType(t)} disabled={!!initial} className={cn("rounded-lg px-2 py-1.5 text-xs font-medium", type === t ? "bg-[var(--primary)] text-white" : "bg-[var(--secondary)] text-[var(--muted-foreground)]", initial && "opacity-60")}>
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        {initial ? <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">Type can't change after creation.</p> : null}
      </Field>

      {showTarget ? (
        <div className="flex gap-2">
          <Field label="Target">
            <input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="numeric" className="w-full rounded-lg border bg-[var(--card)] px-3 py-2 text-sm" />
          </Field>
          <Field label="Unit">
            <input value={targetUnit} onChange={(e) => setTargetUnit(e.target.value)} placeholder={type === "duration" ? "min" : "glasses"} className="w-full rounded-lg border bg-[var(--card)] px-3 py-2 text-sm" />
          </Field>
        </div>
      ) : null}

      {type === "category" ? (
        <Field label="Categories">
          <div className="flex flex-col gap-1.5">
            {categoryOptions.map((opt, i) => (
              <div key={opt.id} className="flex items-center gap-2">
                <input
                  value={opt.label}
                  onChange={(e) => setCategoryOptions((prev) => prev.map((o) => (o.id === opt.id ? { ...o, label: e.target.value } : o)))}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 rounded-lg border bg-[var(--card)] px-3 py-2 text-sm"
                />
                <button type="button" aria-label={`Remove option ${i + 1}`} onClick={() => setCategoryOptions((prev) => prev.filter((o) => o.id !== opt.id))} className="rounded-lg bg-[var(--secondary)] px-2.5 py-2 text-[var(--muted-foreground)]">
                  ✕
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setCategoryOptions((prev) => [...prev, { id: newId(), label: "" }])} className="self-start rounded-lg bg-[var(--secondary)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]">
              + Add option
            </button>
          </div>
        </Field>
      ) : null}

      <Field label="Color">
        <div className="flex flex-wrap gap-2.5">
          {HABIT_COLORS.map((c) => {
            const selected = color === c;
            return (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                aria-pressed={selected}
                onClick={() => setColor(c)}
                className="h-8 w-8 rounded-full transition-transform"
                style={{
                  backgroundColor: c,
                  boxShadow: selected
                    ? `0 0 0 2px var(--card), 0 0 0 4px color-mix(in srgb, ${c}, #000 35%)`
                    : "inset 0 0 0 1px rgba(0,0,0,0.08)",
                  transform: selected ? "scale(1.08)" : undefined,
                }}
              />
            );
          })}
        </div>
      </Field>

      <Field label="Icon">
        <div className="grid max-h-44 grid-cols-8 gap-1.5 overflow-y-auto rounded-lg border bg-[var(--card)] p-2">
          {HABIT_ICONS.map(({ name, Icon }) => {
            const selected = icon === name;
            return (
              <button
                key={name}
                type="button"
                aria-label={name}
                aria-pressed={selected}
                onClick={() => setIcon(name)}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-md transition-colors",
                  !selected && "bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                )}
                style={selected ? { backgroundColor: color, color: "#fff" } : undefined}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Frequency">
        <div className="flex gap-1.5">
          {(["daily", "custom"] as HabitFrequency[]).map((f) => (
            <button key={f} type="button" onClick={() => setFrequency(f)} className={cn("rounded-lg px-3 py-1.5 text-xs font-medium", frequency === f ? "bg-[var(--primary)] text-white" : "bg-[var(--secondary)] text-[var(--muted-foreground)]")}>
              {f === "daily" ? "Every day" : "Specific days"}
            </button>
          ))}
        </div>
        {frequency === "custom" ? (
          <div className="mt-2 flex gap-1.5">
            {WEEKDAY_LABELS.map((d, i) => {
              const on = activeDays.includes(i);
              return (
                <button key={i} type="button" aria-label={`Toggle day ${i}`} onClick={() => setActiveDays((prev) => (on ? prev.filter((x) => x !== i) : [...prev, i]))} className={cn("h-8 w-8 rounded-full text-xs font-medium", on ? "bg-[var(--primary)] text-white" : "bg-[var(--secondary)] text-[var(--muted-foreground)]")}>
                  {d}
                </button>
              );
            })}
          </div>
        ) : null}
      </Field>

      {error ? <p className="text-xs text-[var(--destructive)]">{error}</p> : null}

      <div className="mt-1 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--muted-foreground)]">Cancel</button>
        <button type="button" onClick={submit} className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white">{initial ? "Save" : "Create habit"}</button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-1 flex-col gap-1">
      <span className="text-xs font-medium text-[var(--muted-foreground)]">{label}</span>
      {children}
    </label>
  );
}
