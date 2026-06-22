# Habit Model v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 5-type habit model with four types (Yes/No, Number, Duration, Rating) and add rhythm-aware streaks (daily / weekly / none), migrating existing data.

**Architecture:** A localStorage-backed React/Zustand SPA. The change rewrites the `Habit` shape in `src/lib/types.ts`, ripples through the pure-logic lib modules (completion, streaks, presets, seed, storage migration, charts, insights), the Zustand store, and the UI (form, log controls, card, routes). Pure logic is built TDD-first; UI consumers are then swept to the new API.

**Tech Stack:** Vite + React 19 + TS (strict) + Zustand v5 + Vitest + RTL + Tailwind v4 + Recharts.

**Branch:** `habit-model-v2` (already created off `main`).

**Conventions:**
- Tests run with vitest (esbuild transpile, no per-file typecheck) so a single test file passes even while *other* files still reference the old model. The full `tsc` typecheck (`npm run build`) and `npm run lint` are deferred to the phase-end quality gates.
- All JS tooling must run under Node 22: prefix PATH with the nvm v22 bin (see repo memory). Commands below assume `npm` resolves to that.
- Local day keys are `"YYYY-MM-DD"`; never convert through UTC.
- Per-field Zustand selectors only (object-literal selectors white-screen the app).

---

## File Structure

**Rewritten (logic):**
- `src/lib/types.ts` — new model.
- `src/lib/habit-utils.ts` — completion (4 types), `streakStatus`, revised stats, `formatValue`; `isScheduledOn` deleted.
- `src/lib/habit-presets.ts` — presets + rhythm/streak defaults for 4 types.
- `src/lib/seed-data.ts` — 5 new seeds.
- `src/lib/storage.ts` — schema 1→2 migration.
- `src/lib/chart-data.ts` — rating distribution; time removed.
- `src/lib/insights.ts` — rhythm-aware, neutral-language rules.

**Rewritten (state/UI):**
- `src/store/habit-store.ts` — `AddHabitInput`, `addHabit`, snapshot v2.
- `src/components/habit-log-control.tsx` — 4 controls.
- `src/components/habit-card.tsx` — display + streak.
- `src/components/habit-form.tsx` — type/fields/rhythm/streak sections.

**Swept (mechanical edits to drop `isScheduledOn`/old fields):**
- `src/routes/today.tsx`, `src/routes/habit-detail.tsx`
- `src/components/trend-chart.tsx`, `src/components/daily-progress-card.tsx`
- `src/components/calendar-month.tsx`, `src/components/day-editor.tsx`, `src/components/habit-heatmap.tsx`
- `src/components/weekly-review.tsx`

**Tests touched:** `habit-utils.test.ts`, `storage.test.ts`, `insights.test.ts`, `chart-data.test.ts`, `habit-presets.test.ts`, `seed-data.test.ts`, `habit-store.test.ts`, `habit-log-control.test.tsx`.

---

## Phase 1 — Core model + pure logic

### Task 1: New domain types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Replace the model.** Overwrite `src/lib/types.ts` with:

```ts
export type HabitType = "yes_no" | "number" | "duration" | "rating";

export type RatingValue = "low" | "okay" | "great";

export type IntendedRhythm =
  | "daily"
  | "weekly"
  | "multiple_per_week"
  | "whenever";

export type StreakType = "daily" | "weekly" | "none";

export interface Habit {
  id: string;
  name: string;
  description?: string;
  type: HabitType;
  color: string;
  icon?: string; // Lucide icon name
  target?: number; // number: count · duration: minutes
  unit?: string; // number only; duration is always "minutes"
  intendedRhythm: IntendedRhythm;
  intendedCountPerWeek?: number; // used when intendedRhythm === "multiple_per_week"
  streakType: StreakType;
  createdAt: string; // ISO timestamp
  archivedAt?: string | null;
}

export type HabitEntryValue = boolean | number | RatingValue;

export interface HabitEntry {
  id: string;
  habitId: string;
  date: string; // "YYYY-MM-DD" local day key
  value: HabitEntryValue; // rating stored as literal "low" | "okay" | "great"
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export type StreakStatus =
  | { type: "daily"; count: number; todayLogged: boolean }
  | { type: "weekly"; count: number; thisWeek: number; required: number; met: boolean }
  | { type: "none" };

export interface HabitStats {
  streak: StreakStatus;
  longestStreak: number; // daily: days · weekly: weeks · none: 0
  completionRate7Days: number; // 0..1
  completionRate30Days: number; // 0..1
  totalCompletions: number;
  missedDays: number;
}

export interface AppSettings {
  weekStartsOn: 0 | 1; // 0=Sun, 1=Mon (default 1)
}

export interface PersistedData {
  schemaVersion: number;
  habits: Habit[];
  entries: HabitEntry[];
  settings: AppSettings;
  initializedAt: string | null;
}
```

- [ ] **Step 2: Commit.**

```bash
git add src/lib/types.ts
git commit -m "feat(types): habit model v2 — 4 types + rhythm/streak fields"
```

> Note: this intentionally red-breaks `tsc` across the repo. Subsequent tasks fix each consumer; the Phase 1 gate restores green.

---

### Task 2: Completion logic (4 types)

**Files:**
- Modify: `src/lib/habit-utils.ts`
- Test: `src/lib/habit-utils.test.ts`

- [ ] **Step 1: Write failing tests.** Add to `src/lib/habit-utils.test.ts` (keep existing imports; add a fresh describe block). Replace any existing `isHabitCompleted` cases that used `"boolean"`/`"time"`/`"category"`.

```ts
import { describe, it, expect } from "vitest";
import { isHabitCompleted } from "./habit-utils";
import type { Habit, HabitEntry } from "./types";

function habit(p: Partial<Habit>): Habit {
  return {
    id: "h", name: "H", type: "yes_no", color: "#000",
    intendedRhythm: "daily", streakType: "daily",
    createdAt: "2026-01-01T08:00:00.000Z", archivedAt: null, ...p,
  };
}
function entry(value: HabitEntry["value"]): HabitEntry {
  return { id: "e", habitId: "h", date: "2026-06-01", value,
    createdAt: "x", updatedAt: "x" };
}

describe("isHabitCompleted v2", () => {
  it("yes_no: true completes, false/undefined does not", () => {
    const h = habit({ type: "yes_no" });
    expect(isHabitCompleted(h, entry(true))).toBe(true);
    expect(isHabitCompleted(h, entry(false))).toBe(false);
    expect(isHabitCompleted(h, undefined)).toBe(false);
  });
  it("number with target: >= target completes", () => {
    const h = habit({ type: "number", target: 8 });
    expect(isHabitCompleted(h, entry(8))).toBe(true);
    expect(isHabitCompleted(h, entry(7))).toBe(false);
  });
  it("number without target: > 0 completes", () => {
    const h = habit({ type: "number" });
    expect(isHabitCompleted(h, entry(1))).toBe(true);
    expect(isHabitCompleted(h, entry(0))).toBe(false);
  });
  it("duration with target: >= target completes", () => {
    const h = habit({ type: "duration", target: 20 });
    expect(isHabitCompleted(h, entry(20))).toBe(true);
    expect(isHabitCompleted(h, entry(19))).toBe(false);
  });
  it("rating: any of low/okay/great counts as completed", () => {
    const h = habit({ type: "rating", streakType: "none" });
    expect(isHabitCompleted(h, entry("low"))).toBe(true);
    expect(isHabitCompleted(h, entry("okay"))).toBe(true);
    expect(isHabitCompleted(h, entry("great"))).toBe(true);
    expect(isHabitCompleted(h, undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Run, expect fail.**

Run: `npm test -- src/lib/habit-utils.test.ts`
Expected: FAIL (old `isHabitCompleted` still references `"boolean"`/`"category"`; rating case missing).

- [ ] **Step 3: Implement.** In `src/lib/habit-utils.ts`, replace the top import line and `isHabitCompleted`, and **delete** `isScheduledOn` and the `weekdayOf` import. New header + completion:

```ts
import type { AppSettings, Habit, HabitEntry, HabitEntryValue, HabitStats, StreakStatus } from "./types";
import { addDays, eachDayInRange, startOfWeekKey, toDayKey } from "./date-utils";

const pad = (n: number) => String(n).padStart(2, "0");

export function isHabitCompleted(habit: Habit, entry: HabitEntry | undefined): boolean {
  if (!entry) return false;
  const v = entry.value;
  switch (habit.type) {
    case "yes_no":
      return v === true;
    case "number":
    case "duration": {
      const n = typeof v === "number" ? v : Number(v);
      if (Number.isNaN(n)) return false;
      if (habit.target && habit.target > 0) return n >= habit.target;
      return n > 0;
    }
    case "rating":
      return v === "low" || v === "okay" || v === "great";
    default:
      return false;
  }
}
```

- [ ] **Step 4: Run, expect pass.**

Run: `npm test -- src/lib/habit-utils.test.ts`
Expected: the `isHabitCompleted v2` block PASSES. (Other blocks in the file may still fail — they're fixed in Task 3. That's OK for now.)

- [ ] **Step 5: Commit.**

```bash
git add src/lib/habit-utils.ts src/lib/habit-utils.test.ts
git commit -m "feat(habit-utils): completion logic for 4 types; drop isScheduledOn"
```

---

### Task 3: Streaks — `streakStatus` + revised aggregates

**Files:**
- Modify: `src/lib/habit-utils.ts`
- Test: `src/lib/habit-utils.test.ts`

- [ ] **Step 1: Write failing tests.** Append to `src/lib/habit-utils.test.ts`:

```ts
import { streakStatus, longestStreak, computeStats, completionRate } from "./habit-utils";
import type { AppSettings } from "./types";

const MON: AppSettings = { weekStartsOn: 1 };
function e(date: string, value: HabitEntry["value"] = true): HabitEntry {
  return { id: date, habitId: "h", date, value, createdAt: "x", updatedAt: "x" };
}

describe("streakStatus daily", () => {
  const h = habit({ streakType: "daily", createdAt: "2026-06-01T08:00:00.000Z" });
  it("counts consecutive completed days ending today", () => {
    const s = streakStatus(h, [e("2026-06-08"), e("2026-06-09"), e("2026-06-10")], "2026-06-10", MON);
    expect(s).toEqual({ type: "daily", count: 3, todayLogged: true });
  });
  it("grace: unlogged today keeps streak through yesterday", () => {
    const s = streakStatus(h, [e("2026-06-08"), e("2026-06-09")], "2026-06-10", MON);
    expect(s).toEqual({ type: "daily", count: 2, todayLogged: false });
  });
  it("a gap breaks the streak", () => {
    const s = streakStatus(h, [e("2026-06-07"), e("2026-06-09"), e("2026-06-10")], "2026-06-10", MON);
    expect(s.type === "daily" && s.count).toBe(2);
  });
});

describe("streakStatus weekly", () => {
  // weeks (Mon start): Jun1-7, Jun8-14, Jun15-21, today Jun17
  const h = habit({
    type: "duration", streakType: "weekly", intendedRhythm: "multiple_per_week",
    intendedCountPerWeek: 2, createdAt: "2026-05-25T08:00:00.000Z",
  });
  const v = (d: string) => e(d, 30); // duration completes (>0)
  it("counts met past weeks; current week in-progress doesn't break", () => {
    const s = streakStatus(h, [
      v("2026-06-01"), v("2026-06-03"), // wk Jun1: 2 ✓
      v("2026-06-08"), v("2026-06-10"), // wk Jun8: 2 ✓
      v("2026-06-15"),                  // wk Jun15 (current): 1 of 2
    ], "2026-06-17", MON);
    expect(s).toEqual({ type: "weekly", count: 2, thisWeek: 1, required: 2, met: false });
  });
  it("current week counts once it meets the required count", () => {
    const s = streakStatus(h, [
      v("2026-06-01"), v("2026-06-03"),
      v("2026-06-08"), v("2026-06-10"),
      v("2026-06-15"), v("2026-06-16"), // current week now 2 ✓
    ], "2026-06-17", MON);
    expect(s).toEqual({ type: "weekly", count: 3, thisWeek: 2, required: 2, met: true });
  });
  it("a finished week below target resets the streak", () => {
    const s = streakStatus(h, [
      v("2026-06-01"),                  // wk Jun1: 1 of 2 ✗ (finished)
      v("2026-06-08"), v("2026-06-10"), // wk Jun8: 2 ✓
      v("2026-06-15"), v("2026-06-16"), // current: 2 ✓
    ], "2026-06-17", MON);
    expect(s.type === "weekly" && s.count).toBe(2); // Jun8 + current, Jun1 breaks
  });
});

describe("streakStatus none", () => {
  it("returns none for streakType none", () => {
    const h = habit({ type: "rating", streakType: "none" });
    expect(streakStatus(h, [e("2026-06-10", "great")], "2026-06-10", MON)).toEqual({ type: "none" });
  });
});

describe("longestStreak", () => {
  it("daily: longest completed run", () => {
    const h = habit({ streakType: "daily", createdAt: "2026-06-01T08:00:00.000Z" });
    const got = longestStreak(h, [e("2026-06-01"), e("2026-06-02"), e("2026-06-04")], "2026-06-05", MON);
    expect(got).toBe(2);
  });
  it("none: 0", () => {
    const h = habit({ type: "rating", streakType: "none" });
    expect(longestStreak(h, [e("2026-06-01", "low")], "2026-06-05", MON)).toBe(0);
  });
});
```

- [ ] **Step 2: Run, expect fail.**

Run: `npm test -- src/lib/habit-utils.test.ts`
Expected: FAIL (`streakStatus`/new `longestStreak` signature not implemented).

- [ ] **Step 3: Implement.** In `src/lib/habit-utils.ts`, **replace** everything from `export function isScheduledOn` (already deleted in Task 2) through the end of `computeStats` with the following. Keep `indexByDate` and `habitStartKey` (shown here for completeness), delete `prevScheduledDay`, old `currentStreak`, old `longestStreak`, old `completionRate`/`missedDays` bodies that referenced `isScheduledOn`:

```ts
function indexByDate(entries: HabitEntry[]): Map<string, HabitEntry> {
  const map = new Map<string, HabitEntry>();
  for (const e of entries) map.set(e.date, e);
  return map;
}

function habitStartKey(habit: Habit, entries: HabitEntry[]): string {
  let start = toDayKey(new Date(habit.createdAt));
  for (const e of entries) if (e.date < start) start = e.date;
  return start;
}

function dailyStreak(habit: Habit, entries: HabitEntry[], todayK: string) {
  const byDate = indexByDate(entries);
  const start = habitStartKey(habit, entries);
  const todayLogged = isHabitCompleted(habit, byDate.get(todayK));
  if (todayK < start) return { count: 0, todayLogged };
  let cursor = todayLogged ? todayK : addDays(todayK, -1);
  let count = 0;
  while (cursor >= start) {
    if (isHabitCompleted(habit, byDate.get(cursor))) {
      count += 1;
      cursor = addDays(cursor, -1);
    } else break;
  }
  return { count, todayLogged };
}

function requiredPerWeek(habit: Habit): number {
  if (habit.intendedRhythm === "multiple_per_week") {
    return Math.max(1, habit.intendedCountPerWeek ?? 1);
  }
  return 1;
}

function weeklyCompletedCounts(
  habit: Habit, entries: HabitEntry[], todayK: string, weekStartsOn: 0 | 1,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const e of entries) {
    if (e.date > todayK) continue;
    if (!isHabitCompleted(habit, e)) continue;
    const wk = startOfWeekKey(e.date, weekStartsOn);
    counts.set(wk, (counts.get(wk) ?? 0) + 1);
  }
  return counts;
}

function weeklyStreak(habit: Habit, entries: HabitEntry[], todayK: string, weekStartsOn: 0 | 1) {
  const required = requiredPerWeek(habit);
  const counts = weeklyCompletedCounts(habit, entries, todayK, weekStartsOn);
  const currentWeek = startOfWeekKey(todayK, weekStartsOn);
  const thisWeek = counts.get(currentWeek) ?? 0;
  const met = thisWeek >= required;
  const startWeek = startOfWeekKey(habitStartKey(habit, entries), weekStartsOn);

  let count = 0;
  let cursor = currentWeek;
  if (met) count += 1; // current week only counts once met
  cursor = addDays(cursor, -7); // step to previous week (cursor is week-aligned)
  while (cursor >= startWeek) {
    if ((counts.get(cursor) ?? 0) >= required) {
      count += 1;
      cursor = addDays(cursor, -7);
    } else break;
  }
  return { count, thisWeek, required, met };
}

export function streakStatus(
  habit: Habit, entries: HabitEntry[], todayK: string, settings: AppSettings,
): StreakStatus {
  if (habit.streakType === "daily") {
    const { count, todayLogged } = dailyStreak(habit, entries, todayK);
    return { type: "daily", count, todayLogged };
  }
  if (habit.streakType === "weekly") {
    const w = weeklyStreak(habit, entries, todayK, settings.weekStartsOn);
    return { type: "weekly", count: w.count, thisWeek: w.thisWeek, required: w.required, met: w.met };
  }
  return { type: "none" };
}

export function longestStreak(
  habit: Habit, entries: HabitEntry[], todayK: string, settings: AppSettings,
): number {
  if (habit.streakType === "none") return 0;
  const start = habitStartKey(habit, entries);
  if (habit.streakType === "weekly") {
    const required = requiredPerWeek(habit);
    const counts = weeklyCompletedCounts(habit, entries, todayK, settings.weekStartsOn);
    let best = 0, run = 0;
    let cursor = startOfWeekKey(start, settings.weekStartsOn);
    const last = startOfWeekKey(todayK, settings.weekStartsOn);
    while (cursor <= last) {
      if ((counts.get(cursor) ?? 0) >= required) { run += 1; if (run > best) best = run; }
      else run = 0;
      cursor = addDays(cursor, 7);
    }
    return best;
  }
  // daily
  const byDate = indexByDate(entries);
  let best = 0, run = 0;
  for (const day of eachDayInRange(start, todayK)) {
    if (isHabitCompleted(habit, byDate.get(day))) { run += 1; if (run > best) best = run; }
    else run = 0;
  }
  return best;
}

export function completionRate(
  habit: Habit, entries: HabitEntry[], windowDays: number, todayK: string,
): number {
  const byDate = indexByDate(entries);
  const start = habitStartKey(habit, entries);
  let windowStart = addDays(todayK, -(windowDays - 1));
  if (windowStart < start) windowStart = start;
  let total = 0, completed = 0;
  for (const day of eachDayInRange(windowStart, todayK)) {
    total += 1;
    if (isHabitCompleted(habit, byDate.get(day))) completed += 1;
  }
  return total === 0 ? 0 : completed / total;
}

export function totalCompletions(habit: Habit, entries: HabitEntry[]): number {
  let count = 0;
  for (const e of entries) if (isHabitCompleted(habit, e)) count += 1;
  return count;
}

export function missedDays(habit: Habit, entries: HabitEntry[], todayK: string): number {
  const byDate = indexByDate(entries);
  const start = habitStartKey(habit, entries);
  const yesterday = addDays(todayK, -1); // exclude pending today
  let missed = 0;
  for (const day of eachDayInRange(start, yesterday)) {
    if (!isHabitCompleted(habit, byDate.get(day))) missed += 1;
  }
  return missed;
}

export function computeStats(
  habit: Habit, entries: HabitEntry[], todayK: string, settings: AppSettings,
): HabitStats {
  return {
    streak: streakStatus(habit, entries, todayK, settings),
    longestStreak: longestStreak(habit, entries, todayK, settings),
    completionRate7Days: completionRate(habit, entries, 7, todayK),
    completionRate30Days: completionRate(habit, entries, 30, todayK),
    totalCompletions: totalCompletions(habit, entries),
    missedDays: missedDays(habit, entries, todayK),
  };
}
```

- [ ] **Step 4: Replace `formatValue`.** Replace the existing `formatValue` (and delete `formatTime`/`formatDuration` if unused — keep `formatDuration` removed since duration now shows "minutes"):

```ts
export function formatValue(habit: Habit, value: HabitEntryValue): string {
  switch (habit.type) {
    case "yes_no":
      return value === true ? "Done" : "Not done";
    case "number": {
      const n = Number(value);
      return `${Number.isNaN(n) ? 0 : n}${habit.unit ? ` ${habit.unit}` : ""}`;
    }
    case "duration": {
      const n = Number(value);
      return `${Number.isNaN(n) ? 0 : n} minutes`;
    }
    case "rating": {
      const v = String(value);
      return v.charAt(0).toUpperCase() + v.slice(1);
    }
    default:
      return String(value);
  }
}
```

Remove the now-unused `pad` const if no longer referenced (it was only used by `formatTime`). Confirm with `npm run lint` at the gate.

- [ ] **Step 5: Run, expect pass.**

Run: `npm test -- src/lib/habit-utils.test.ts`
Expected: PASS (all blocks).

- [ ] **Step 6: Commit.**

```bash
git add src/lib/habit-utils.ts src/lib/habit-utils.test.ts
git commit -m "feat(habit-utils): rhythm-aware streakStatus + revised stats/formatValue"
```

---

### Task 4: Presets

**Files:**
- Modify: `src/lib/habit-presets.ts`
- Test: `src/lib/habit-presets.test.ts`

- [ ] **Step 1: Write failing tests.** Overwrite `src/lib/habit-presets.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { presetFor } from "./habit-presets";

describe("presetFor v2", () => {
  it("yes_no → daily rhythm + daily streak", () => {
    const p = presetFor("yes_no");
    expect(p.intendedRhythm).toBe("daily");
    expect(p.streakType).toBe("daily");
  });
  it("number → has a unit and a target", () => {
    const p = presetFor("number");
    expect(p.unit).toBeTruthy();
    expect(typeof p.target).toBe("number");
  });
  it("duration → target in minutes, no unit", () => {
    const p = presetFor("duration");
    expect(p.unit).toBeUndefined();
    expect(p.target).toBe(20);
  });
  it("rating → whenever rhythm + no streak", () => {
    const p = presetFor("rating");
    expect(p.intendedRhythm).toBe("whenever");
    expect(p.streakType).toBe("none");
  });
});
```

- [ ] **Step 2: Run, expect fail.**

Run: `npm test -- src/lib/habit-presets.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement.** Overwrite `src/lib/habit-presets.ts`:

```ts
import type { HabitType, IntendedRhythm, StreakType } from "./types";
import { DEFAULT_COLOR } from "./color-palette";

export interface HabitPreset {
  color: string;
  icon?: string;
  target?: number;
  unit?: string;
  intendedRhythm: IntendedRhythm;
  intendedCountPerWeek?: number;
  streakType: StreakType;
}

export function presetFor(type: HabitType): HabitPreset {
  switch (type) {
    case "number":
      return { color: "#3BA8E5", icon: "hash", target: 8, unit: "glasses", intendedRhythm: "daily", streakType: "daily" };
    case "duration":
      return { color: DEFAULT_COLOR, icon: "clock", target: 20, intendedRhythm: "daily", streakType: "daily" };
    case "rating":
      return { color: "#E8A23D", icon: "smile", intendedRhythm: "whenever", streakType: "none" };
    case "yes_no":
    default:
      return { color: "#0E9F77", icon: "check", intendedRhythm: "daily", streakType: "daily" };
  }
}
```

- [ ] **Step 4: Run, expect pass.**

Run: `npm test -- src/lib/habit-presets.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/lib/habit-presets.ts src/lib/habit-presets.test.ts
git commit -m "feat(presets): 4-type presets with rhythm/streak defaults"
```

---

### Task 5: Seed data

**Files:**
- Modify: `src/lib/seed-data.ts`
- Test: `src/lib/seed-data.test.ts`

- [ ] **Step 1: Write failing tests.** Overwrite `src/lib/seed-data.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createSeedHabits } from "./seed-data";

describe("createSeedHabits v2", () => {
  const habits = createSeedHabits(new Date("2026-06-22T08:00:00.000Z"));
  it("creates 5 habits with no entries baked in", () => {
    expect(habits).toHaveLength(5);
  });
  it("only uses the 4 new types", () => {
    const types = new Set(habits.map((h) => h.type));
    for (const t of types) expect(["yes_no", "number", "duration", "rating"]).toContain(t);
  });
  it("includes a weekly-streak demo", () => {
    expect(habits.some((h) => h.streakType === "weekly")).toBe(true);
  });
  it("every habit has rhythm + streakType set", () => {
    for (const h of habits) {
      expect(h.intendedRhythm).toBeTruthy();
      expect(h.streakType).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run, expect fail.**

Run: `npm test -- src/lib/seed-data.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement.** Overwrite `src/lib/seed-data.ts`:

```ts
import type { Habit } from "./types";
import { newId } from "./id";

export function createSeedHabits(now: Date = new Date()): Habit[] {
  const createdAt = now.toISOString();
  const base = { createdAt, archivedAt: null as string | null };
  return [
    { id: newId(), name: "Meditate", type: "yes_no", color: "#0E9F77", icon: "flower",
      intendedRhythm: "daily", streakType: "daily", ...base },
    { id: newId(), name: "Pushups", type: "number", color: "#3BA8E5", icon: "dumbbell",
      target: 15, unit: "pushups", intendedRhythm: "daily", streakType: "daily", ...base },
    { id: newId(), name: "Read", type: "duration", color: "#5B6CF0", icon: "book-open",
      target: 20, intendedRhythm: "daily", streakType: "daily", ...base },
    { id: newId(), name: "Energy", type: "rating", color: "#E8A23D", icon: "smile",
      intendedRhythm: "whenever", streakType: "none", ...base },
    { id: newId(), name: "Lower Body", type: "duration", color: "#8B6CF0", icon: "activity",
      target: 30, intendedRhythm: "multiple_per_week", intendedCountPerWeek: 2,
      streakType: "weekly", ...base },
  ];
}
```

- [ ] **Step 4: Run, expect pass.**

Run: `npm test -- src/lib/seed-data.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/lib/seed-data.ts src/lib/seed-data.test.ts
git commit -m "feat(seed): 5 v2 example habits incl. weekly demo"
```

---

### Task 6: Storage migration (schema 1 → 2)

**Files:**
- Modify: `src/lib/storage.ts`
- Test: `src/lib/storage.test.ts`

- [ ] **Step 1: Write failing tests.** Add a describe block to `src/lib/storage.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseImport } from "./storage";

// An old (schema 1) export blob, built inline.
function v1(habits: unknown[], entries: unknown[] = []) {
  return JSON.stringify({
    schemaVersion: 1, habits, entries,
    settings: { weekStartsOn: 1 }, initializedAt: "2026-06-01T08:00:00.000Z",
  });
}

describe("migrate v1 → v2", () => {
  it("boolean → yes_no, daily frequency → daily rhythm/streak", () => {
    const d = parseImport(v1([{ id: "a", name: "Floss", type: "boolean", color: "#000",
      frequency: "daily", createdAt: "2026-06-01T08:00:00.000Z", archivedAt: null }]));
    expect(d.schemaVersion).toBe(2);
    const h = d.habits[0];
    expect(h.type).toBe("yes_no");
    expect(h.intendedRhythm).toBe("daily");
    expect(h.streakType).toBe("daily");
  });

  it("targetUnit renamed to unit", () => {
    const d = parseImport(v1([{ id: "a", name: "Water", type: "number", color: "#000",
      target: 8, targetUnit: "glasses", frequency: "daily",
      createdAt: "2026-06-01T08:00:00.000Z", archivedAt: null }]));
    expect(d.habits[0].unit).toBe("glasses");
    expect((d.habits[0] as Record<string, unknown>).targetUnit).toBeUndefined();
  });

  it("custom frequency → multiple_per_week with count = #activeDays", () => {
    const d = parseImport(v1([{ id: "a", name: "Gym", type: "boolean", color: "#000",
      frequency: "custom", activeDays: [1, 3, 5],
      createdAt: "2026-06-01T08:00:00.000Z", archivedAt: null }]));
    const h = d.habits[0];
    expect(h.intendedRhythm).toBe("multiple_per_week");
    expect(h.intendedCountPerWeek).toBe(3);
    expect(h.streakType).toBe("weekly");
  });

  it("category with low/okay/great → rating, remaps entry values", () => {
    const d = parseImport(v1(
      [{ id: "c", name: "Mood", type: "category", color: "#000", frequency: "daily",
        categoryOptions: [{ id: "o1", label: "Low" }, { id: "o2", label: "Okay" }, { id: "o3", label: "Great" }],
        createdAt: "2026-06-01T08:00:00.000Z", archivedAt: null }],
      [{ id: "e1", habitId: "c", date: "2026-06-02", value: "o3", createdAt: "x", updatedAt: "x" }],
    ));
    expect(d.habits[0].type).toBe("rating");
    expect(d.habits[0].streakType).toBe("none");
    expect(d.entries[0].value).toBe("great");
  });

  it("drops time habits and their entries", () => {
    const d = parseImport(v1(
      [{ id: "t", name: "Sleep", type: "time", color: "#000", frequency: "daily",
        createdAt: "2026-06-01T08:00:00.000Z", archivedAt: null }],
      [{ id: "e1", habitId: "t", date: "2026-06-02", value: "22:30", createdAt: "x", updatedAt: "x" }],
    ));
    expect(d.habits).toHaveLength(0);
    expect(d.entries).toHaveLength(0);
  });

  it("drops category habits whose options aren't low/okay/great", () => {
    const d = parseImport(v1(
      [{ id: "w", name: "Workout", type: "category", color: "#000", frequency: "daily",
        categoryOptions: [{ id: "o1", label: "Strength" }, { id: "o2", label: "Cardio" }],
        createdAt: "2026-06-01T08:00:00.000Z", archivedAt: null }],
      [{ id: "e1", habitId: "w", date: "2026-06-02", value: "o1", createdAt: "x", updatedAt: "x" }],
    ));
    expect(d.habits).toHaveLength(0);
    expect(d.entries).toHaveLength(0);
  });

  it("is idempotent on already-v2 data", () => {
    const v2 = JSON.stringify({
      schemaVersion: 2,
      habits: [{ id: "a", name: "Meditate", type: "yes_no", color: "#000",
        intendedRhythm: "daily", streakType: "daily",
        createdAt: "2026-06-01T08:00:00.000Z", archivedAt: null }],
      entries: [], settings: { weekStartsOn: 1 }, initializedAt: "2026-06-01T08:00:00.000Z",
    });
    const d = parseImport(v2);
    expect(d.schemaVersion).toBe(2);
    expect(d.habits[0].type).toBe("yes_no");
  });
});
```

- [ ] **Step 2: Run, expect fail.**

Run: `npm test -- src/lib/storage.test.ts`
Expected: FAIL (migration not implemented; old `parseImport` passes data through unchanged).

- [ ] **Step 3: Implement.** Overwrite `src/lib/storage.ts`:

```ts
import type { Habit, HabitEntry, IntendedRhythm, PersistedData, StreakType } from "./types";

export const STORAGE_KEY = "habit-tracker.v1";
export const SCHEMA_VERSION = 2;

export function defaultData(): PersistedData {
  return {
    schemaVersion: SCHEMA_VERSION,
    habits: [],
    entries: [],
    settings: { weekStartsOn: 1 },
    initializedAt: null,
  };
}

function isValid(data: unknown): data is PersistedData {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  if (
    typeof d.schemaVersion !== "number" ||
    !Array.isArray(d.habits) ||
    !Array.isArray(d.entries) ||
    typeof d.settings !== "object" ||
    d.settings === null
  ) {
    return false;
  }
  const settings = d.settings as Record<string, unknown>;
  return settings.weekStartsOn === 0 || settings.weekStartsOn === 1;
}

const RATING_LABELS = new Set(["low", "okay", "great"]);

function frequencyToRhythm(raw: Record<string, unknown>): {
  intendedRhythm: IntendedRhythm; intendedCountPerWeek?: number; streakType: StreakType;
} {
  if (raw.frequency === "custom") {
    const days = Array.isArray(raw.activeDays) ? raw.activeDays.length : 0;
    return { intendedRhythm: "multiple_per_week",
      intendedCountPerWeek: Math.min(7, Math.max(1, days)), streakType: "weekly" };
  }
  return { intendedRhythm: "daily", streakType: "daily" };
}

// Returns the migrated habit, or null if the habit (and its entries) must be dropped.
// May mutate `entryRemap` to record value remaps for category→rating.
function migrateHabitV1(
  raw: Record<string, unknown>,
  entryRemap: Map<string, Map<string, string>>, // habitId -> (oldValue -> newValue)
): Habit | null {
  const sched = frequencyToRhythm(raw);
  const common = {
    id: String(raw.id),
    name: String(raw.name),
    description: raw.description as string | undefined,
    color: String(raw.color),
    icon: raw.icon as string | undefined,
    target: raw.target as number | undefined,
    unit: raw.targetUnit as string | undefined,
    createdAt: String(raw.createdAt),
    archivedAt: (raw.archivedAt as string | null | undefined) ?? null,
  };

  switch (raw.type) {
    case "boolean":
      return { ...common, type: "yes_no", ...sched };
    case "number":
      return { ...common, type: "number", ...sched };
    case "duration":
      return { ...common, type: "duration", unit: undefined, ...sched };
    case "time":
      return null; // no clean mapping
    case "category": {
      const opts = Array.isArray(raw.categoryOptions) ? raw.categoryOptions : [];
      const labels = opts.map((o) => String((o as Record<string, unknown>).label).trim().toLowerCase());
      const isRating = labels.length === 3 && labels.every((l) => RATING_LABELS.has(l));
      if (!isRating) return null;
      const remap = new Map<string, string>();
      for (const o of opts) {
        const r = o as Record<string, unknown>;
        remap.set(String(r.id), String(r.label).trim().toLowerCase());
      }
      entryRemap.set(common.id, remap);
      return { ...common, type: "rating", unit: undefined,
        intendedRhythm: sched.intendedRhythm, intendedCountPerWeek: sched.intendedCountPerWeek,
        streakType: "none" };
    }
    default:
      return null;
  }
}

function migrate(data: PersistedData): PersistedData {
  if (data.schemaVersion >= 2) return data;

  const entryRemap = new Map<string, Map<string, string>>();
  const keptIds = new Set<string>();
  const habits: Habit[] = [];
  for (const raw of data.habits as unknown as Record<string, unknown>[]) {
    const migrated = migrateHabitV1(raw, entryRemap);
    if (migrated) { habits.push(migrated); keptIds.add(migrated.id); }
  }

  const entries: HabitEntry[] = [];
  for (const e of data.entries as unknown as Record<string, unknown>[]) {
    const habitId = String(e.habitId);
    if (!keptIds.has(habitId)) continue;
    let value = e.value as HabitEntry["value"];
    const remap = entryRemap.get(habitId);
    if (remap && typeof value === "string" && remap.has(value)) {
      value = remap.get(value) as HabitEntry["value"];
    }
    entries.push({
      id: String(e.id), habitId, date: String(e.date), value,
      note: e.note as string | undefined,
      createdAt: String(e.createdAt), updatedAt: String(e.updatedAt),
    });
  }

  return { ...data, schemaVersion: SCHEMA_VERSION, habits, entries };
}

export function loadData(): PersistedData {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultData();
  try {
    const parsed = JSON.parse(raw);
    if (!isValid(parsed)) return defaultData();
    return migrate(parsed);
  } catch {
    return defaultData();
  }
}

export function saveData(data: PersistedData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function exportData(data: PersistedData): string {
  return JSON.stringify(data, null, 2);
}

export function parseImport(json: string): PersistedData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  if (!isValid(parsed)) {
    throw new Error("That file isn't a valid Habit Tracker export.");
  }
  return migrate(parsed);
}
```

- [ ] **Step 4: Run, expect pass.**

Run: `npm test -- src/lib/storage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/lib/storage.ts src/lib/storage.test.ts
git commit -m "feat(storage): schema 1→2 best-effort migration"
```

---

### Task 7: Chart data (rating distribution)

**Files:**
- Modify: `src/lib/chart-data.ts`
- Test: `src/lib/chart-data.test.ts`

- [ ] **Step 1: Write failing tests.** Add to `src/lib/chart-data.test.ts` (adjust the existing `buildCategoryDistribution` cases — that export is being removed):

```ts
import { describe, it, expect } from "vitest";
import { buildRatingDistribution, buildTrendSeries } from "./chart-data";
import type { Habit, HabitEntry } from "./types";

function h(p: Partial<Habit>): Habit {
  return { id: "h", name: "H", type: "rating", color: "#000",
    intendedRhythm: "whenever", streakType: "none",
    createdAt: "2026-06-01T08:00:00.000Z", archivedAt: null, ...p };
}
function e(date: string, value: HabitEntry["value"]): HabitEntry {
  return { id: date, habitId: "h", date, value, createdAt: "x", updatedAt: "x" };
}

describe("buildRatingDistribution", () => {
  it("counts low/okay/great in fixed order", () => {
    const d = buildRatingDistribution(h({}), [e("2026-06-01", "great"), e("2026-06-02", "great"), e("2026-06-03", "low")]);
    expect(d).toEqual([
      { label: "Low", value: "low", count: 1 },
      { label: "Okay", value: "okay", count: 0 },
      { label: "Great", value: "great", count: 2 },
    ]);
  });
});

describe("buildTrendSeries v2", () => {
  it("duration → numeric minutes; missing day → 0", () => {
    const habit = h({ type: "duration", streakType: "daily", intendedRhythm: "daily" });
    const s = buildTrendSeries(habit, [e("2026-06-03", 20)], 3, "2026-06-03");
    expect(s.map((p) => p.value)).toEqual([0, 0, 20]);
  });
  it("yes_no → 0/1 completion", () => {
    const habit = h({ type: "yes_no", streakType: "daily", intendedRhythm: "daily" });
    const s = buildTrendSeries(habit, [e("2026-06-03", true)], 2, "2026-06-03");
    expect(s.map((p) => p.value)).toEqual([0, 1]);
  });
});
```

- [ ] **Step 2: Run, expect fail.**

Run: `npm test -- src/lib/chart-data.test.ts`
Expected: FAIL (`buildRatingDistribution` missing; `buildCategoryDistribution` cases error).

- [ ] **Step 3: Implement.** Overwrite `src/lib/chart-data.ts`:

```ts
import type { Habit, HabitEntry, RatingValue } from "./types";
import { addDays, eachDayInRange } from "./date-utils";
import { isHabitCompleted } from "./habit-utils";

export interface TrendPoint {
  date: string;
  value: number | null;
}

export function buildTrendSeries(
  habit: Habit, entries: HabitEntry[], windowDays: number, todayK: string,
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
      case "yes_no":
      case "rating":
        value = isHabitCompleted(habit, e) ? 1 : 0;
        break;
    }
    return { date, value };
  });
}

export interface RatingSlice {
  label: string;
  value: RatingValue;
  count: number;
}

const RATING_ORDER: { label: string; value: RatingValue }[] = [
  { label: "Low", value: "low" },
  { label: "Okay", value: "okay" },
  { label: "Great", value: "great" },
];

export function buildRatingDistribution(_habit: Habit, entries: HabitEntry[]): RatingSlice[] {
  const counts = new Map<string, number>();
  for (const e of entries) {
    if (typeof e.value !== "string") continue;
    counts.set(e.value, (counts.get(e.value) ?? 0) + 1);
  }
  return RATING_ORDER.map(({ label, value }) => ({ label, value, count: counts.get(value) ?? 0 }));
}
```

- [ ] **Step 4: Run, expect pass.**

Run: `npm test -- src/lib/chart-data.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/lib/chart-data.ts src/lib/chart-data.test.ts
git commit -m "feat(chart-data): rating distribution; drop time/category-by-id"
```

---

### Task 8: Insights (rhythm-aware, neutral language)

**Files:**
- Modify: `src/lib/insights.ts`
- Test: `src/lib/insights.test.ts`

- [ ] **Step 1: Write failing tests.** Overwrite `src/lib/insights.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildWeeklyReview } from "./insights";
import type { Habit, HabitEntry } from "./types";

function h(p: Partial<Habit>): Habit {
  return { id: "h", name: "H", type: "yes_no", color: "#000",
    intendedRhythm: "daily", streakType: "daily",
    createdAt: "2026-05-01T08:00:00.000Z", archivedAt: null, ...p };
}
function days(habitId: string, from: string, count: number, value: HabitEntry["value"] = true): HabitEntry[] {
  const out: HabitEntry[] = [];
  const d = new Date(`${from}T08:00:00.000Z`);
  for (let i = 0; i < count; i++) {
    const key = new Date(d.getTime() + i * 86400000).toISOString().slice(0, 10);
    out.push({ id: `${habitId}-${key}`, habitId, date: key, value, createdAt: "x", updatedAt: "x" });
  }
  return out;
}

describe("buildWeeklyReview v2", () => {
  it("celebrates a daily streak that is a multiple of 7", () => {
    const habit = h({ id: "a", name: "Meditate" });
    const entries = days("a", "2026-06-01", 14); // 14-day streak ending 06-14
    const review = buildWeeklyReview([habit], entries, "2026-06-14");
    expect(review.insights.some((i) => i.kind === "streak-celebration" && i.message.includes("14"))).toBe(true);
  });

  it("rating habit: summarizes distribution, never flags a miss", () => {
    const habit = h({ id: "r", name: "Energy", type: "rating", intendedRhythm: "whenever", streakType: "none" });
    const entries = days("r", "2026-06-08", 5, "great");
    const review = buildWeeklyReview([habit], entries, "2026-06-12");
    const ins = review.insights.find((i) => i.habitId === "r");
    expect(ins?.message.toLowerCase()).toContain("mostly great");
    expect(review.insights.every((i) => i.tone !== "suggestion" || !/missed/i.test(i.message))).toBe(true);
  });

  it("active streaks carry a unit (days/weeks)", () => {
    const habit = h({ id: "a" });
    const entries = days("a", "2026-06-08", 3);
    const review = buildWeeklyReview([habit], entries, "2026-06-10");
    const s = review.activeStreaks.find((x) => x.habitId === "a");
    expect(s?.unit).toBe("days");
  });
});
```

- [ ] **Step 2: Run, expect fail.**

Run: `npm test -- src/lib/insights.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement.** Overwrite `src/lib/insights.ts`:

```ts
import type { AppSettings, Habit, HabitEntry } from "./types";
import { completionRate, isHabitCompleted, streakStatus } from "./habit-utils";
import { buildRatingDistribution } from "./chart-data";
import { addDays, eachDayInRange, todayKey } from "./date-utils";

export type InsightKind =
  | "streak-celebration"
  | "weekly-rhythm"
  | "rating-summary"
  | "lower-target"
  | "simplify";

export interface Insight {
  id: string;
  kind: InsightKind;
  habitId?: string;
  title: string;
  message: string;
  tone: "positive" | "suggestion";
}

export interface ActiveStreak {
  habitId: string;
  streak: number;
  unit: "days" | "weeks";
}

export interface WeeklyReview {
  consistency: number; // 0..1 across daily habits this week
  bestHabitId: string | null;
  frictionHabitId: string | null;
  missedDays: number;
  activeStreaks: ActiveStreak[];
  insights: Insight[];
}

function entriesFor(habitId: string, entries: HabitEntry[]): HabitEntry[] {
  return entries.filter((e) => e.habitId === habitId);
}

function missesInLast7(habit: Habit, entries: HabitEntry[], todayK: string): number {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const yesterday = addDays(todayK, -1);
  let from = addDays(todayK, -7);
  const start = habit.createdAt.slice(0, 10);
  if (from < start) from = start;
  let misses = 0;
  for (const day of eachDayInRange(from, yesterday)) {
    if (!isHabitCompleted(habit, byDate.get(day))) misses += 1;
  }
  return misses;
}

function ratingSummary(habit: Habit, entries: HabitEntry[], todayK: string): Insight | null {
  const from = addDays(todayK, -6);
  const recent = entries.filter((e) => e.date >= from && e.date <= todayK);
  if (recent.length === 0) return null;
  const dist = buildRatingDistribution(habit, recent);
  const total = dist.reduce((s, d) => s + d.count, 0);
  if (total === 0) return null;
  const top = dist.reduce((a, b) => (b.count > a.count ? b : a));
  const mostly = top.count / total >= 0.6;
  return {
    id: `rating-${habit.id}`,
    kind: "rating-summary",
    habitId: habit.id,
    title: `${habit.name} this week`,
    message: mostly
      ? `${habit.name} was mostly ${top.label} this week.`
      : `${habit.name} was mixed this week.`,
    tone: "positive",
  };
}

export function buildWeeklyReview(
  habits: Habit[],
  entries: HabitEntry[],
  todayK: string = todayKey(),
  settings: AppSettings = { weekStartsOn: 1 },
): WeeklyReview {
  const active = habits.filter((h) => !h.archivedAt);
  const insights: Insight[] = [];
  const activeStreaks: ActiveStreak[] = [];

  let bestHabitId: string | null = null;
  let frictionHabitId: string | null = null;
  let bestRate = -1;
  let worstRate = Infinity;

  let totalDays = 0;
  let completedDays = 0;
  let missed = 0;

  for (const h of active) {
    const hEntries = entriesFor(h.id, entries);
    const status = streakStatus(h, hEntries, todayK, settings);

    if (status.type === "daily" && status.count > 0) {
      activeStreaks.push({ habitId: h.id, streak: status.count, unit: "days" });
    } else if (status.type === "weekly" && status.count > 0) {
      activeStreaks.push({ habitId: h.id, streak: status.count, unit: "weeks" });
    }

    // best/friction + consistency only consider daily habits (rate is meaningful there)
    if (h.streakType === "daily") {
      const rate = completionRate(h, hEntries, 7, todayK);
      if (rate > bestRate) { bestRate = rate; bestHabitId = h.id; }
      if (rate < worstRate) { worstRate = rate; frictionHabitId = h.id; }
      const byDate = new Map(hEntries.map((e) => [e.date, e]));
      for (const day of eachDayInRange(addDays(todayK, -6), todayK)) {
        totalDays += 1;
        if (isHabitCompleted(h, byDate.get(day))) completedDays += 1;
        else if (day !== todayK) missed += 1;
      }
    }

    // Rule: celebrate daily streaks that are a positive multiple of 7
    if (status.type === "daily" && status.count > 0 && status.count % 7 === 0) {
      insights.push({
        id: `streak-${h.id}`, kind: "streak-celebration", habitId: h.id,
        title: `${status.count}-day streak on ${h.name}!`,
        message: "Momentum is building. Keep it going.", tone: "positive",
      });
    }

    // Rule: celebrate weekly rhythm held for a multiple of 4 weeks
    if (status.type === "weekly" && status.count > 0 && status.count % 4 === 0) {
      insights.push({
        id: `weekly-${h.id}`, kind: "weekly-rhythm", habitId: h.id,
        title: `${h.name} is holding its rhythm`,
        message: `${h.name} has hit its ${status.required}×/week rhythm for ${status.count} weeks in a row.`,
        tone: "positive",
      });
    }

    // Rule: rating habits get a neutral distribution summary
    if (h.type === "rating") {
      const ins = ratingSummary(h, hEntries, todayK);
      if (ins) insights.push(ins);
    }

    // Rule: targeted habit missed >3 of last 7 → suggest lowering the target
    if (h.streakType !== "none" && h.target && h.target > 0 && missesInLast7(h, hEntries, todayK) > 3) {
      insights.push({
        id: `lower-${h.id}`, kind: "lower-target", habitId: h.id,
        title: `${h.name} may be too heavy`,
        message: "Try lowering the target for next week.", tone: "suggestion",
      });
    }
  }

  // Rule: a lot of active habits → suggest simplifying
  if (active.length > 8) {
    insights.push({
      id: "simplify", kind: "simplify",
      title: "Your tracker looks heavy",
      message: `${active.length} active habits. Consider simplifying.`, tone: "suggestion",
    });
  }

  return {
    consistency: totalDays === 0 ? 0 : completedDays / totalDays,
    bestHabitId: active.length ? bestHabitId : null,
    frictionHabitId: active.length ? frictionHabitId : null,
    missedDays: missed,
    activeStreaks,
    insights,
  };
}
```

- [ ] **Step 4: Run, expect pass.**

Run: `npm test -- src/lib/insights.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/lib/insights.ts src/lib/insights.test.ts
git commit -m "feat(insights): rhythm-aware, neutral-language weekly review"
```

---

### Task 9: Phase 1 gate (logic green except known UI consumers)

- [ ] **Step 1: Run the full test suite.**

Run: `npm test -- --run`
Expected: All `src/lib/**` and `src/store/**`(store still old — see note) tests pass. Component/route tests that import the old model may fail — that's expected; they're fixed in Phases 2–3. Record which fail.

> If `habit-store.test.ts` or `habit-log-control.test.tsx` fail here, that is expected (fixed in Phase 2).

- [ ] **Step 2: Do NOT run `npm run build` yet** — `tsc` will still be red until Phases 2–3 land. Proceed to Phase 2.

---

## Phase 2 — Store + logging/display components

### Task 10: Zustand store

**Files:**
- Modify: `src/store/habit-store.ts`
- Test: `src/store/habit-store.test.ts`

- [ ] **Step 1: Update tests.** In `src/store/habit-store.test.ts`, update every `addHabit({...})` call and any habit fixtures to the new `AddHabitInput` shape (drop `frequency`/`activeDays`/`categoryOptions`/`targetUnit`; add `intendedRhythm`, `streakType`, and `unit` where relevant). Add/keep an assertion:

```ts
it("addHabit persists rhythm + streak fields", () => {
  const store = createHabitStore();
  const h = store.getState().addHabit({
    name: "Meditate", type: "yes_no", color: "#000",
    intendedRhythm: "daily", streakType: "daily",
  });
  expect(h.intendedRhythm).toBe("daily");
  expect(h.streakType).toBe("daily");
});
```

- [ ] **Step 2: Run, expect fail.**

Run: `npm test -- src/store/habit-store.test.ts`
Expected: FAIL (type/shape mismatch).

- [ ] **Step 3: Implement.** In `src/store/habit-store.ts`:

Replace `AddHabitInput`:

```ts
export interface AddHabitInput {
  name: string;
  type: Habit["type"];
  color: string;
  intendedRhythm: Habit["intendedRhythm"];
  streakType: Habit["streakType"];
  description?: string;
  icon?: string;
  target?: number;
  unit?: string;
  intendedCountPerWeek?: number;
}
```

Replace the `addHabit` habit-construction block:

```ts
const habit: Habit = {
  id: newId(),
  name: input.name,
  description: input.description,
  type: input.type,
  color: input.color,
  icon: input.icon,
  target: input.target,
  unit: input.unit,
  intendedRhythm: input.intendedRhythm,
  intendedCountPerWeek: input.intendedCountPerWeek,
  streakType: input.streakType,
  createdAt: now,
  archivedAt: null,
};
```

Change the two `snapshot` version literals: in `snapshot()` set `schemaVersion: 2`.

- [ ] **Step 4: Run, expect pass.**

Run: `npm test -- src/store/habit-store.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/store/habit-store.ts src/store/habit-store.test.ts
git commit -m "feat(store): AddHabitInput rhythm/streak fields; snapshot v2"
```

---

### Task 11: Logging controls (4 types)

**Files:**
- Modify: `src/components/habit-log-control.tsx`
- Test: `src/components/habit-log-control.test.tsx`

- [ ] **Step 1: Update tests.** Overwrite `src/components/habit-log-control.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HabitLogControl } from "./habit-log-control";
import type { Habit } from "@/lib/types";

function h(p: Partial<Habit>): Habit {
  return { id: "h", name: "H", type: "yes_no", color: "#000",
    intendedRhythm: "daily", streakType: "daily",
    createdAt: "2026-06-01T08:00:00.000Z", archivedAt: null, ...p };
}

describe("HabitLogControl v2", () => {
  it("yes_no toggles done", () => {
    const onChange = vi.fn();
    render(<HabitLogControl habit={h({ type: "yes_no" })} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("number takes a typed value and shows the unit", () => {
    const onChange = vi.fn();
    render(<HabitLogControl habit={h({ type: "number", unit: "pushups" })} onChange={onChange} />);
    expect(screen.getByText("pushups")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "15" } });
    expect(onChange).toHaveBeenLastCalledWith(15);
  });

  it("duration shows minutes and stores a number", () => {
    const onChange = vi.fn();
    render(<HabitLogControl habit={h({ type: "duration" })} onChange={onChange} />);
    expect(screen.getByText("minutes")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "20" } });
    expect(onChange).toHaveBeenLastCalledWith(20);
  });

  it("rating offers Low/Okay/Great and stores the literal", () => {
    const onChange = vi.fn();
    render(<HabitLogControl habit={h({ type: "rating", streakType: "none" })} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Great" }));
    expect(onChange).toHaveBeenCalledWith("great");
  });
});
```

- [ ] **Step 2: Run, expect fail.**

Run: `npm test -- src/components/habit-log-control.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement.** Overwrite `src/components/habit-log-control.tsx`:

```tsx
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
    case "duration": {
      const n = typeof value === "number" ? value : "";
      const unit = habit.type === "duration" ? "minutes" : (habit.unit ?? "");
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            aria-label={habit.name}
            value={n}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") { onChange(0); return; }
              const parsed = Number(raw);
              if (!Number.isNaN(parsed)) onChange(parsed);
            }}
            className="w-16 rounded-lg border bg-[var(--card)] px-2 py-1 text-sm tabular-nums"
          />
          {unit ? <span className="text-xs text-[var(--muted-foreground)]">{unit}</span> : null}
        </div>
      );
    }
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
```

- [ ] **Step 4: Run, expect pass.**

Run: `npm test -- src/components/habit-log-control.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/components/habit-log-control.tsx src/components/habit-log-control.test.tsx
git commit -m "feat(log-control): typed number/duration inputs + rating buttons"
```

---

### Task 12: Habit card (display + streak)

**Files:**
- Modify: `src/components/habit-card.tsx`

- [ ] **Step 1: Implement.** Overwrite `src/components/habit-card.tsx`. The card now receives a `StreakStatus` (computed by the parent) instead of a bare number:

```tsx
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
      if (streak.count > 0) return { flame: true, text: `${streak.count} day${streak.count === 1 ? "" : "s"}` };
      return streak.todayLogged ? null : { flame: false, text: "Today not logged yet" };
    case "weekly":
      return { flame: streak.count > 0, text: `${streak.count} week${streak.count === 1 ? "" : "s"} · ${streak.thisWeek} of ${streak.required} this week` };
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
```

- [ ] **Step 2: Commit.**

```bash
git add src/components/habit-card.tsx
git commit -m "feat(habit-card): render StreakStatus + v2 value display"
```

---

## Phase 3 — Form + consumer sweep

### Task 13: Habit form

**Files:**
- Modify: `src/components/habit-form.tsx`

- [ ] **Step 1: Implement.** Overwrite `src/components/habit-form.tsx`:

```tsx
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
```

- [ ] **Step 2: Commit.**

```bash
git add src/components/habit-form.tsx
git commit -m "feat(habit-form): 4 types + tracking rhythm + streak sections"
```

---

### Task 14: Today route

**Files:**
- Modify: `src/routes/today.tsx`

- [ ] **Step 1: Implement.** Replace the import line and the body so it (a) lists all active habits, (b) bases the progress ring on daily habits, and (c) passes a `StreakStatus` to each card. Replace lines using `isScheduledOn`/`currentStreak`:

Replace the import:
```tsx
import { isHabitCompleted, streakStatus } from "@/lib/habit-utils";
```

Add a settings selector after the existing store selectors:
```tsx
const settings = useHabitStore((s) => s.settings);
```

Replace the `scheduled`/`completed`/`bestStreak` block:
```tsx
const active = useMemo(() => habits.filter((h) => !h.archivedAt), [habits]);
const dailyHabits = useMemo(() => active.filter((h) => h.intendedRhythm === "daily"), [active]);

const entryFor = (habitId: string) =>
  entries.find((e) => e.habitId === habitId && e.date === today);

const completed = dailyHabits.filter((h) => isHabitCompleted(h, entryFor(h.id))).length;
const bestStreak = dailyHabits.reduce((max, h) => {
  const s = streakStatus(h, entries.filter((e) => e.habitId === h.id), today, settings);
  return s.type === "daily" ? Math.max(max, s.count) : max;
}, 0);
```

Replace the empty-state guard `if (habits.filter((h) => !h.archivedAt).length === 0)` with `if (active.length === 0)`.

Replace the `DailyProgressCard` props and the habit list:
```tsx
<DailyProgressCard completed={completed} total={dailyHabits.length} bestStreak={bestStreak} />
<div className="flex flex-col gap-2">
  {active.map((h) => (
    <HabitCard
      key={h.id}
      habit={h}
      entry={entryFor(h.id)}
      streak={streakStatus(h, entries.filter((e) => e.habitId === h.id), today, settings)}
      onLog={(value) => addOrUpdateEntry({ habitId: h.id, date: today, value })}
    />
  ))}
</div>
```

- [ ] **Step 2: Commit.**

```bash
git add src/routes/today.tsx
git commit -m "refactor(today): list all habits; ring counts daily; StreakStatus cards"
```

---

### Task 15: Habit detail route

**Files:**
- Modify: `src/routes/habit-detail.tsx`

- [ ] **Step 1: Implement.** Update the `computeStats` call to pass settings and render the new streak shape.

Add a settings selector near the other selectors:
```tsx
const settings = useHabitStore((s) => s.settings);
```

Replace the stats call:
```tsx
const stats = computeStats(habit, habitEntries, todayKey(), settings);
const streakValue =
  stats.streak.type === "daily" ? `${stats.streak.count}`
  : stats.streak.type === "weekly" ? `${stats.streak.count}`
  : "—";
const streakHint =
  stats.streak.type === "weekly" ? "weeks"
  : stats.streak.type === "daily" ? "days"
  : "";
const longestHint = stats.streak.type === "weekly" ? "weeks" : "days";
```

Replace the two streak `StatsCard`s:
```tsx
<StatsCard label="Current streak" value={streakValue} hint={streakHint} />
<StatsCard label="Longest streak" value={`${stats.longestStreak}`} hint={longestHint} />
```

- [ ] **Step 2: Commit.**

```bash
git add src/routes/habit-detail.tsx
git commit -m "refactor(habit-detail): render rhythm-aware streak stats"
```

---

### Task 16: Trend chart (rating distribution)

**Files:**
- Modify: `src/components/trend-chart.tsx`

- [ ] **Step 1: Implement.** Update the import and the two type checks:

Replace the import:
```tsx
import { buildTrendSeries, buildRatingDistribution } from "@/lib/chart-data";
```

Replace `if (habit.type === "category") {` with `if (habit.type === "rating") {` and inside it replace `const data = buildCategoryDistribution(habit, entries);` with `const data = buildRatingDistribution(habit, entries);`.

Replace `if (habit.type === "boolean") {` with `if (habit.type === "yes_no") {`.

- [ ] **Step 2: Commit.**

```bash
git add src/components/trend-chart.tsx
git commit -m "refactor(trend-chart): rating distribution + yes_no bars"
```

---

### Task 17: Calendar, day editor, heatmap sweep (drop isScheduledOn)

**Files:**
- Modify: `src/components/calendar-month.tsx`, `src/components/day-editor.tsx`, `src/components/habit-heatmap.tsx`

- [ ] **Step 1: calendar-month.** Replace the import `import { isHabitCompleted, isScheduledOn } from "@/lib/habit-utils";` with `import { isHabitCompleted } from "@/lib/habit-utils";`. Replace `ratioForDay`:

```tsx
function ratioForDay(day: string): number {
  const relevant = active.filter((h) => h.intendedRhythm === "daily");
  if (relevant.length === 0) return 0;
  const done = relevant.filter((h) =>
    isHabitCompleted(h, entries.find((e) => e.habitId === h.id && e.date === day)),
  ).length;
  return done / relevant.length;
}
```

- [ ] **Step 2: day-editor.** Replace `import { isScheduledOn } from "@/lib/habit-utils";` — delete that import line entirely. Replace `const scheduled = habits.filter((h) => !h.archivedAt && isScheduledOn(h, dateKey));` with `const shown = habits.filter((h) => !h.archivedAt);`. Replace the two later references to `scheduled` (`scheduled.length === 0` and `scheduled.map`) with `shown`. Update the empty copy `No habits scheduled this day.` → `No habits yet.`

- [ ] **Step 3: habit-heatmap.** Replace `import { isHabitCompleted, isScheduledOn } from "@/lib/habit-utils";` with `import { isHabitCompleted } from "@/lib/habit-utils";`. Replace `tint`:

```tsx
function tint(day: string): string {
  if (isHabitCompleted(habit, byDate.get(day))) return habit.color;
  return "var(--secondary)";
}
```

- [ ] **Step 4: Commit.**

```bash
git add src/components/calendar-month.tsx src/components/day-editor.tsx src/components/habit-heatmap.tsx
git commit -m "refactor(calendar/day-editor/heatmap): drop isScheduledOn"
```

---

### Task 18: Weekly review (streak units)

**Files:**
- Modify: `src/components/weekly-review.tsx`

- [ ] **Step 1: Implement.** Update the active-streak chip to show the unit. Replace the chip line:

```tsx
<Flame className="h-3 w-3 text-[#E8A23D]" /> {nameOf(s.habitId)} · {s.streak} {s.unit}
```

- [ ] **Step 2: Commit.**

```bash
git add src/components/weekly-review.tsx
git commit -m "refactor(weekly-review): show streak unit (days/weeks)"
```

---

## Phase 4 — Quality gate

### Task 19: Full typecheck, lint, tests, manual smoke

- [ ] **Step 1: Typecheck + build.**

Run: `npm run build`
Expected: PASS (no `tsc` errors). Fix any stragglers — likely unused imports (`newId` in habit-form, `pad`/`weekdayOf`/`formatDuration` in habit-utils, `CategorySlice` consumers). Grep to confirm nothing references removed symbols:

Run: `grep -rn -E "isScheduledOn|buildCategoryDistribution|categoryOptions|targetUnit|\"boolean\"|\"time\"|\"category\"|HabitFrequency|currentStreak\\(" --include='*.ts' --include='*.tsx' src | grep -v '\.test\.'`
Expected: no matches.

- [ ] **Step 2: Lint.**

Run: `npm run lint`
Expected: PASS (0 errors). Fix unused vars (prefix `_` or remove).

- [ ] **Step 3: Full test suite.**

Run: `npm test -- --run`
Expected: ALL green.

- [ ] **Step 4: Manual smoke (dev server).**

Run: `npm run dev` and verify in a browser:
- Create one habit of each type; logging works (toggle, typed number+unit, typed minutes, Low/Okay/Great).
- A daily habit shows "N days"; the seeded "Lower Body" shows weekly "N weeks · X of 2 this week"; "Energy" shows no streak.
- Habit Detail charts render for all four types without crashing (rating shows a 3-bar distribution).
- Settings → Export, then Import the same file: data round-trips. Importing an older (schema-1) export migrates without error.
- Calendar and Insights pages render.

- [ ] **Step 5: Final commit (if any gate fixups).**

```bash
git add -A
git commit -m "chore(habit-v2): typecheck/lint/test gate fixups"
```

- [ ] **Step 6: Review gate.** Hand off to the code review skill before merging to `main`.

---

## Self-review notes (author)

- **Spec coverage:** types ✓(T1) · completion ✓(T2) · streaks daily/weekly/none ✓(T3) · presets ✓(T4) · seed ✓(T5) · migration ✓(T6) · charts ✓(T7) · insights ✓(T8) · store ✓(T10) · log controls ✓(T11) · card ✓(T12) · form ✓(T13) · Today/detail/calendar/day-editor/heatmap/trend/weekly-review sweep ✓(T14–T18) · quality gate + manual QA ✓(T19).
- **Removed-symbol check** is an explicit gate step (T19.1).
- **Type consistency:** `streakStatus`/`StreakStatus` shape is defined once in T1 and consumed identically in T3/T12/T14/T15/T18; `AddHabitInput` (T10) matches `HabitForm.onSubmit` (T13); `unit` (not `targetUnit`) used throughout; `buildRatingDistribution` signature matches its consumer in T16.
- **Known intentional red window:** after T1 the repo does not `tsc`-compile until T19; vitest per-file keeps each task verifiable in the meantime.
