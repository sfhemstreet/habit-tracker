# Habit Tracker — Plan 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Vite + React + TS project and build a fully unit-tested, UI-free data/logic core: domain types, date utilities, habit calculations (completion, streaks, rates), the deterministic insights engine, seed data, the localStorage swap point, and the Zustand store.

**Architecture:** Everything in `src/lib/*` is pure and never imports the store. The store composes pure utils and owns persistence via the single `lib/storage.ts` swap point. Day keys are local `YYYY-MM-DD` strings to avoid timezone off-by-one. This plan produces a green Vitest suite — no UI yet.

**Tech Stack:** Vite, React 18, TypeScript (strict), Zustand, Vitest + jsdom, ESLint.

**Reference spec:** `docs/superpowers/specs/2026-06-21-habit-tracker-design.md`

---

## File map

```
package.json, tsconfig.json, tsconfig.node.json, vite.config.ts, eslint.config.js, .nvmrc, index.html
src/
  main.tsx              # minimal mount (replaced in Plan 2)
  App.tsx               # minimal placeholder (replaced in Plan 2)
  vite-env.d.ts
  test/setup.ts         # jsdom + jest-dom + localStorage reset
  lib/
    id.ts               # newId()
    types.ts            # domain types
    date-utils.ts       # local day-key math
    habit-utils.ts      # completion, streaks, stats, formatting
    insights.ts         # deterministic weekly review + rules
    seed-data.ts        # 5 example habits (no entries)
    storage.ts          # localStorage swap point + export/import
  store/
    habit-store.ts      # Zustand store (factory + singleton)
src tests live next to source as *.test.ts
```

---

## Task 0: Project scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `eslint.config.js`, `.nvmrc`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`, `src/test/setup.ts`

- [ ] **Step 1: Scaffold Vite into the existing repo**

The directory already contains `.git/`, `docs/`, `.gitignore`, `.superpowers/`. Run the scaffold and choose **"Ignore files and continue"** when prompted (this keeps our existing files):

```bash
cd ~/Documents/habit-tracker
node -v   # expect v18+ (repo has nvm v22.x). If not: nvm use 22
npm create vite@latest . -- --template react-ts
```

- [ ] **Step 2: Pin Node and install runtime + dev deps**

```bash
echo "22" > .nvmrc
npm install react-router-dom@^6 zustand@^5
npm install -D vitest@^2 jsdom@^25 @testing-library/react@^16 @testing-library/jest-dom@^6 @testing-library/user-event@^14
```

- [ ] **Step 3: Write `vite.config.ts`** (relative base for Electron/file://, plus Vitest config)

```ts
/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
```

- [ ] **Step 4: Write `src/test/setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

afterEach(() => {
  localStorage.clear();
});
```

- [ ] **Step 5: Ensure strict TypeScript**

Confirm `tsconfig.json` (or `tsconfig.app.json` produced by Vite) has `"strict": true`. Add these under `compilerOptions` if absent:

```json
"strict": true,
"noUnusedLocals": true,
"noUnusedParameters": true,
"noUncheckedIndexedAccess": true
```

- [ ] **Step 6: Replace `src/App.tsx` and `src/main.tsx` with minimal placeholders**

`src/App.tsx`:
```tsx
export default function App() {
  return <main>Habit Tracker</main>;
}
```

`src/main.tsx`:
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 7: Add the test script to `package.json`**

Ensure `"scripts"` contains:
```json
"dev": "vite",
"build": "tsc -b && vite build",
"lint": "eslint .",
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 8: Write a smoke test** — `src/smoke.test.ts`

```ts
import { describe, it, expect } from "vitest";

describe("test runner", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 9: Run the smoke test**

Run: `npm test`
Expected: PASS (1 test). Then delete `src/smoke.test.ts`.

- [ ] **Step 10: Verify build + lint, then commit**

```bash
npm run build && npm run lint
git add -A
git commit -m "chore: scaffold Vite + React + TS + Vitest"
```

---

## Task 1: ID helper

**Files:**
- Create: `src/lib/id.ts`, `src/lib/id.test.ts`

- [ ] **Step 1: Write the failing test** — `src/lib/id.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { newId } from "./id";

describe("newId", () => {
  it("returns a non-empty string", () => {
    expect(typeof newId()).toBe("string");
    expect(newId().length).toBeGreaterThan(0);
  });

  it("returns unique values", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newId()));
    expect(ids.size).toBe(1000);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/id.test.ts`
Expected: FAIL — cannot find module `./id`.

- [ ] **Step 3: Implement** — `src/lib/id.ts`

```ts
export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/id.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/id.ts src/lib/id.test.ts
git commit -m "feat(lib): add newId helper"
```

---

## Task 2: Domain types

**Files:**
- Create: `src/lib/types.ts`

No test (type-only module; consumers' tests cover it).

- [ ] **Step 1: Write** — `src/lib/types.ts`

```ts
export type HabitType = "boolean" | "number" | "duration" | "time" | "category";
export type HabitFrequency = "daily" | "custom"; // "weekly" reserved for later

export interface CategoryOption {
  id: string;
  label: string;
  color?: string;
}

export interface Habit {
  id: string;
  name: string;
  description?: string;
  type: HabitType;
  color: string;
  icon?: string; // Lucide icon name
  target?: number;
  targetUnit?: string;
  categoryOptions?: CategoryOption[];
  frequency: HabitFrequency;
  activeDays?: number[]; // 0=Sun..6=Sat, used when frequency === "custom"
  createdAt: string; // ISO timestamp
  archivedAt?: string | null;
}

export type HabitEntryValue = boolean | number | string;

export interface HabitEntry {
  id: string;
  habitId: string;
  date: string; // "YYYY-MM-DD" local day key
  value: HabitEntryValue;
  note?: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface HabitStats {
  currentStreak: number;
  longestStreak: number;
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

- [ ] **Step 2: Verify it compiles, then commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add src/lib/types.ts
git commit -m "feat(lib): add domain types"
```

---

## Task 3: Date utilities

**Files:**
- Create: `src/lib/date-utils.ts`, `src/lib/date-utils.test.ts`

All functions operate on **local** `YYYY-MM-DD` day keys. Tests pass an explicit `now` to avoid clock flakiness.

- [ ] **Step 1: Write the failing tests** — `src/lib/date-utils.test.ts`

```ts
import { describe, it, expect } from "vitest";
import {
  toDayKey,
  parseDayKey,
  todayKey,
  addDays,
  weekdayOf,
  eachDayInRange,
  isFuture,
  startOfWeekKey,
  daysBetween,
  formatLongDate,
} from "./date-utils";

describe("toDayKey / parseDayKey", () => {
  it("formats a local date as YYYY-MM-DD", () => {
    expect(toDayKey(new Date(2026, 5, 21))).toBe("2026-06-21"); // June = month 5
  });
  it("zero-pads month and day", () => {
    expect(toDayKey(new Date(2026, 0, 3))).toBe("2026-01-03");
  });
  it("round-trips through parseDayKey", () => {
    const d = parseDayKey("2026-06-21");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(21);
  });
});

describe("todayKey", () => {
  it("uses the provided now", () => {
    expect(todayKey(new Date(2026, 5, 21, 23, 59))).toBe("2026-06-21");
  });
});

describe("addDays", () => {
  it("adds days across a month boundary", () => {
    expect(addDays("2026-06-30", 1)).toBe("2026-07-01");
  });
  it("subtracts days across a year boundary", () => {
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("weekdayOf", () => {
  it("returns 0 for Sunday", () => {
    expect(weekdayOf("2026-06-21")).toBe(0); // 2026-06-21 is a Sunday
  });
  it("returns 1 for Monday", () => {
    expect(weekdayOf("2026-06-22")).toBe(1);
  });
});

describe("eachDayInRange", () => {
  it("returns inclusive range", () => {
    expect(eachDayInRange("2026-06-21", "2026-06-23")).toEqual([
      "2026-06-21",
      "2026-06-22",
      "2026-06-23",
    ]);
  });
  it("returns a single day when from === to", () => {
    expect(eachDayInRange("2026-06-21", "2026-06-21")).toEqual(["2026-06-21"]);
  });
  it("returns empty when from is after to", () => {
    expect(eachDayInRange("2026-06-23", "2026-06-21")).toEqual([]);
  });
});

describe("isFuture", () => {
  it("is true for a day after now", () => {
    expect(isFuture("2026-06-22", new Date(2026, 5, 21))).toBe(true);
  });
  it("is false for today and past", () => {
    expect(isFuture("2026-06-21", new Date(2026, 5, 21))).toBe(false);
    expect(isFuture("2026-06-20", new Date(2026, 5, 21))).toBe(false);
  });
});

describe("startOfWeekKey", () => {
  it("Monday start: Sunday 2026-06-21 belongs to week starting 2026-06-15", () => {
    expect(startOfWeekKey("2026-06-21", 1)).toBe("2026-06-15");
  });
  it("Sunday start: 2026-06-21 is its own week start", () => {
    expect(startOfWeekKey("2026-06-21", 0)).toBe("2026-06-21");
  });
});

describe("daysBetween", () => {
  it("counts whole days from a to b", () => {
    expect(daysBetween("2026-06-21", "2026-06-24")).toBe(3);
    expect(daysBetween("2026-06-24", "2026-06-21")).toBe(-3);
  });
});

describe("formatLongDate", () => {
  it("formats deterministically", () => {
    expect(formatLongDate("2026-06-21")).toBe("Sunday, June 21");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/date-utils.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `src/lib/date-utils.ts`

```ts
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const pad = (n: number) => String(n).padStart(2, "0");

export function toDayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(now: Date = new Date()): string {
  return toDayKey(now);
}

export function addDays(key: string, n: number): string {
  const d = parseDayKey(key);
  d.setDate(d.getDate() + n);
  return toDayKey(d);
}

export function weekdayOf(key: string): number {
  return parseDayKey(key).getDay();
}

export function eachDayInRange(fromKey: string, toKey: string): string[] {
  const out: string[] = [];
  if (fromKey > toKey) return out;
  let cursor = fromKey;
  while (cursor <= toKey) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}

export function isFuture(key: string, now: Date = new Date()): boolean {
  return key > todayKey(now);
}

export function startOfWeekKey(key: string, weekStartsOn: 0 | 1): string {
  const day = weekdayOf(key);
  const diff = (day - weekStartsOn + 7) % 7;
  return addDays(key, -diff);
}

export function daysBetween(fromKey: string, toKey: string): number {
  const ms = parseDayKey(toKey).getTime() - parseDayKey(fromKey).getTime();
  return Math.round(ms / 86_400_000);
}

export function formatLongDate(key: string): string {
  const d = parseDayKey(key);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
```

> Note: day keys are ISO-ordered strings, so `<`/`>`/`<=` comparisons are valid calendar comparisons.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/date-utils.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/date-utils.ts src/lib/date-utils.test.ts
git commit -m "feat(lib): add local-day date utilities"
```

---

## Task 4: Habit calculations

**Files:**
- Create: `src/lib/habit-utils.ts`, `src/lib/habit-utils.test.ts`

This is the correctness heart (completion, scheduling, streaks with the grace rule, rates, stats, formatting).

- [ ] **Step 1: Write the failing tests** — `src/lib/habit-utils.test.ts`

```ts
import { describe, it, expect } from "vitest";
import type { Habit, HabitEntry } from "./types";
import {
  isHabitCompleted,
  isScheduledOn,
  currentStreak,
  longestStreak,
  completionRate,
  totalCompletions,
  missedDays,
  computeStats,
  formatValue,
} from "./habit-utils";

function habit(partial: Partial<Habit>): Habit {
  return {
    id: "h1",
    name: "Test",
    type: "boolean",
    color: "#5B6CF0",
    frequency: "daily",
    createdAt: "2026-06-01T08:00:00.000Z",
    archivedAt: null,
    ...partial,
  };
}

function entry(date: string, value: HabitEntry["value"]): HabitEntry {
  return {
    id: `e-${date}`,
    habitId: "h1",
    date,
    value,
    createdAt: `${date}T08:00:00.000Z`,
    updatedAt: `${date}T08:00:00.000Z`,
  };
}

describe("isHabitCompleted", () => {
  it("boolean: true only when value is true", () => {
    const h = habit({ type: "boolean" });
    expect(isHabitCompleted(h, entry("2026-06-10", true))).toBe(true);
    expect(isHabitCompleted(h, entry("2026-06-10", false))).toBe(false);
    expect(isHabitCompleted(h, undefined)).toBe(false);
  });

  it("number without target: completed when > 0", () => {
    const h = habit({ type: "number" });
    expect(isHabitCompleted(h, entry("2026-06-10", 1))).toBe(true);
    expect(isHabitCompleted(h, entry("2026-06-10", 0))).toBe(false);
  });

  it("number with target: completed when >= target", () => {
    const h = habit({ type: "number", target: 8 });
    expect(isHabitCompleted(h, entry("2026-06-10", 8))).toBe(true);
    expect(isHabitCompleted(h, entry("2026-06-10", 7))).toBe(false);
  });

  it("duration with target behaves like number", () => {
    const h = habit({ type: "duration", target: 20 });
    expect(isHabitCompleted(h, entry("2026-06-10", 25))).toBe(true);
    expect(isHabitCompleted(h, entry("2026-06-10", 5))).toBe(false);
  });

  it("time: completed when a non-empty string value exists", () => {
    const h = habit({ type: "time" });
    expect(isHabitCompleted(h, entry("2026-06-10", "23:20"))).toBe(true);
    expect(isHabitCompleted(h, entry("2026-06-10", ""))).toBe(false);
  });

  it("category: completed when an option id exists", () => {
    const h = habit({ type: "category" });
    expect(isHabitCompleted(h, entry("2026-06-10", "opt-1"))).toBe(true);
    expect(isHabitCompleted(h, entry("2026-06-10", ""))).toBe(false);
  });
});

describe("isScheduledOn", () => {
  it("daily is always scheduled", () => {
    expect(isScheduledOn(habit({ frequency: "daily" }), "2026-06-21")).toBe(true);
  });
  it("custom respects activeDays (0=Sun)", () => {
    const h = habit({ frequency: "custom", activeDays: [1, 3, 5] }); // Mon/Wed/Fri
    expect(isScheduledOn(h, "2026-06-22")).toBe(true); // Monday
    expect(isScheduledOn(h, "2026-06-21")).toBe(false); // Sunday
  });
});

describe("currentStreak (daily, boolean)", () => {
  const today = "2026-06-21";
  it("counts consecutive completed days including today", () => {
    const h = habit({ createdAt: "2026-06-01T00:00:00Z" });
    const entries = [entry("2026-06-19", true), entry("2026-06-20", true), entry("2026-06-21", true)];
    expect(currentStreak(h, entries, today)).toBe(3);
  });

  it("today not logged does NOT break the streak (grace rule)", () => {
    const h = habit({ createdAt: "2026-06-01T00:00:00Z" });
    const entries = [entry("2026-06-19", true), entry("2026-06-20", true)]; // no today
    expect(currentStreak(h, entries, today)).toBe(2);
  });

  it("a past missed day breaks the streak", () => {
    const h = habit({ createdAt: "2026-06-01T00:00:00Z" });
    const entries = [entry("2026-06-18", true), entry("2026-06-20", true), entry("2026-06-21", true)];
    // 2026-06-19 is missing → streak is only 20th + 21st
    expect(currentStreak(h, entries, today)).toBe(2);
  });

  it("returns 0 when today incomplete and yesterday missed", () => {
    const h = habit({ createdAt: "2026-06-01T00:00:00Z" });
    const entries = [entry("2026-06-19", true)];
    expect(currentStreak(h, entries, today)).toBe(0);
  });
});

describe("currentStreak (custom schedule)", () => {
  it("skips unscheduled days when counting", () => {
    // Mon/Wed/Fri habit. Today Fri 2026-06-19.
    const h = habit({ frequency: "custom", activeDays: [1, 3, 5], createdAt: "2026-06-01T00:00:00Z" });
    const entries = [entry("2026-06-15", true), entry("2026-06-17", true), entry("2026-06-19", true)];
    expect(currentStreak(h, entries, "2026-06-19")).toBe(3);
  });
});

describe("longestStreak", () => {
  it("finds the longest historical run", () => {
    const h = habit({ createdAt: "2026-06-01T00:00:00Z" });
    const entries = [
      entry("2026-06-01", true),
      entry("2026-06-02", true),
      entry("2026-06-03", true),
      // gap on 4th
      entry("2026-06-05", true),
      entry("2026-06-06", true),
    ];
    expect(longestStreak(h, entries, "2026-06-21")).toBe(3);
  });
});

describe("completionRate", () => {
  it("is completed/scheduled within the window", () => {
    const h = habit({ createdAt: "2026-06-01T00:00:00Z" });
    const entries = [
      entry("2026-06-15", true),
      entry("2026-06-16", true),
      entry("2026-06-17", false),
      entry("2026-06-18", true),
      entry("2026-06-19", true),
      entry("2026-06-20", true),
      entry("2026-06-21", true),
    ];
    // 7-day window ending 2026-06-21: 7 scheduled, 6 completed
    expect(completionRate(h, entries, 7, "2026-06-21")).toBeCloseTo(6 / 7);
  });

  it("returns 0 when nothing scheduled in window", () => {
    const h = habit({ frequency: "custom", activeDays: [], createdAt: "2026-06-01T00:00:00Z" });
    expect(completionRate(h, [], 7, "2026-06-21")).toBe(0);
  });
});

describe("totalCompletions & missedDays", () => {
  it("counts completed entries and past missed scheduled days", () => {
    const h = habit({ createdAt: "2026-06-19T00:00:00Z" });
    const entries = [entry("2026-06-19", true), entry("2026-06-20", false)];
    // today = 21 (pending, excluded). Day 19 completed, day 20 missed.
    expect(totalCompletions(h, entries)).toBe(1);
    expect(missedDays(h, entries, "2026-06-21")).toBe(1);
  });
});

describe("computeStats", () => {
  it("bundles all stats", () => {
    const h = habit({ createdAt: "2026-06-19T00:00:00Z" });
    const entries = [entry("2026-06-19", true), entry("2026-06-20", true), entry("2026-06-21", true)];
    const s = computeStats(h, entries, "2026-06-21");
    expect(s.currentStreak).toBe(3);
    expect(s.longestStreak).toBe(3);
    expect(s.totalCompletions).toBe(3);
    expect(s.missedDays).toBe(0);
  });
});

describe("formatValue", () => {
  it("boolean", () => {
    expect(formatValue(habit({ type: "boolean" }), true)).toBe("Done");
    expect(formatValue(habit({ type: "boolean" }), false)).toBe("Not done");
  });
  it("number with unit", () => {
    expect(formatValue(habit({ type: "number", targetUnit: "glasses" }), 5)).toBe("5 glasses");
  });
  it("duration", () => {
    expect(formatValue(habit({ type: "duration" }), 20)).toBe("20m");
    expect(formatValue(habit({ type: "duration" }), 65)).toBe("1h 5m");
    expect(formatValue(habit({ type: "duration" }), 120)).toBe("2h");
  });
  it("time to 12-hour", () => {
    expect(formatValue(habit({ type: "time" }), "23:20")).toBe("11:20 PM");
    expect(formatValue(habit({ type: "time" }), "00:05")).toBe("12:05 AM");
  });
  it("category resolves the option label", () => {
    const h = habit({
      type: "category",
      categoryOptions: [{ id: "opt-1", label: "Strength" }],
    });
    expect(formatValue(h, "opt-1")).toBe("Strength");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/habit-utils.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `src/lib/habit-utils.ts`

```ts
import type { Habit, HabitEntry, HabitEntryValue, HabitStats } from "./types";
import { addDays, eachDayInRange, isFuture, toDayKey, weekdayOf } from "./date-utils";

const pad = (n: number) => String(n).padStart(2, "0");

export function isHabitCompleted(
  habit: Habit,
  entry: HabitEntry | undefined,
): boolean {
  if (!entry) return false;
  const v = entry.value;
  switch (habit.type) {
    case "boolean":
      return v === true;
    case "number":
    case "duration": {
      const n = typeof v === "number" ? v : Number(v);
      if (Number.isNaN(n)) return false;
      if (habit.target && habit.target > 0) return n >= habit.target;
      return n > 0;
    }
    case "time":
    case "category":
      return typeof v === "string" && v.length > 0;
    default:
      return false;
  }
}

export function isScheduledOn(habit: Habit, dayKey: string): boolean {
  if (habit.frequency === "daily") return true;
  return (habit.activeDays ?? []).includes(weekdayOf(dayKey));
}

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

/** Most recent scheduled day <= fromKey and >= startKey, or null. */
function prevScheduledDay(
  habit: Habit,
  fromKey: string,
  startKey: string,
): string | null {
  let cursor = fromKey;
  while (cursor >= startKey) {
    if (isScheduledOn(habit, cursor)) return cursor;
    cursor = addDays(cursor, -1);
  }
  return null;
}

export function currentStreak(
  habit: Habit,
  entries: HabitEntry[],
  todayK: string,
): number {
  const byDate = indexByDate(entries);
  const start = habitStartKey(habit, entries);
  if (todayK < start) return 0;

  let anchor = prevScheduledDay(habit, todayK, start);
  if (anchor === null) return 0;

  // Grace rule: a not-yet-completed today is "pending", not a miss.
  if (anchor === todayK && !isHabitCompleted(habit, byDate.get(anchor))) {
    anchor = prevScheduledDay(habit, addDays(todayK, -1), start);
    if (anchor === null) return 0;
  }

  let streak = 0;
  let cursor: string | null = anchor;
  while (cursor !== null && cursor >= start) {
    if (isHabitCompleted(habit, byDate.get(cursor))) {
      streak += 1;
      cursor = prevScheduledDay(habit, addDays(cursor, -1), start);
    } else {
      break;
    }
  }
  return streak;
}

export function longestStreak(
  habit: Habit,
  entries: HabitEntry[],
  todayK: string,
): number {
  const byDate = indexByDate(entries);
  const start = habitStartKey(habit, entries);
  let best = 0;
  let run = 0;
  for (const day of eachDayInRange(start, todayK)) {
    if (!isScheduledOn(habit, day)) continue;
    if (isHabitCompleted(habit, byDate.get(day))) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

export function completionRate(
  habit: Habit,
  entries: HabitEntry[],
  windowDays: number,
  todayK: string,
): number {
  const byDate = indexByDate(entries);
  const start = habitStartKey(habit, entries);
  let windowStart = addDays(todayK, -(windowDays - 1));
  if (windowStart < start) windowStart = start;

  let scheduled = 0;
  let completed = 0;
  for (const day of eachDayInRange(windowStart, todayK)) {
    if (isFuture(day)) continue;
    if (!isScheduledOn(habit, day)) continue;
    scheduled += 1;
    if (isHabitCompleted(habit, byDate.get(day))) completed += 1;
  }
  return scheduled === 0 ? 0 : completed / scheduled;
}

export function totalCompletions(habit: Habit, entries: HabitEntry[]): number {
  let count = 0;
  for (const e of entries) if (isHabitCompleted(habit, e)) count += 1;
  return count;
}

export function missedDays(
  habit: Habit,
  entries: HabitEntry[],
  todayK: string,
): number {
  const byDate = indexByDate(entries);
  const start = habitStartKey(habit, entries);
  const yesterday = addDays(todayK, -1); // exclude pending today
  let missed = 0;
  for (const day of eachDayInRange(start, yesterday)) {
    if (!isScheduledOn(habit, day)) continue;
    if (!isHabitCompleted(habit, byDate.get(day))) missed += 1;
  }
  return missed;
}

export function computeStats(
  habit: Habit,
  entries: HabitEntry[],
  todayK: string,
): HabitStats {
  return {
    currentStreak: currentStreak(habit, entries, todayK),
    longestStreak: longestStreak(habit, entries, todayK),
    completionRate7Days: completionRate(habit, entries, 7, todayK),
    completionRate30Days: completionRate(habit, entries, 30, todayK),
    totalCompletions: totalCompletions(habit, entries),
    missedDays: missedDays(habit, entries, todayK),
  };
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatTime(value: string): string {
  const [hStr, mStr] = value.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const period = h >= 12 ? "PM" : "AM";
  const hr12 = h % 12 === 0 ? 12 : h % 12;
  return `${hr12}:${pad(m)} ${period}`;
}

export function formatValue(habit: Habit, value: HabitEntryValue): string {
  switch (habit.type) {
    case "boolean":
      return value === true ? "Done" : "Not done";
    case "number":
      return `${Number(value)}${habit.targetUnit ? ` ${habit.targetUnit}` : ""}`;
    case "duration":
      return formatDuration(Number(value));
    case "time":
      return formatTime(String(value));
    case "category": {
      const opt = habit.categoryOptions?.find((o) => o.id === value);
      return opt?.label ?? String(value);
    }
    default:
      return String(value);
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/habit-utils.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/habit-utils.ts src/lib/habit-utils.test.ts
git commit -m "feat(lib): add habit completion, streak, rate, and format utils"
```

---

## Task 5: Insights engine

**Files:**
- Create: `src/lib/insights.ts`, `src/lib/insights.test.ts`

- [ ] **Step 1: Write the failing tests** — `src/lib/insights.test.ts`

```ts
import { describe, it, expect } from "vitest";
import type { Habit, HabitEntry } from "./types";
import { buildWeeklyReview } from "./insights";

function habit(p: Partial<Habit>): Habit {
  return {
    id: p.id ?? "h1",
    name: p.name ?? "Test",
    type: p.type ?? "boolean",
    color: "#5B6CF0",
    frequency: "daily",
    createdAt: "2026-05-01T00:00:00Z",
    archivedAt: null,
    ...p,
  };
}
function entry(habitId: string, date: string, value: HabitEntry["value"]): HabitEntry {
  return { id: `${habitId}-${date}`, habitId, date, value, createdAt: date, updatedAt: date };
}

const today = "2026-06-21";

describe("buildWeeklyReview", () => {
  it("celebrates a 7-day streak", () => {
    const h = habit({ id: "h1", name: "Meditate" });
    const entries: HabitEntry[] = [];
    for (let i = 0; i < 7; i++) entries.push(entry("h1", `2026-06-${15 + i}`, true));
    const review = buildWeeklyReview([h], entries, today, { weekStartsOn: 1 });
    expect(review.insights.some((x) => x.kind === "streak-celebration" && x.habitId === "h1")).toBe(true);
  });

  it("suggests lowering target after >3 misses with a target", () => {
    const h = habit({ id: "h2", name: "Water", type: "number", target: 8 });
    // last 7 days: 4 misses (value 0), 3 hits
    const entries = [
      entry("h2", "2026-06-15", 0),
      entry("h2", "2026-06-16", 0),
      entry("h2", "2026-06-17", 0),
      entry("h2", "2026-06-18", 0),
      entry("h2", "2026-06-19", 8),
      entry("h2", "2026-06-20", 8),
      entry("h2", "2026-06-21", 8),
    ];
    const review = buildWeeklyReview([h], entries, today, { weekStartsOn: 1 });
    expect(review.insights.some((x) => x.kind === "lower-target" && x.habitId === "h2")).toBe(true);
  });

  it("flags an overloaded day when more than 8 habits are scheduled", () => {
    const habits = Array.from({ length: 9 }, (_, i) => habit({ id: `h${i}`, name: `H${i}` }));
    const review = buildWeeklyReview(habits, [], today, { weekStartsOn: 1 });
    expect(review.insights.some((x) => x.kind === "simplify")).toBe(true);
  });

  it("computes best and friction habits", () => {
    const a = habit({ id: "a", name: "Easy" });
    const b = habit({ id: "b", name: "Hard" });
    const entries = [
      ...["15", "16", "17", "18", "19", "20", "21"].map((d) => entry("a", `2026-06-${d}`, true)),
      entry("b", "2026-06-15", true),
    ];
    const review = buildWeeklyReview([a, b], entries, today, { weekStartsOn: 1 });
    expect(review.bestHabitId).toBe("a");
    expect(review.frictionHabitId).toBe("b");
  });

  it("ignores archived habits", () => {
    const h = habit({ id: "h1", archivedAt: "2026-06-01T00:00:00Z" });
    const review = buildWeeklyReview([h], [], today, { weekStartsOn: 1 });
    expect(review.bestHabitId).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/insights.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `src/lib/insights.ts`

```ts
import type { AppSettings, Habit, HabitEntry } from "./types";
import {
  completionRate,
  currentStreak,
  isHabitCompleted,
  isScheduledOn,
} from "./habit-utils";
import { addDays, eachDayInRange, isFuture, todayKey } from "./date-utils";

export type InsightKind =
  | "streak-celebration"
  | "lower-target"
  | "stack-habit"
  | "simplify";

export interface Insight {
  id: string;
  kind: InsightKind;
  habitId?: string;
  title: string;
  message: string;
  tone: "positive" | "suggestion";
}

export interface WeeklyReview {
  consistency: number; // 0..1 across all habits this week
  bestHabitId: string | null;
  frictionHabitId: string | null;
  missedDays: number;
  activeStreaks: { habitId: string; streak: number }[];
  insights: Insight[];
}

function entriesFor(habitId: string, entries: HabitEntry[]): HabitEntry[] {
  return entries.filter((e) => e.habitId === habitId);
}

function missesInLast7(habit: Habit, entries: HabitEntry[], todayK: string): number {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const yesterday = addDays(todayK, -1);
  let misses = 0;
  for (const day of eachDayInRange(addDays(todayK, -7), yesterday)) {
    if (!isScheduledOn(habit, day)) continue;
    if (!isHabitCompleted(habit, byDate.get(day))) misses += 1;
  }
  return misses;
}

export function buildWeeklyReview(
  habits: Habit[],
  entries: HabitEntry[],
  todayK: string = todayKey(),
  settings: AppSettings = { weekStartsOn: 1 },
): WeeklyReview {
  const active = habits.filter((h) => !h.archivedAt);
  const insights: Insight[] = [];
  const activeStreaks: { habitId: string; streak: number }[] = [];

  let bestHabitId: string | null = null;
  let frictionHabitId: string | null = null;
  let bestRate = -1;
  let worstRate = Infinity;

  let totalScheduled = 0;
  let totalCompleted = 0;
  let totalMissed = 0;

  const byDate = (id: string) => new Map(entriesFor(id, entries).map((e) => [e.date, e]));

  for (const h of active) {
    const hEntries = entriesFor(h.id, entries);
    const rate = completionRate(h, hEntries, 7, todayK);
    const streak = currentStreak(h, hEntries, todayK);
    if (streak > 0) activeStreaks.push({ habitId: h.id, streak });

    if (rate > bestRate) {
      bestRate = rate;
      bestHabitId = h.id;
    }
    if (rate < worstRate) {
      worstRate = rate;
      frictionHabitId = h.id;
    }

    // weekly consistency accumulation (this calendar-ish week = trailing 7 days)
    const map = byDate(h.id);
    for (const day of eachDayInRange(addDays(todayK, -6), todayK)) {
      if (isFuture(day) || !isScheduledOn(h, day)) continue;
      totalScheduled += 1;
      if (isHabitCompleted(h, map.get(day))) totalCompleted += 1;
      else if (day !== todayK) totalMissed += 1;
    }

    // Rule: celebrate a streak that is a positive multiple of 7
    if (streak > 0 && streak % 7 === 0) {
      insights.push({
        id: `streak-${h.id}`,
        kind: "streak-celebration",
        habitId: h.id,
        title: `${streak}-day streak on ${h.name}!`,
        message: "Momentum is building. Keep it going.",
        tone: "positive",
      });
    }

    // Rule: lower the target after >3 misses with a target
    if (h.target && h.target > 0 && missesInLast7(h, hEntries, todayK) > 3) {
      insights.push({
        id: `lower-${h.id}`,
        kind: "lower-target",
        habitId: h.id,
        title: `${h.name} may be too heavy`,
        message: "Try lowering the target for next week.",
        tone: "suggestion",
      });
    }

    // Rule: inconsistent (30–70% over 14 days) → stack onto a routine
    const rate14 = completionRate(h, hEntries, 14, todayK);
    if (rate14 >= 0.3 && rate14 <= 0.7) {
      insights.push({
        id: `stack-${h.id}`,
        kind: "stack-habit",
        habitId: h.id,
        title: `${h.name} is hit-or-miss`,
        message: "Try attaching it to an existing routine to stay consistent.",
        tone: "suggestion",
      });
    }
  }

  // Rule: too many habits scheduled today → simplify
  const scheduledToday = active.filter((h) => isScheduledOn(h, todayK)).length;
  if (scheduledToday > 8) {
    insights.push({
      id: "simplify",
      kind: "simplify",
      title: "Your day looks heavy",
      message: `${scheduledToday} habits scheduled today. Consider simplifying.`,
      tone: "suggestion",
    });
  }

  return {
    consistency: totalScheduled === 0 ? 0 : totalCompleted / totalScheduled,
    bestHabitId: active.length ? bestHabitId : null,
    frictionHabitId: active.length ? frictionHabitId : null,
    missedDays: totalMissed,
    activeStreaks,
    insights,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/insights.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/insights.ts src/lib/insights.test.ts
git commit -m "feat(lib): add deterministic weekly review + insight rules"
```

---

## Task 6: Seed data

**Files:**
- Create: `src/lib/seed-data.ts`, `src/lib/seed-data.test.ts`

- [ ] **Step 1: Write the failing tests** — `src/lib/seed-data.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { createSeedHabits } from "./seed-data";

describe("createSeedHabits", () => {
  it("returns exactly 5 habits, one per type, with no entries", () => {
    const habits = createSeedHabits();
    expect(habits).toHaveLength(5);
    const types = habits.map((h) => h.type).sort();
    expect(types).toEqual(["boolean", "category", "duration", "number", "time"]);
  });

  it("gives unique ids", () => {
    const ids = new Set(createSeedHabits().map((h) => h.id));
    expect(ids.size).toBe(5);
  });

  it("the category habit has options", () => {
    const cat = createSeedHabits().find((h) => h.type === "category")!;
    expect(cat.categoryOptions && cat.categoryOptions.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/seed-data.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `src/lib/seed-data.ts`

```ts
import type { Habit } from "./types";
import { newId } from "./id";

export function createSeedHabits(now: Date = new Date()): Habit[] {
  const createdAt = now.toISOString();
  return [
    {
      id: newId(),
      name: "Read",
      description: "A little reading every day.",
      type: "duration",
      color: "#5B6CF0",
      icon: "book-open",
      target: 20,
      targetUnit: "min",
      frequency: "daily",
      createdAt,
      archivedAt: null,
    },
    {
      id: newId(),
      name: "Drink water",
      type: "number",
      color: "#3BA8E5",
      icon: "droplet",
      target: 8,
      targetUnit: "glasses",
      frequency: "daily",
      createdAt,
      archivedAt: null,
    },
    {
      id: newId(),
      name: "Meditate",
      type: "boolean",
      color: "#0E9F77",
      icon: "flower",
      frequency: "daily",
      createdAt,
      archivedAt: null,
    },
    {
      id: newId(),
      name: "Sleep time",
      type: "time",
      color: "#8B6CF0",
      icon: "moon",
      frequency: "daily",
      createdAt,
      archivedAt: null,
    },
    {
      id: newId(),
      name: "Workout",
      type: "category",
      color: "#E8A23D",
      icon: "dumbbell",
      frequency: "daily",
      categoryOptions: [
        { id: newId(), label: "Strength" },
        { id: newId(), label: "Cardio" },
        { id: newId(), label: "Mobility" },
        { id: newId(), label: "Rest" },
      ],
      createdAt,
      archivedAt: null,
    },
  ];
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/seed-data.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/seed-data.ts src/lib/seed-data.test.ts
git commit -m "feat(lib): add 5 seed example habits"
```

---

## Task 7: Storage (localStorage swap point)

**Files:**
- Create: `src/lib/storage.ts`, `src/lib/storage.test.ts`

- [ ] **Step 1: Write the failing tests** — `src/lib/storage.test.ts`

```ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  STORAGE_KEY,
  defaultData,
  loadData,
  saveData,
  exportData,
  parseImport,
} from "./storage";
import type { PersistedData } from "./types";

beforeEach(() => localStorage.clear());

function sample(): PersistedData {
  return {
    schemaVersion: 1,
    habits: [
      {
        id: "h1",
        name: "Read",
        type: "duration",
        color: "#5B6CF0",
        frequency: "daily",
        createdAt: "2026-06-01T00:00:00Z",
        archivedAt: null,
      },
    ],
    entries: [],
    settings: { weekStartsOn: 1 },
    initializedAt: "2026-06-01T00:00:00Z",
  };
}

describe("loadData", () => {
  it("returns fresh default (initializedAt null) when nothing stored", () => {
    const data = loadData();
    expect(data.initializedAt).toBeNull();
    expect(data.habits).toEqual([]);
    expect(data.schemaVersion).toBe(1);
  });

  it("round-trips saved data", () => {
    saveData(sample());
    expect(loadData()).toEqual(sample());
  });

  it("falls back to default on corrupt JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadData().initializedAt).toBeNull();
  });
});

describe("exportData / parseImport", () => {
  it("export produces valid JSON that parseImport accepts", () => {
    const json = exportData(sample());
    expect(parseImport(json)).toEqual(sample());
  });

  it("parseImport rejects malformed payloads", () => {
    expect(() => parseImport("{}")).toThrow();
    expect(() => parseImport('{"habits":"nope"}')).toThrow();
    expect(() => parseImport("not json")).toThrow();
  });
});

describe("defaultData", () => {
  it("has Monday week start", () => {
    expect(defaultData().settings.weekStartsOn).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `src/lib/storage.ts`

```ts
import type { PersistedData } from "./types";

export const STORAGE_KEY = "habit-tracker.v1";
export const SCHEMA_VERSION = 1;

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
  return (
    typeof d.schemaVersion === "number" &&
    Array.isArray(d.habits) &&
    Array.isArray(d.entries) &&
    typeof d.settings === "object" &&
    d.settings !== null
  );
}

/** Hook for future schema migrations. */
function migrate(data: PersistedData): PersistedData {
  return data;
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

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage.ts src/lib/storage.test.ts
git commit -m "feat(lib): add localStorage persistence + export/import validation"
```

---

## Task 8: Zustand store

**Files:**
- Create: `src/store/habit-store.ts`, `src/store/habit-store.test.ts`

The store exposes a `createHabitStore()` factory (for isolated tests) plus a `useHabitStore` singleton. Mutations persist through `saveData`. On first ever load (`initializedAt === null`), it seeds the 5 example habits.

- [ ] **Step 1: Write the failing tests** — `src/store/habit-store.test.ts`

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { createHabitStore } from "./habit-store";
import { loadData } from "../lib/storage";

beforeEach(() => localStorage.clear());

describe("store seeding", () => {
  it("seeds 5 habits on first load and sets initializedAt", () => {
    const store = createHabitStore();
    expect(store.getState().habits).toHaveLength(5);
    expect(store.getState().initializedAt).not.toBeNull();
  });

  it("does not reseed when initializedAt is already set", () => {
    createHabitStore(); // seeds + persists
    const second = createHabitStore(); // reads persisted
    expect(second.getState().habits).toHaveLength(5);
  });
});

describe("habit CRUD", () => {
  it("adds a habit and persists it", () => {
    const store = createHabitStore();
    const h = store.getState().addHabit({
      name: "Stretch",
      type: "boolean",
      color: "#0E9F77",
      frequency: "daily",
    });
    expect(store.getState().habits.some((x) => x.id === h.id)).toBe(true);
    expect(loadData().habits.some((x) => x.id === h.id)).toBe(true);
  });

  it("updates a habit", () => {
    const store = createHabitStore();
    const h = store.getState().habits[0];
    store.getState().updateHabit(h.id, { name: "Renamed" });
    expect(store.getState().habits.find((x) => x.id === h.id)?.name).toBe("Renamed");
  });

  it("archives without deleting entries", () => {
    const store = createHabitStore();
    const h = store.getState().habits[0];
    store.getState().addOrUpdateEntry({ habitId: h.id, date: "2026-06-21", value: true });
    store.getState().archiveHabit(h.id);
    expect(store.getState().habits.find((x) => x.id === h.id)?.archivedAt).toBeTruthy();
    expect(store.getState().getEntriesForHabit(h.id)).toHaveLength(1);
  });

  it("deletes a habit and its entries", () => {
    const store = createHabitStore();
    const h = store.getState().habits[0];
    store.getState().addOrUpdateEntry({ habitId: h.id, date: "2026-06-21", value: true });
    store.getState().deleteHabit(h.id);
    expect(store.getState().habits.some((x) => x.id === h.id)).toBe(false);
    expect(store.getState().getEntriesForHabit(h.id)).toHaveLength(0);
  });
});

describe("entries", () => {
  it("upserts on (habitId, date) — no duplicates", () => {
    const store = createHabitStore();
    const h = store.getState().habits[0];
    store.getState().addOrUpdateEntry({ habitId: h.id, date: "2026-06-21", value: 1 });
    store.getState().addOrUpdateEntry({ habitId: h.id, date: "2026-06-21", value: 5 });
    const forDate = store.getState().getEntriesForDate("2026-06-21").filter((e) => e.habitId === h.id);
    expect(forDate).toHaveLength(1);
    expect(forDate[0].value).toBe(5);
  });

  it("deletes an entry by habit + date", () => {
    const store = createHabitStore();
    const h = store.getState().habits[0];
    store.getState().addOrUpdateEntry({ habitId: h.id, date: "2026-06-21", value: true });
    store.getState().deleteEntry(h.id, "2026-06-21");
    expect(store.getState().getEntriesForDate("2026-06-21")).toHaveLength(0);
  });
});

describe("data management", () => {
  it("export → import round-trips", () => {
    const store = createHabitStore();
    store.getState().addHabit({ name: "X", type: "boolean", color: "#000", frequency: "daily" });
    const json = store.getState().exportData();

    const other = createHabitStore();
    other.getState().clearData();
    other.getState().importData(json);
    expect(other.getState().habits.some((x) => x.name === "X")).toBe(true);
  });

  it("clearData empties habits/entries but stays empty on reload (no reseed)", () => {
    const store = createHabitStore();
    store.getState().clearData();
    expect(store.getState().habits).toHaveLength(0);
    expect(store.getState().initializedAt).not.toBeNull();
    const reloaded = createHabitStore();
    expect(reloaded.getState().habits).toHaveLength(0);
  });

  it("loadSampleData re-adds the 5 seed habits", () => {
    const store = createHabitStore();
    store.getState().clearData();
    store.getState().loadSampleData();
    expect(store.getState().habits).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/store/habit-store.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `src/store/habit-store.ts`

```ts
import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import type {
  AppSettings,
  Habit,
  HabitEntry,
  HabitEntryValue,
  PersistedData,
} from "../lib/types";
import { newId } from "../lib/id";
import { createSeedHabits } from "../lib/seed-data";
import {
  exportData as exportDataFn,
  loadData,
  parseImport,
  saveData,
  defaultData,
} from "../lib/storage";

export interface AddHabitInput {
  name: string;
  type: Habit["type"];
  color: string;
  frequency: Habit["frequency"];
  description?: string;
  icon?: string;
  target?: number;
  targetUnit?: string;
  categoryOptions?: Habit["categoryOptions"];
  activeDays?: number[];
}

export interface UpsertEntryInput {
  habitId: string;
  date: string;
  value: HabitEntryValue;
  note?: string;
}

export interface HabitState {
  habits: Habit[];
  entries: HabitEntry[];
  settings: AppSettings;
  initializedAt: string | null;

  addHabit: (input: AddHabitInput) => Habit;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  archiveHabit: (id: string) => void;
  deleteHabit: (id: string) => void;

  addOrUpdateEntry: (input: UpsertEntryInput) => HabitEntry;
  deleteEntry: (habitId: string, date: string) => void;
  getEntriesForDate: (date: string) => HabitEntry[];
  getEntriesForHabit: (habitId: string) => HabitEntry[];

  exportData: () => string;
  importData: (json: string) => void;
  clearData: () => void;
  loadSampleData: () => void;
}

function snapshot(state: HabitState): PersistedData {
  return {
    schemaVersion: 1,
    habits: state.habits,
    entries: state.entries,
    settings: state.settings,
    initializedAt: state.initializedAt,
  };
}

export function createHabitStore() {
  let initial = loadData();
  // First ever load → seed the 5 examples once.
  if (initial.initializedAt === null) {
    initial = {
      ...initial,
      habits: createSeedHabits(),
      initializedAt: new Date().toISOString(),
    };
    saveData(initial);
  }

  return createStore<HabitState>((set, get) => {
    const persist = () => saveData(snapshot(get()));

    return {
      habits: initial.habits,
      entries: initial.entries,
      settings: initial.settings,
      initializedAt: initial.initializedAt,

      addHabit: (input) => {
        const now = new Date().toISOString();
        const habit: Habit = {
          id: newId(),
          name: input.name,
          description: input.description,
          type: input.type,
          color: input.color,
          icon: input.icon,
          target: input.target,
          targetUnit: input.targetUnit,
          categoryOptions: input.categoryOptions,
          frequency: input.frequency,
          activeDays: input.activeDays,
          createdAt: now,
          archivedAt: null,
        };
        set({ habits: [...get().habits, habit] });
        persist();
        return habit;
      },

      updateHabit: (id, patch) => {
        set({
          habits: get().habits.map((h) => (h.id === id ? { ...h, ...patch, id: h.id } : h)),
        });
        persist();
      },

      archiveHabit: (id) => {
        set({
          habits: get().habits.map((h) =>
            h.id === id ? { ...h, archivedAt: new Date().toISOString() } : h,
          ),
        });
        persist();
      },

      deleteHabit: (id) => {
        set({
          habits: get().habits.filter((h) => h.id !== id),
          entries: get().entries.filter((e) => e.habitId !== id),
        });
        persist();
      },

      addOrUpdateEntry: (input) => {
        const now = new Date().toISOString();
        const existing = get().entries.find(
          (e) => e.habitId === input.habitId && e.date === input.date,
        );
        let result: HabitEntry;
        if (existing) {
          result = { ...existing, value: input.value, note: input.note, updatedAt: now };
          set({ entries: get().entries.map((e) => (e.id === existing.id ? result : e)) });
        } else {
          result = {
            id: newId(),
            habitId: input.habitId,
            date: input.date,
            value: input.value,
            note: input.note,
            createdAt: now,
            updatedAt: now,
          };
          set({ entries: [...get().entries, result] });
        }
        persist();
        return result;
      },

      deleteEntry: (habitId, date) => {
        set({
          entries: get().entries.filter((e) => !(e.habitId === habitId && e.date === date)),
        });
        persist();
      },

      getEntriesForDate: (date) => get().entries.filter((e) => e.date === date),
      getEntriesForHabit: (habitId) => get().entries.filter((e) => e.habitId === habitId),

      exportData: () => exportDataFn(snapshot(get())),

      importData: (json) => {
        const data = parseImport(json);
        set({
          habits: data.habits,
          entries: data.entries,
          settings: data.settings,
          initializedAt: data.initializedAt ?? new Date().toISOString(),
        });
        persist();
      },

      clearData: () => {
        const base = defaultData();
        set({
          habits: [],
          entries: [],
          settings: base.settings,
          initializedAt: new Date().toISOString(), // keep set so we never reseed
        });
        persist();
      },

      loadSampleData: () => {
        set({ habits: [...get().habits, ...createSeedHabits()] });
        persist();
      },
    };
  });
}

export const habitStore = createHabitStore();

export function useHabitStore<T>(selector: (state: HabitState) => T): T {
  return useStore(habitStore, selector);
}
```

> **zustand v5 note:** always select per-field or use `useShallow` for object selectors in components — object-literal selectors cause re-render churn / runtime issues. (See project memory `zustand-v5-object-selectors`.)

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/store/habit-store.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/habit-store.ts src/store/habit-store.test.ts
git commit -m "feat(store): add zustand habit store with persistence + seeding"
```

---

## Task 9: Foundation gate

- [ ] **Step 1: Run the full suite + typecheck + lint**

```bash
npm test
npx tsc --noEmit
npm run lint
```
Expected: all tests pass; no type errors; no lint errors.

- [ ] **Step 2: Commit any cleanup**

```bash
git add -A
git commit -m "chore: foundation green — all lib + store tests passing" || echo "nothing to commit"
```

---

## Self-review notes (coverage vs. spec)

- §5 data model → Task 2. §8 date/completion/streak semantics → Tasks 3–4 (grace rule explicitly tested). §13 insight rules → Task 5. §14 seed (5 habits, no entries) → Task 6. §6 storage swap point + export/import validation → Task 7. §7 store API (all listed actions + `loadSampleData`) → Task 8.
- Deferred to Plan 2/3: all components, routing, charts, and UI-level acceptance items (§9–§12, §15–§16). Plan 1's deliverable is a green logic core.
```
