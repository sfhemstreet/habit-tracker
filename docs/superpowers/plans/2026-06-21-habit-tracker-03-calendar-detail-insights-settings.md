# Habit Tracker — Plan 3: Calendar, Detail, Insights & Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the MVP — Calendar view with past-day editing and heatmap tints, Habit Detail pages (stats, heatmap, type-aware charts, recent entries, edit/archive), the Insights / Weekly Review page, Settings (export/import/clear/about), then a final responsive/a11y polish and the full quality gate.

**Architecture:** New pure helpers (`buildMonthGrid`, chart-data shapers) are TDD'd in `lib/`. Pages compose them with the store. Recharts powers per-type trend charts, each wrapped to render an empty state instead of crashing.

**Tech Stack:** Recharts, shadcn (alert-dialog), everything from Plans 1–2.

**Prerequisite:** Plans 1 and 2 complete (running app, green `npm test`).
**Reference spec:** `docs/superpowers/specs/2026-06-21-habit-tracker-design.md`

---

## File map

```
src/lib/calendar-utils.ts            # buildMonthGrid (+ test)
src/lib/chart-data.ts                # per-type chart series shapers (+ test)
src/components/
  ui/alert-dialog.tsx                # shadcn
  confirm-dialog.tsx
  stats-card.tsx
  habit-heatmap.tsx
  trend-chart.tsx
  calendar-month.tsx
  calendar-day-cell.tsx
  day-editor.tsx
  weekly-review.tsx
src/routes/
  calendar.tsx                       # real (replaces placeholder)
  habit-detail.tsx                   # real
  insights.tsx                       # real
  settings.tsx                       # real
```

---

## Task 1: Calendar month grid helper — TDD

**Files:**
- Create: `src/lib/calendar-utils.ts`, `src/lib/calendar-utils.test.ts`

- [ ] **Step 1: Write the failing test** — `src/lib/calendar-utils.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { buildMonthGrid, monthLabel } from "./calendar-utils";

describe("buildMonthGrid", () => {
  it("returns whole weeks (multiple of 7 cells)", () => {
    const cells = buildMonthGrid("2026-06-15", 1);
    expect(cells.length % 7).toBe(0);
  });

  it("marks in-month vs adjacent-month days", () => {
    const cells = buildMonthGrid("2026-06-15", 1); // June 2026
    const inMonth = cells.filter((c) => c.inMonth);
    expect(inMonth).toHaveLength(30); // June has 30 days
    expect(inMonth[0].key).toBe("2026-06-01");
    expect(inMonth[29].key).toBe("2026-06-30");
  });

  it("Monday start: first cell is the Monday on/before the 1st", () => {
    // 2026-06-01 is a Monday, so the grid starts exactly there
    const cells = buildMonthGrid("2026-06-15", 1);
    expect(cells[0].key).toBe("2026-06-01");
  });

  it("Sunday start: pads with the prior Sunday", () => {
    const cells = buildMonthGrid("2026-06-15", 0);
    // 2026-06-01 is Monday; Sunday-start grid begins 2026-05-31
    expect(cells[0].key).toBe("2026-05-31");
    expect(cells[0].inMonth).toBe(false);
  });
});

describe("monthLabel", () => {
  it("formats as 'Month YYYY'", () => {
    expect(monthLabel("2026-06-15")).toBe("June 2026");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/calendar-utils.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `src/lib/calendar-utils.ts`

```ts
import { addDays, parseDayKey, startOfWeekKey, toDayKey } from "./date-utils";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export interface MonthCell {
  key: string;
  inMonth: boolean;
}

export function buildMonthGrid(anchorKey: string, weekStartsOn: 0 | 1): MonthCell[] {
  const anchor = parseDayKey(anchorKey);
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const firstKey = toDayKey(new Date(year, month, 1));
  const lastKey = toDayKey(new Date(year, month + 1, 0));

  const start = startOfWeekKey(firstKey, weekStartsOn);
  // end = end of the week containing the last day
  const end = addDays(startOfWeekKey(lastKey, weekStartsOn), 6);

  const cells: MonthCell[] = [];
  let cursor = start;
  while (cursor <= end) {
    const d = parseDayKey(cursor);
    cells.push({ key: cursor, inMonth: d.getMonth() === month });
    cursor = addDays(cursor, 1);
  }
  return cells;
}

export function monthLabel(anchorKey: string): string {
  const d = parseDayKey(anchorKey);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function shiftMonth(anchorKey: string, delta: number): string {
  const d = parseDayKey(anchorKey);
  return toDayKey(new Date(d.getFullYear(), d.getMonth() + delta, 1));
}
```

- [ ] **Step 4: Run to verify it passes, then commit**

Run: `npx vitest run src/lib/calendar-utils.test.ts`
Expected: PASS.
```bash
git add src/lib/calendar-utils.ts src/lib/calendar-utils.test.ts
git commit -m "feat(lib): add calendar month-grid helper"
```

---

## Task 2: Chart-data shapers — TDD

**Files:**
- Create: `src/lib/chart-data.ts`, `src/lib/chart-data.test.ts`

- [ ] **Step 1: Write the failing test** — `src/lib/chart-data.test.ts`

```ts
import { describe, it, expect } from "vitest";
import type { Habit, HabitEntry } from "./types";
import { buildTrendSeries, buildCategoryDistribution } from "./chart-data";

function habit(p: Partial<Habit>): Habit {
  return {
    id: "h1", name: "T", type: "number", color: "#000",
    frequency: "daily", createdAt: "2026-06-01T00:00:00Z", archivedAt: null, ...p,
  };
}
const entry = (date: string, value: HabitEntry["value"]): HabitEntry => ({
  id: date, habitId: "h1", date, value, createdAt: date, updatedAt: date,
});

describe("buildTrendSeries (number/duration/time/boolean)", () => {
  it("returns one point per day in the window with numeric y for numbers", () => {
    const h = habit({ type: "number" });
    const series = buildTrendSeries(h, [entry("2026-06-20", 5)], 7, "2026-06-21");
    expect(series).toHaveLength(7);
    const last = series[series.length - 1];
    expect(last.date).toBe("2026-06-21");
    const logged = series.find((p) => p.date === "2026-06-20");
    expect(logged?.value).toBe(5);
  });

  it("maps time values to minutes-since-midnight", () => {
    const h = habit({ type: "time" });
    const series = buildTrendSeries(h, [entry("2026-06-21", "23:20")], 7, "2026-06-21");
    expect(series.find((p) => p.date === "2026-06-21")?.value).toBe(23 * 60 + 20);
  });

  it("maps boolean completion to 1/0", () => {
    const h = habit({ type: "boolean" });
    const series = buildTrendSeries(h, [entry("2026-06-21", true)], 7, "2026-06-21");
    expect(series.find((p) => p.date === "2026-06-21")?.value).toBe(1);
    expect(series.find((p) => p.date === "2026-06-20")?.value).toBe(0);
  });
});

describe("buildCategoryDistribution", () => {
  it("counts entries per category label", () => {
    const h = habit({
      type: "category",
      categoryOptions: [{ id: "a", label: "Strength" }, { id: "b", label: "Cardio" }],
    });
    const dist = buildCategoryDistribution(h, [
      entry("2026-06-19", "a"), entry("2026-06-20", "a"), entry("2026-06-21", "b"),
    ]);
    expect(dist).toEqual([
      { label: "Strength", count: 2 },
      { label: "Cardio", count: 1 },
    ]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/chart-data.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `src/lib/chart-data.ts`

```ts
import type { Habit, HabitEntry } from "./types";
import { addDays, eachDayInRange } from "./date-utils";
import { isHabitCompleted } from "./habit-utils";

export interface TrendPoint {
  date: string;
  value: number | null;
}

function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export function buildTrendSeries(
  habit: Habit,
  entries: HabitEntry[],
  windowDays: number,
  todayK: string,
): TrendPoint[] {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const from = addDays(todayK, -(windowDays - 1));
  return eachDayInRange(from, todayK).map((date) => {
    const e = byDate.get(date);
    let value: number | null = null;
    switch (habit.type) {
      case "number":
      case "duration":
        value = e && typeof e.value === "number" ? e.value : 0;
        break;
      case "time":
        value = e && typeof e.value === "string" && e.value ? timeToMinutes(e.value) : null;
        break;
      case "boolean":
      case "category":
        value = isHabitCompleted(habit, e) ? 1 : 0;
        break;
    }
    return { date, value };
  });
}

export interface CategorySlice {
  label: string;
  count: number;
}

export function buildCategoryDistribution(habit: Habit, entries: HabitEntry[]): CategorySlice[] {
  const counts = new Map<string, number>();
  for (const e of entries) {
    if (typeof e.value !== "string") continue;
    counts.set(e.value, (counts.get(e.value) ?? 0) + 1);
  }
  return (habit.categoryOptions ?? [])
    .map((opt) => ({ label: opt.label, count: counts.get(opt.id) ?? 0 }))
    .filter((s) => s.count > 0);
}
```

- [ ] **Step 4: Run to verify it passes, then commit**

Run: `npx vitest run src/lib/chart-data.test.ts`
Expected: PASS.
```bash
git add src/lib/chart-data.ts src/lib/chart-data.test.ts
git commit -m "feat(lib): add chart-data shapers for trend + category charts"
```

---

## Task 3: ConfirmDialog + StatsCard

**Files:**
- Create: `src/components/ui/alert-dialog.tsx` (shadcn), `src/components/confirm-dialog.tsx`, `src/components/stats-card.tsx`

- [ ] **Step 1: Add the shadcn alert-dialog primitive**

```bash
npx shadcn@latest add alert-dialog
```

- [ ] **Step 2: Implement** — `src/components/confirm-dialog.tsx`

```tsx
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = "Confirm", destructive, onConfirm }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={destructive ? "bg-[var(--destructive)] text-white hover:opacity-90" : undefined}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 3: Implement** — `src/components/stats-card.tsx`

```tsx
interface Props {
  label: string;
  value: string;
  hint?: string;
}

export function StatsCard({ label, value, hint }: Props) {
  return (
    <div className="rounded-2xl border bg-[var(--card)] p-3">
      <div className="text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">{label}</div>
      <div className="text-xl font-bold text-[var(--foreground)]">{value}</div>
      {hint ? <div className="text-[11px] text-[var(--muted-foreground)]">{hint}</div> : null}
    </div>
  );
}
```

- [ ] **Step 4: Verify build, then commit**

```bash
npm run build
git add src/components/ui/alert-dialog.tsx src/components/confirm-dialog.tsx src/components/stats-card.tsx
git commit -m "feat(ui): add ConfirmDialog + StatsCard"
```

---

## Task 4: HabitHeatmap + TrendChart

**Files:**
- Create: `src/components/habit-heatmap.tsx`, `src/components/trend-chart.tsx`

- [ ] **Step 1: Implement** — `src/components/habit-heatmap.tsx`

```tsx
import type { Habit, HabitEntry } from "@/lib/types";
import { addDays, todayKey, eachDayInRange, startOfWeekKey, formatLongDate } from "@/lib/date-utils";
import { isHabitCompleted, isScheduledOn } from "@/lib/habit-utils";

interface Props {
  habit: Habit;
  entries: HabitEntry[];
  weeks?: number;
}

export function HabitHeatmap({ habit, entries, weeks = 16 }: Props) {
  const today = todayKey();
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const start = startOfWeekKey(addDays(today, -(weeks * 7 - 1)), 1);
  const days = eachDayInRange(start, today);

  // group into columns of 7 (weeks)
  const columns: string[][] = [];
  for (let i = 0; i < days.length; i += 7) columns.push(days.slice(i, i + 7));

  function tint(day: string): string {
    if (!isScheduledOn(habit, day)) return "var(--line)";
    if (isHabitCompleted(habit, byDate.get(day))) return habit.color;
    return "var(--secondary)";
  }

  return (
    <div className="flex gap-1 overflow-x-auto">
      {columns.map((col, ci) => (
        <div key={ci} className="flex flex-col gap-1">
          {col.map((day) => (
            <div
              key={day}
              title={`${formatLongDate(day)}`}
              className="h-3 w-3 rounded-[3px]"
              style={{ backgroundColor: tint(day), opacity: isHabitCompleted(habit, byDate.get(day)) ? 1 : 0.55 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Implement** — `src/components/trend-chart.tsx`

```tsx
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { Habit, HabitEntry } from "@/lib/types";
import { buildTrendSeries, buildCategoryDistribution } from "@/lib/chart-data";
import { todayKey } from "@/lib/date-utils";
import { EmptyState } from "./empty-state";

export function TrendChart({ habit, entries }: { habit: Habit; entries: HabitEntry[] }) {
  const today = todayKey();

  if (entries.length === 0) {
    return <EmptyState title="No data yet" description="Log this habit a few times to see trends here." />;
  }

  if (habit.type === "category") {
    const data = buildCategoryDistribution(habit, entries);
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="count" fill={habit.color} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  const series = buildTrendSeries(habit, entries, 30, today);
  const tickLabel = (d: string) => d.slice(5); // MM-DD

  if (habit.type === "boolean") {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={series}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis dataKey="date" tickFormatter={tickLabel} tick={{ fontSize: 10 }} interval={4} />
          <YAxis domain={[0, 1]} ticks={[0, 1]} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="value" fill={habit.color} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={series}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
        <XAxis dataKey="date" tickFormatter={tickLabel} tick={{ fontSize: 10 }} interval={4} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        {habit.target ? <ReferenceLine y={habit.target} stroke="var(--muted-foreground)" strokeDasharray="4 4" /> : null}
        <Line type="monotone" dataKey="value" stroke={habit.color} strokeWidth={2} dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 3: Verify build, then commit**

```bash
npm run build
git add src/components/habit-heatmap.tsx src/components/trend-chart.tsx
git commit -m "feat(ui): add HabitHeatmap + per-type TrendChart"
```

---

## Task 5: Habit Detail route

**Files:**
- Modify (replace placeholder): `src/routes/habit-detail.tsx`

- [ ] **Step 1: Implement** — `src/routes/habit-detail.tsx`

```tsx
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, Pencil, Archive } from "lucide-react";
import { useHabitStore } from "@/store/habit-store";
import { computeStats, formatValue } from "@/lib/habit-utils";
import { todayKey } from "@/lib/date-utils";
import { StatsCard } from "@/components/stats-card";
import { HabitHeatmap } from "@/components/habit-heatmap";
import { TrendChart } from "@/components/trend-chart";
import { HabitIcon } from "@/components/habit-icon";
import { AddHabitDialog } from "@/components/add-habit-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";

export default function HabitDetailRoute() {
  const { id } = useParams();
  const habits = useHabitStore((s) => s.habits);
  const entries = useHabitStore((s) => s.entries);
  const archiveHabit = useHabitStore((s) => s.archiveHabit);
  const [editing, setEditing] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const habit = habits.find((h) => h.id === id);
  const habitEntries = useMemo(
    () => entries.filter((e) => e.habitId === id).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [entries, id],
  );

  if (!habit) {
    return (
      <div className="text-sm text-[var(--muted-foreground)]">
        Habit not found. <Link to="/" className="text-[var(--primary)]">Back to Today</Link>
      </div>
    );
  }

  const stats = computeStats(habit, habitEntries, todayKey());
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  return (
    <div className="flex flex-col gap-4">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)]">
        <ChevronLeft className="h-4 w-4" /> Today
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${habit.color}1a`, color: habit.color }}>
          <HabitIcon name={habit.icon} className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-[var(--foreground)]">{habit.name}</h1>
          {habit.description ? <p className="text-sm text-[var(--muted-foreground)]">{habit.description}</p> : null}
        </div>
        <button onClick={() => setEditing(true)} aria-label="Edit habit" className="rounded-lg bg-[var(--secondary)] p-2"><Pencil className="h-4 w-4" /></button>
        {!habit.archivedAt ? (
          <button onClick={() => setConfirmArchive(true)} aria-label="Archive habit" className="rounded-lg bg-[var(--secondary)] p-2"><Archive className="h-4 w-4" /></button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatsCard label="Current streak" value={`${stats.currentStreak}`} hint="days" />
        <StatsCard label="Longest streak" value={`${stats.longestStreak}`} hint="days" />
        <StatsCard label="7-day" value={pct(stats.completionRate7Days)} />
        <StatsCard label="30-day" value={pct(stats.completionRate30Days)} />
        <StatsCard label="Total" value={`${stats.totalCompletions}`} hint="completions" />
        <StatsCard label="Missed" value={`${stats.missedDays}`} hint="days" />
      </div>

      <section className="rounded-2xl border bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold">Consistency</h2>
        <HabitHeatmap habit={habit} entries={habitEntries} />
      </section>

      <section className="rounded-2xl border bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold">Trend</h2>
        <TrendChart habit={habit} entries={habitEntries} />
      </section>

      <section className="rounded-2xl border bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold">Recent entries</h2>
        {habitEntries.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No entries yet.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {habitEntries.slice(0, 10).map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-[var(--muted-foreground)]">{e.date}</span>
                <span className="font-medium">{formatValue(habit, e.value)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AddHabitDialog open={editing} onOpenChange={setEditing} editing={habit} />
      <ConfirmDialog
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title={`Archive ${habit.name}?`}
        description="It will be hidden from Today but its history is kept."
        confirmLabel="Archive"
        onConfirm={() => { archiveHabit(habit.id); setConfirmArchive(false); }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/routes/habit-detail.tsx
git commit -m "feat(detail): habit detail page with stats, heatmap, trend, entries"
```

---

## Task 6: Calendar route (CalendarMonth + DayCell + DayEditor)

**Files:**
- Create: `src/components/calendar-day-cell.tsx`, `src/components/calendar-month.tsx`, `src/components/day-editor.tsx`
- Modify (replace placeholder): `src/routes/calendar.tsx`

- [ ] **Step 1: Implement** — `src/components/calendar-day-cell.tsx`

```tsx
import { cn } from "@/lib/utils";

interface Props {
  dayNumber: number;
  inMonth: boolean;
  ratio: number; // 0..1 completion
  isToday: boolean;
  disabled: boolean;
  selected: boolean;
  onClick: () => void;
}

export function CalendarDayCell({ dayNumber, inMonth, ratio, isToday, disabled, selected, onClick }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative flex aspect-square items-center justify-center rounded-lg text-xs",
        !inMonth && "opacity-30",
        disabled && "cursor-not-allowed opacity-40",
        selected ? "ring-2 ring-[var(--primary)]" : "",
        isToday ? "font-bold" : "",
      )}
      style={{ backgroundColor: ratio > 0 ? `color-mix(in srgb, var(--primary) ${Math.round(ratio * 70) + 10}%, var(--card))` : "var(--secondary)" }}
    >
      <span className={ratio > 0.5 ? "text-white" : "text-[var(--foreground)]"}>{dayNumber}</span>
    </button>
  );
}
```

- [ ] **Step 2: Implement** — `src/components/calendar-month.tsx`

```tsx
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Habit, HabitEntry } from "@/lib/types";
import { buildMonthGrid, monthLabel, shiftMonth } from "@/lib/calendar-utils";
import { isFuture, parseDayKey, todayKey } from "@/lib/date-utils";
import { isHabitCompleted, isScheduledOn } from "@/lib/habit-utils";
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
    const scheduled = active.filter((h) => isScheduledOn(h, day));
    if (scheduled.length === 0) return 0;
    const done = scheduled.filter((h) =>
      isHabitCompleted(h, entries.find((e) => e.habitId === h.id && e.date === day)),
    ).length;
    return done / scheduled.length;
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
```

- [ ] **Step 3: Implement** — `src/components/day-editor.tsx`

```tsx
import type { Habit, HabitEntry, HabitEntryValue } from "@/lib/types";
import { formatLongDate } from "@/lib/date-utils";
import { isScheduledOn } from "@/lib/habit-utils";
import { HabitIcon } from "./habit-icon";
import { HabitLogControl } from "./habit-log-control";

interface Props {
  dateKey: string;
  habits: Habit[];
  entries: HabitEntry[];
  onLog: (habitId: string, value: HabitEntryValue) => void;
}

export function DayEditor({ dateKey, habits, entries, onLog }: Props) {
  const scheduled = habits.filter((h) => !h.archivedAt && isScheduledOn(h, dateKey));
  return (
    <div className="rounded-2xl border bg-[var(--card)] p-4">
      <h2 className="mb-3 text-sm font-semibold">{formatLongDate(dateKey)}</h2>
      {scheduled.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">No habits scheduled this day.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {scheduled.map((h) => {
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
```

- [ ] **Step 4: Implement** — `src/routes/calendar.tsx`

```tsx
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
```

- [ ] **Step 5: Build + commit**

```bash
npm run build
git add src/components/calendar-day-cell.tsx src/components/calendar-month.tsx src/components/day-editor.tsx src/routes/calendar.tsx
git commit -m "feat(calendar): month heatmap grid + per-day editor"
```

---

## Task 7: Insights / Weekly Review route

**Files:**
- Create: `src/components/weekly-review.tsx`
- Modify (replace placeholder): `src/routes/insights.tsx`

- [ ] **Step 1: Implement** — `src/components/weekly-review.tsx`

```tsx
import type { ReactNode } from "react";
import { Flame, Sparkles, TriangleAlert, Trophy } from "lucide-react";
import type { Habit } from "@/lib/types";
import type { WeeklyReview as Review } from "@/lib/insights";

interface Props {
  review: Review;
  habits: Habit[];
}

export function WeeklyReview({ review, habits }: Props) {
  const nameOf = (id: string | null) => habits.find((h) => h.id === id)?.name ?? "—";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Consistency" value={`${Math.round(review.consistency * 100)}%`} />
        <Tile label="Best habit" value={nameOf(review.bestHabitId)} icon={<Trophy className="h-4 w-4 text-[#E8A23D]" />} />
        <Tile label="Most friction" value={nameOf(review.frictionHabitId)} icon={<TriangleAlert className="h-4 w-4 text-[var(--muted-foreground)]" />} />
        <Tile label="Missed days" value={`${review.missedDays}`} />
      </div>

      {review.activeStreaks.length > 0 ? (
        <div className="rounded-2xl border bg-[var(--card)] p-4">
          <h2 className="mb-2 text-sm font-semibold">Active streaks</h2>
          <div className="flex flex-wrap gap-2">
            {review.activeStreaks.map((s) => (
              <span key={s.habitId} className="inline-flex items-center gap-1 rounded-full bg-[var(--secondary)] px-3 py-1 text-xs">
                <Flame className="h-3 w-3 text-[#E8A23D]" /> {nameOf(s.habitId)} · {s.streak}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {review.insights.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-[var(--card)] p-4 text-sm text-[var(--muted-foreground)]">
            Keep logging — suggestions will appear as patterns emerge.
          </div>
        ) : (
          review.insights.map((ins) => (
            <div key={ins.id} className="flex items-start gap-3 rounded-2xl border bg-[var(--card)] p-4">
              <div className="mt-0.5">
                {ins.tone === "positive" ? <Sparkles className="h-5 w-5 text-[var(--success)]" /> : <TriangleAlert className="h-5 w-5 text-[#E8A23D]" />}
              </div>
              <div>
                <div className="text-sm font-semibold">{ins.title}</div>
                <div className="text-sm text-[var(--muted-foreground)]">{ins.message}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-2xl border bg-[var(--card)] p-3">
      <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">{icon}{label}</div>
      <div className="truncate text-base font-bold">{value}</div>
    </div>
  );
}
```

- [ ] **Step 2: Implement** — `src/routes/insights.tsx`

```tsx
import { useHabitStore } from "@/store/habit-store";
import { buildWeeklyReview } from "@/lib/insights";
import { todayKey } from "@/lib/date-utils";
import { WeeklyReview } from "@/components/weekly-review";

export default function InsightsRoute() {
  const habits = useHabitStore((s) => s.habits);
  const entries = useHabitStore((s) => s.entries);
  const settings = useHabitStore((s) => s.settings);

  const review = buildWeeklyReview(habits, entries, todayKey(), settings);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold">Your week at a glance</h1>
        <p className="text-sm text-[var(--muted-foreground)]">What worked, what slipped, what to adjust.</p>
      </header>
      <WeeklyReview review={review} habits={habits} />
    </div>
  );
}
```

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add src/components/weekly-review.tsx src/routes/insights.tsx
git commit -m "feat(insights): weekly review page with deterministic suggestions"
```

---

## Task 8: Settings route (export / import / clear / about)

**Files:**
- Modify (replace placeholder): `src/routes/settings.tsx`

- [ ] **Step 1: Implement** — `src/routes/settings.tsx`

```tsx
import { useRef, useState } from "react";
import { Download, Upload, Trash2 } from "lucide-react";
import { useHabitStore } from "@/store/habit-store";
import { ConfirmDialog } from "@/components/confirm-dialog";

export default function SettingsRoute() {
  const exportData = useHabitStore((s) => s.exportData);
  const importData = useHabitStore((s) => s.importData);
  const clearData = useHabitStore((s) => s.clearData);
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  function handleExport() {
    const blob = new Blob([exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `habit-tracker-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus({ kind: "ok", msg: "Exported your data." });
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      importData(text);
      setStatus({ kind: "ok", msg: "Imported successfully." });
    } catch (e) {
      setStatus({ kind: "err", msg: e instanceof Error ? e.message : "Import failed." });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Your data lives on this device.</p>
      </header>

      <section className="rounded-2xl border bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold">Your data</h2>
        <div className="flex flex-col gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 rounded-lg bg-[var(--secondary)] px-3 py-2 text-sm font-medium">
            <Download className="h-4 w-4" /> Export as JSON
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 rounded-lg bg-[var(--secondary)] px-3 py-2 text-sm font-medium">
            <Upload className="h-4 w-4" /> Import from JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImportFile(f);
              e.target.value = "";
            }}
          />
          <button onClick={() => setConfirmClear(true)} className="flex items-center gap-2 rounded-lg bg-[var(--secondary)] px-3 py-2 text-sm font-medium text-[var(--destructive)]">
            <Trash2 className="h-4 w-4" /> Clear all data
          </button>
        </div>
        {status ? (
          <p className={`mt-3 text-sm ${status.kind === "ok" ? "text-[var(--success)]" : "text-[var(--destructive)]"}`}>{status.msg}</p>
        ) : null}
      </section>

      <section className="rounded-2xl border bg-[var(--card)] p-4">
        <h2 className="mb-2 text-sm font-semibold">About</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Habit Tracker helps you build consistent routines without overcomplicating your life.
          Small actions, tracked consistently, create visible momentum. Your data stays on your
          device — export anytime.
        </p>
      </section>

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear all data?"
        description="This permanently deletes all habits and entries on this device. Export first if you want a backup."
        confirmLabel="Delete everything"
        destructive
        onConfirm={() => {
          clearData();
          setConfirmClear(false);
          setStatus({ kind: "ok", msg: "All data cleared." });
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/routes/settings.tsx
git commit -m "feat(settings): export/import/clear + about"
```

---

## Task 9: Polish pass

**Files:**
- Modify: `index.html`, plus small touch-ups as found.

- [ ] **Step 1: Set the page title + meta** — `index.html`

Set `<title>Habit Tracker</title>` and add `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />`.

- [ ] **Step 2: Verify these UX details manually** (`npm run dev`)

- Today, Calendar, Insights, Settings reachable from both sidebar (desktop ≥768px) and bottom nav (mobile <768px); active tab highlighted.
- Logging every type updates the ring and persists across refresh.
- Calendar past-day editing writes entries; future days are disabled.
- Habit detail charts render for each type, and show the empty state for a brand-new habit.
- Import a malformed JSON file → friendly red error, no crash. Import a valid export → data replaced.
- Clear all → confirm dialog → empties app; reload stays empty; "Load sample data" restores the 5.
- Resize to ~375px: cards, nav, dialogs/sheets all usable; no horizontal scroll.

- [ ] **Step 3: Fix anything found, then commit**

```bash
git add -A
git commit -m "polish: title, viewport, responsive + a11y touch-ups" || echo "nothing to commit"
```

---

## Task 10: Final quality gate (spec §18)

- [ ] **Step 1: Run all checks**

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```
Expected: all tests pass; no type errors; no lint errors; production build succeeds.

- [ ] **Step 2: Confirm the acceptance checklist** (spec §18) — all boxes:
- All tests pass; TS strict + ESLint clean.
- App runs with no TS errors / missing imports.
- Navigation works (sidebar + bottom nav).
- Habit creation + editing works; logging works for every type.
- Data persists across refresh; export→import round-trips.
- Calendar editing of past days works; future disabled.
- Streaks/rates correct (covered by tests).
- Charts render without crashing, including empty habits.
- Empty states render; clear-all confirmed and effective.
- Layout verified mobile + desktop.

- [ ] **Step 3: Commit + request review**

```bash
git add -A
git commit -m "chore: MVP complete — full quality gate green" || echo "clean"
```

Then run the requesting-code-review skill for the single end-of-build review (per the agreed delivery plan).

---

## Self-review notes (coverage vs. spec)

- §3 Calendar (month + prev/next + heatmap + past-day edit) → Tasks 1, 6. §4 Habit Detail (name/desc, all stats, heatmap, type-aware trend, recent entries, edit/archive) → Tasks 4, 5. §5 Insights/Weekly Review (consistency, best, friction, missed, streaks, rule cards) → Tasks 2, 7. §6 Settings (export/import-validated/clear/about) → Task 8. §12 charts per type with empty-state wrapping → Tasks 2, 4. §16 a11y/responsive/microcopy + §18 quality gate → Tasks 9, 10.
- Pure helpers (`buildMonthGrid`, chart shapers) are TDD'd; UI verified via the manual smoke checklist since component-level coverage beyond Plan 2's log-control tests is intentionally light per the "full MVP then one review" delivery choice.
- **Week start is fixed to Monday** in `CalendarMonth`/`HabitHeatmap` for the MVP (spec §default). `settings.weekStartsOn` exists in the model and is honored by `startOfWeekKey`, but there's no settings UI to change it yet, so the calendar header (`Mon…Sun`) and grid intentionally hardcode `1`. Wiring it to `settings.weekStartsOn` is a small, isolated follow-up.
```
