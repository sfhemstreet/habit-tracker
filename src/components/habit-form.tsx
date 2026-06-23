import { useState } from "react";
import type { ReactNode } from "react";
import type { Habit, HabitType, IntendedRhythm, StreakType } from "@/lib/types";
import type { AddHabitInput } from "@/store/habit-store";
import { presetFor } from "@/lib/habit-presets";
import { HABIT_COLORS } from "@/lib/color-palette";
import { HABIT_ICONS } from "@/lib/habit-icons";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<HabitType, string> = {
  yes_no: "Yes / No",
  number: "Number",
  duration: "Duration",
  rating: "Rating",
};

const RHYTHM_LABELS: Record<IntendedRhythm, string> = {
  daily: "Daily",
  weekly: "Weekly",
  multiple_per_week: "A few times per week",
  whenever: "Whenever",
};

const STREAK_LABELS: Record<StreakType, { label: string; hint: string }> = {
  daily: { label: "Daily streak", hint: "Best for habits you want to log every day." },
  weekly: { label: "Weekly streak", hint: "Best for habits you want a set number of times per week." },
  none: { label: "No streak", hint: "Best for mood, energy, or casual tracking." },
};

function recommendedStreak(type: HabitType, rhythm: IntendedRhythm): StreakType {
  if (type === "rating") return "none";
  switch (rhythm) {
    case "daily": return "daily";
    case "weekly":
    case "multiple_per_week": return "weekly";
    case "whenever": return "none";
  }
}

export type HabitFormValue = AddHabitInput;

interface Props {
  initial?: Habit;
  onSubmit: (value: HabitFormValue) => void;
  onCancel: () => void;
}

export function HabitForm({ initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [type, setType] = useState<HabitType>(initial?.type ?? "yes_no");
  const [color, setColor] = useState(initial?.color ?? HABIT_COLORS[0]);
  const [icon, setIcon] = useState<string>(initial?.icon ?? presetFor(type).icon ?? "check");
  const [target, setTarget] = useState<string>(initial?.target?.toString() ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [rhythm, setRhythm] = useState<IntendedRhythm>(initial?.intendedRhythm ?? "daily");
  const [countPerWeek, setCountPerWeek] = useState<string>(initial?.intendedCountPerWeek?.toString() ?? "2");
  const [streakType, setStreakType] = useState<StreakType>(initial?.streakType ?? "daily");
  const [streakTouched, setStreakTouched] = useState(false);
  const [error, setError] = useState("");

  function changeType(t: HabitType) {
    setType(t);
    if (!initial) {
      const p = presetFor(t);
      setColor(p.color);
      setIcon(p.icon ?? "check");
      setTarget(p.target?.toString() ?? "");
      setUnit(p.unit ?? "");
      setRhythm(p.intendedRhythm);
    }
    if (!streakTouched) setStreakType(recommendedStreak(t, initial?.intendedRhythm ?? rhythm));
  }

  function changeRhythm(r: IntendedRhythm) {
    setRhythm(r);
    if (!streakTouched) setStreakType(recommendedStreak(type, r));
  }

  const showTargetUnit = type === "number";
  const showTarget = type === "number" || type === "duration";

  function submit() {
    if (!name.trim()) { setError("Give your habit a name."); return; }
    if (type === "number" && !unit.trim()) { setError("Number habits need a unit (e.g. pushups)."); return; }
    const count = rhythm === "multiple_per_week" ? Math.max(1, Math.min(7, Number(countPerWeek) || 1)) : undefined;
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      color,
      icon,
      target: showTarget && target ? Number(target) : undefined,
      unit: showTargetUnit && unit ? unit.trim() : undefined,
      intendedRhythm: rhythm,
      intendedCountPerWeek: count,
      streakType,
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
        <div className="grid grid-cols-4 gap-1.5">
          {(Object.keys(TYPE_LABELS) as HabitType[]).map((t) => (
            <button key={t} type="button" onClick={() => changeType(t)} disabled={!!initial} className={cn("rounded-lg px-2 py-1.5 text-xs font-medium", type === t ? "bg-[var(--primary)] text-white" : "bg-[var(--secondary)] text-[var(--muted-foreground)]", initial && "opacity-60")}>
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        {initial ? <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">Type can't change after creation.</p> : null}
        {type === "rating" ? <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">Use this for subjective check-ins like energy, mood, focus, or sleep quality.</p> : null}
      </Field>

      {showTarget ? (
        <div className="flex gap-2">
          <Field label={type === "duration" ? "Target minutes (optional)" : "Target (optional)"}>
            <input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="numeric" className="w-full rounded-lg border bg-[var(--card)] px-3 py-2 text-sm" />
          </Field>
          {showTargetUnit ? (
            <Field label="Unit">
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="pushups" className="w-full rounded-lg border bg-[var(--card)] px-3 py-2 text-sm" />
            </Field>
          ) : null}
        </div>
      ) : null}

      <Field label="Color">
        <div className="flex flex-wrap gap-2.5">
          {HABIT_COLORS.map((c) => {
            const selected = color === c;
            return (
              <button key={c} type="button" aria-label={`Color ${c}`} aria-pressed={selected} onClick={() => setColor(c)}
                className="h-8 w-8 rounded-full transition-transform"
                style={{ backgroundColor: c, boxShadow: selected ? `0 0 0 2px var(--card), 0 0 0 4px color-mix(in srgb, ${c}, #000 35%)` : "inset 0 0 0 1px rgba(0,0,0,0.08)", transform: selected ? "scale(1.08)" : undefined }} />
            );
          })}
        </div>
      </Field>

      <Field label="Icon">
        <div className="grid max-h-44 grid-cols-8 gap-1.5 overflow-y-auto rounded-lg border bg-[var(--card)] p-2">
          {HABIT_ICONS.map(({ name: iconName, Icon }) => {
            const selected = icon === iconName;
            return (
              <button key={iconName} type="button" aria-label={iconName} aria-pressed={selected} onClick={() => setIcon(iconName)}
                className={cn("flex aspect-square items-center justify-center rounded-md transition-colors", !selected && "bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]")}
                style={selected ? { backgroundColor: color, color: "#fff" } : undefined}>
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Tracking rhythm">
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.keys(RHYTHM_LABELS) as IntendedRhythm[]).map((r) => (
            <button key={r} type="button" onClick={() => changeRhythm(r)} className={cn("rounded-lg px-3 py-1.5 text-xs font-medium", rhythm === r ? "bg-[var(--primary)] text-white" : "bg-[var(--secondary)] text-[var(--muted-foreground)]")}>
              {RHYTHM_LABELS[r]}
            </button>
          ))}
        </div>
        {rhythm === "multiple_per_week" ? (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-[var(--muted-foreground)]">How many times per week?</span>
            <input value={countPerWeek} onChange={(e) => setCountPerWeek(e.target.value)} inputMode="numeric" className="w-14 rounded-lg border bg-[var(--card)] px-2 py-1 text-sm" />
          </div>
        ) : null}
      </Field>

      <Field label="Streaks">
        <div className="flex flex-col gap-1.5">
          {(Object.keys(STREAK_LABELS) as StreakType[]).map((s) => (
            <button key={s} type="button" onClick={() => { setStreakType(s); setStreakTouched(true); }} className={cn("rounded-lg px-3 py-2 text-left text-xs", streakType === s ? "bg-[var(--accent)] font-semibold text-[var(--primary)]" : "bg-[var(--secondary)] text-[var(--muted-foreground)]")}>
              <span className="block font-medium text-[var(--foreground)]">{STREAK_LABELS[s].label}</span>
              <span className="block text-[11px] text-[var(--muted-foreground)]">{STREAK_LABELS[s].hint}</span>
            </button>
          ))}
        </div>
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
