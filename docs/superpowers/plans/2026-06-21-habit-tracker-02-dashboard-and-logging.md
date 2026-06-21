# Habit Tracker — Plan 2: Shell, Dashboard & Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the tested logic core into a running, usable app: Tailwind + shadcn styling in the Cool Mist palette, the AppShell with sidebar/bottom-nav routing, and a fully functional Today dashboard where every habit type can be logged.

**Architecture:** React Router `HashRouter` mounts an `AppShell` (persistent sidebar on desktop, bottom nav on mobile). Pages read the singleton store with per-field selectors. `HabitLogControl` dispatches on `habit.type` to the right quick-log UI and calls `addOrUpdateEntry`. Add/Edit is a responsive shadcn Dialog/Sheet.

**Tech Stack:** Tailwind CSS v4, shadcn/ui, Lucide, React Router v6, Zustand (from Plan 1).

**Prerequisite:** Plan 1 complete (green `npm test`).
**Reference spec:** `docs/superpowers/specs/2026-06-21-habit-tracker-design.md`

---

## File map

```
components.json                          # shadcn config
src/index.css                            # Tailwind + Cool Mist tokens
src/lib/utils.ts                         # cn() (shadcn)
src/lib/habit-presets.ts                 # per-type form defaults
src/lib/color-palette.ts                 # 8 habit colors
src/components/
  ui/                                    # shadcn primitives (button, dialog, sheet, input, select, label, switch)
  app-shell.tsx
  sidebar.tsx
  mobile-nav.tsx
  nav-items.ts                           # shared route list
  progress-ring.tsx
  empty-state.tsx
  today-header.tsx
  daily-progress-card.tsx
  habit-icon.tsx                         # Lucide name -> icon
  habit-card.tsx
  habit-log-control.tsx
  add-habit-dialog.tsx
  habit-form.tsx
src/routes/
  today.tsx
  calendar.tsx        # placeholder (Plan 3)
  insights.tsx        # placeholder (Plan 3)
  settings.tsx        # placeholder (Plan 3)
  habit-detail.tsx    # placeholder (Plan 3)
src/App.tsx           # router
```

---

## Task 0: Tailwind v4 + shadcn + Cool Mist tokens

**Files:**
- Create/modify: `vite.config.ts`, `src/index.css`, `tsconfig.json`, `tsconfig.app.json`, `components.json`, `src/lib/utils.ts`

- [ ] **Step 1: Install Tailwind v4, lucide, recharts, and helpers**

```bash
npm install tailwindcss @tailwindcss/vite class-variance-authority clsx tailwind-merge lucide-react recharts
npm install -D @types/node
```

- [ ] **Step 2: Add the Tailwind plugin and `@` alias to `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
```

- [ ] **Step 3: Add the path alias to `tsconfig.json` and `tsconfig.app.json`**

In both, under `compilerOptions`:
```json
"baseUrl": ".",
"paths": { "@/*": ["./src/*"] }
```

- [ ] **Step 4: Write `src/index.css`** (Tailwind v4 + Cool Mist tokens mapped to shadcn variables)

```css
@import "tailwindcss";

@theme {
  --color-bg: #f4f6fa;
  --color-surface: #ffffff;
  --color-ink: #1e2230;
  --color-muted: #7a8194;
  --color-line: #eef1f6;
  --color-accent: #5b6cf0;
  --color-accent-soft: #e7eafd;
  --color-success: #0e9f77;
  --color-success-soft: #e2f3ec;
  --radius: 0.9rem;
}

/* shadcn token bridge (light only) */
:root {
  --background: #f4f6fa;
  --foreground: #1e2230;
  --card: #ffffff;
  --card-foreground: #1e2230;
  --popover: #ffffff;
  --popover-foreground: #1e2230;
  --primary: #5b6cf0;
  --primary-foreground: #ffffff;
  --secondary: #eef1f6;
  --secondary-foreground: #1e2230;
  --muted: #eef1f6;
  --muted-foreground: #7a8194;
  --accent: #e7eafd;
  --accent-foreground: #1e2230;
  --destructive: #e5484d;
  --destructive-foreground: #ffffff;
  --border: #eef1f6;
  --input: #e6e9f1;
  --ring: #5b6cf0;
}

* {
  border-color: var(--border);
}
body {
  background: var(--background);
  color: var(--foreground);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

Ensure `src/main.tsx` imports it: `import "./index.css";`

- [ ] **Step 5: Initialize shadcn and add the primitives we use**

```bash
npx shadcn@latest init -d
npx shadcn@latest add button dialog sheet input label select switch dropdown-menu
```

If `init` asks about config, accept defaults (style: default; base color: slate; CSS variables: yes). Confirm `src/lib/utils.ts` exports `cn`.

- [ ] **Step 6: Verify build + a token smoke check, then commit**

```bash
npm run build
git add -A
git commit -m "chore: tailwind v4 + shadcn + Cool Mist tokens"
```

---

## Task 1: Palette + presets helpers

**Files:**
- Create: `src/lib/color-palette.ts`, `src/lib/habit-presets.ts`, `src/lib/habit-presets.test.ts`

- [ ] **Step 1: Write the failing test** — `src/lib/habit-presets.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { presetFor } from "./habit-presets";

describe("presetFor", () => {
  it("duration defaults to a 20-minute target", () => {
    const p = presetFor("duration");
    expect(p.target).toBe(20);
    expect(p.targetUnit).toBe("min");
  });
  it("number defaults to 8 with a unit", () => {
    const p = presetFor("number");
    expect(p.target).toBe(8);
    expect(p.targetUnit).toBeTruthy();
  });
  it("category supplies starter options", () => {
    const p = presetFor("category");
    expect((p.categoryOptions ?? []).length).toBeGreaterThan(0);
  });
  it("boolean has no target", () => {
    expect(presetFor("boolean").target).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/habit-presets.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `src/lib/color-palette.ts`

```ts
export const HABIT_COLORS = [
  "#5B6CF0", // indigo
  "#23B5A8", // teal
  "#0E9F77", // emerald
  "#E8A23D", // amber
  "#E5689B", // rose
  "#8B6CF0", // violet
  "#3BA8E5", // sky
  "#64748B", // slate
] as const;

export const DEFAULT_COLOR = HABIT_COLORS[0];
```

- [ ] **Step 4: Implement** — `src/lib/habit-presets.ts`

```ts
import type { HabitType } from "./types";
import { newId } from "./id";
import { DEFAULT_COLOR } from "./color-palette";

export interface HabitPreset {
  color: string;
  icon?: string;
  target?: number;
  targetUnit?: string;
  categoryOptions?: { id: string; label: string }[];
}

export function presetFor(type: HabitType): HabitPreset {
  switch (type) {
    case "duration":
      return { color: DEFAULT_COLOR, icon: "clock", target: 20, targetUnit: "min" };
    case "number":
      return { color: "#3BA8E5", icon: "hash", target: 8, targetUnit: "glasses" };
    case "time":
      return { color: "#8B6CF0", icon: "moon" };
    case "category":
      return {
        color: "#E8A23D",
        icon: "tag",
        categoryOptions: [
          { id: newId(), label: "Low" },
          { id: newId(), label: "Okay" },
          { id: newId(), label: "Great" },
        ],
      };
    case "boolean":
    default:
      return { color: "#0E9F77", icon: "check" };
  }
}
```

- [ ] **Step 5: Run to verify it passes, then commit**

Run: `npx vitest run src/lib/habit-presets.test.ts`
Expected: PASS.
```bash
git add src/lib/color-palette.ts src/lib/habit-presets.ts src/lib/habit-presets.test.ts
git commit -m "feat(lib): add color palette + per-type form presets"
```

---

## Task 2: ProgressRing + HabitIcon

**Files:**
- Create: `src/components/progress-ring.tsx`, `src/components/habit-icon.tsx`

- [ ] **Step 1: Implement** — `src/components/progress-ring.tsx`

```tsx
interface ProgressRingProps {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
}

export function ProgressRing({
  value,
  size = 44,
  stroke = 5,
  color = "var(--primary)",
  label,
}: ProgressRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  const offset = c * (1 - clamped);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label ?? `${Math.round(clamped * 100)}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      {label ? (
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize={size * 0.28} fontWeight={700} fill="var(--foreground)">
          {label}
        </text>
      ) : null}
    </svg>
  );
}
```

- [ ] **Step 2: Implement** — `src/components/habit-icon.tsx`

```tsx
import type { ComponentType } from "react";
import * as Icons from "lucide-react";
import type { LucideProps } from "lucide-react";

const fallback = Icons.Circle;

function toPascal(name: string): string {
  return name
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

export function HabitIcon({ name, ...props }: { name?: string } & LucideProps) {
  const key = name ? toPascal(name) : "";
  const Cmp = (Icons as unknown as Record<string, ComponentType<LucideProps>>)[key] ?? fallback;
  return <Cmp {...props} />;
}
```

- [ ] **Step 3: Verify build, then commit**

```bash
npm run build
git add src/components/progress-ring.tsx src/components/habit-icon.tsx
git commit -m "feat(ui): add ProgressRing + HabitIcon"
```

---

## Task 3: HabitLogControl (all five types) — TDD

**Files:**
- Create: `src/components/habit-log-control.tsx`, `src/components/habit-log-control.test.tsx`

- [ ] **Step 1: Write the failing tests** — `src/components/habit-log-control.test.tsx`

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Habit } from "@/lib/types";
import { HabitLogControl } from "./habit-log-control";

function habit(p: Partial<Habit>): Habit {
  return {
    id: "h1",
    name: "Test",
    type: "boolean",
    color: "#5B6CF0",
    frequency: "daily",
    createdAt: "2026-06-01T00:00:00Z",
    archivedAt: null,
    ...p,
  };
}

describe("HabitLogControl", () => {
  it("boolean: clicking the toggle completes the habit", async () => {
    const onChange = vi.fn();
    render(<HabitLogControl habit={habit({ type: "boolean" })} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /mark.*done|complete/i }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("number: + increments from the current value", async () => {
    const onChange = vi.fn();
    render(<HabitLogControl habit={habit({ type: "number", target: 8 })} value={5} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /increase/i }));
    expect(onChange).toHaveBeenCalledWith(6);
  });

  it("number: − does not go below 0", async () => {
    const onChange = vi.fn();
    render(<HabitLogControl habit={habit({ type: "number" })} value={0} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /decrease/i }));
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it("duration: a quick-chip logs its minutes", async () => {
    const onChange = vi.fn();
    render(<HabitLogControl habit={habit({ type: "duration", target: 20 })} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "30m" }));
    expect(onChange).toHaveBeenCalledWith(30);
  });

  it("time: changing the input logs HH:mm", async () => {
    const onChange = vi.fn();
    render(<HabitLogControl habit={habit({ type: "time" })} onChange={onChange} />);
    const input = screen.getByLabelText(/time/i);
    await userEvent.clear(input);
    await userEvent.type(input, "23:20");
    expect(onChange).toHaveBeenLastCalledWith("23:20");
  });

  it("category: clicking a chip logs its option id", async () => {
    const onChange = vi.fn();
    const h = habit({ type: "category", categoryOptions: [{ id: "opt-1", label: "Strength" }] });
    render(<HabitLogControl habit={h} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Strength" }));
    expect(onChange).toHaveBeenCalledWith("opt-1");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/habit-log-control.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `src/components/habit-log-control.tsx`

```tsx
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
            done ? "bg-[var(--color-success)] text-white border-transparent" : "border-[var(--input)] text-[var(--color-muted)]",
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
                current === m ? "bg-[var(--primary)] text-white" : "bg-[var(--secondary)] text-[var(--color-muted)]",
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
                value === opt.id ? "bg-[var(--primary)] text-white" : "bg-[var(--secondary)] text-[var(--color-muted)]",
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
      <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-[var(--secondary)] px-2.5 py-1 text-xs font-medium text-[var(--color-muted)]">
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/habit-log-control.test.tsx`
Expected: PASS (all six cases).

- [ ] **Step 5: Commit**

```bash
git add src/components/habit-log-control.tsx src/components/habit-log-control.test.tsx
git commit -m "feat(ui): add HabitLogControl for all five habit types"
```

---

## Task 4: HabitCard

**Files:**
- Create: `src/components/habit-card.tsx`

Reads nothing from the store directly; it's a presentational card wired by the Today route.

- [ ] **Step 1: Implement** — `src/components/habit-card.tsx`

```tsx
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
    <div className={cn("flex items-center gap-3 rounded-2xl border bg-[var(--card)] p-3", done && "border-[var(--color-success-soft)]")}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${habit.color}1a`, color: habit.color }}>
        <HabitIcon name={habit.icon} className="h-5 w-5" />
      </div>
      <Link to={`/habits/${habit.id}`} className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-[var(--foreground)]">{habit.name}</div>
        <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
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
```

- [ ] **Step 2: Verify build, then commit**

```bash
npm run build
git add src/components/habit-card.tsx
git commit -m "feat(ui): add HabitCard"
```

---

## Task 5: TodayHeader + DailyProgressCard + EmptyState

**Files:**
- Create: `src/components/today-header.tsx`, `src/components/daily-progress-card.tsx`, `src/components/empty-state.tsx`

- [ ] **Step 1: Implement** — `src/components/today-header.tsx`

```tsx
import { formatLongDate } from "@/lib/date-utils";

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function TodayHeader({ todayKey }: { todayKey: string }) {
  return (
    <header className="mb-4">
      <div className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{formatLongDate(todayKey)}</div>
      <h1 className="text-xl font-bold text-[var(--foreground)]">{greeting(new Date())}</h1>
      <p className="text-sm text-[var(--color-muted)]">What did you make progress on today?</p>
    </header>
  );
}
```

- [ ] **Step 2: Implement** — `src/components/daily-progress-card.tsx`

```tsx
import { Flame } from "lucide-react";
import { ProgressRing } from "./progress-ring";

interface Props {
  completed: number;
  total: number;
  bestStreak: number;
}

export function DailyProgressCard({ completed, total, bestStreak }: Props) {
  const ratio = total === 0 ? 0 : completed / total;
  const remaining = total - completed;
  return (
    <div className="mb-4 flex items-center gap-4 rounded-2xl border bg-[var(--card)] p-4">
      <ProgressRing value={ratio} size={56} stroke={6} label={`${Math.round(ratio * 100)}%`} />
      <div className="flex-1">
        <div className="text-sm font-semibold text-[var(--foreground)]">
          {completed} of {total} habit{total === 1 ? "" : "s"} done
        </div>
        <div className="text-xs text-[var(--color-muted)]">
          {remaining > 0 ? `Small actions compound. ${remaining} to go.` : "All done today. Nice work."}
        </div>
      </div>
      {bestStreak > 0 ? (
        <div className="rounded-xl bg-[var(--secondary)] px-3 py-2 text-center">
          <div className="flex items-center gap-1 text-base font-bold text-[var(--foreground)]">
            <Flame className="h-4 w-4 text-[#E8A23D]" /> {bestStreak}
          </div>
          <div className="text-[10px] text-[var(--color-muted)]">best streak</div>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Implement** — `src/components/empty-state.tsx`

```tsx
import type { ReactNode } from "react";

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
}

export function EmptyState({ icon, title, description, children }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-[var(--card)] px-6 py-12 text-center">
      {icon ? <div className="mb-3 text-[var(--color-muted)]">{icon}</div> : null}
      <h3 className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-[var(--color-muted)]">{description}</p> : null}
      {children ? <div className="mt-4 flex gap-2">{children}</div> : null}
    </div>
  );
}
```

- [ ] **Step 4: Verify build, then commit**

```bash
npm run build
git add src/components/today-header.tsx src/components/daily-progress-card.tsx src/components/empty-state.tsx
git commit -m "feat(ui): add TodayHeader, DailyProgressCard, EmptyState"
```

---

## Task 6: AppShell + navigation + router

**Files:**
- Create: `src/components/nav-items.ts`, `src/components/sidebar.tsx`, `src/components/mobile-nav.tsx`, `src/components/app-shell.tsx`, `src/routes/calendar.tsx`, `src/routes/insights.tsx`, `src/routes/settings.tsx`, `src/routes/habit-detail.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement** — `src/components/nav-items.ts`

```ts
import { CalendarDays, Home, LineChart, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Today", icon: Home },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/insights", label: "Insights", icon: LineChart },
  { to: "/settings", label: "Settings", icon: Settings },
];
```

- [ ] **Step 2: Implement** — `src/components/sidebar.tsx`

```tsx
import { NavLink } from "react-router-dom";
import { Plus } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";
import { cn } from "@/lib/utils";

export function Sidebar({ onNewHabit }: { onNewHabit: () => void }) {
  return (
    <aside className="hidden w-[200px] shrink-0 flex-col border-r bg-[var(--card)] p-3 md:flex">
      <div className="flex items-center gap-2 px-2 pb-4 pt-1">
        <span className="h-5 w-5 rounded-md bg-[var(--primary)]" />
        <span className="text-sm font-bold">Habit Tracker</span>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm",
                isActive ? "bg-[var(--accent)] font-semibold text-[var(--primary)]" : "text-[var(--color-muted)] hover:bg-[var(--secondary)]",
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <button onClick={onNewHabit} className="mt-auto flex items-center justify-center gap-1.5 rounded-xl bg-[var(--primary)] py-2.5 text-sm font-semibold text-white">
        <Plus className="h-4 w-4" /> New habit
      </button>
    </aside>
  );
}
```

- [ ] **Step 3: Implement** — `src/components/mobile-nav.tsx`

```tsx
import { NavLink } from "react-router-dom";
import { Plus } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";
import { cn } from "@/lib/utils";

export function MobileNav({ onNewHabit }: { onNewHabit: () => void }) {
  const [today, calendar, insights, settings] = NAV_ITEMS;
  const left = [today, calendar];
  const right = [insights, settings];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t bg-[var(--card)] px-2 pb-[env(safe-area-inset-bottom)] pt-2 md:hidden">
      {left.map((item) => <NavTab key={item.to} {...item} />)}
      <button onClick={onNewHabit} aria-label="New habit" className="-mt-1 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-lg">
        <Plus className="h-5 w-5" />
      </button>
      {right.map((item) => <NavTab key={item.to} {...item} />)}
    </nav>
  );
}

function NavTab({ to, label, icon: Icon }: (typeof NAV_ITEMS)[number]) {
  return (
    <NavLink to={to} end={to === "/"} className={({ isActive }) => cn("flex flex-col items-center gap-0.5 text-[10px]", isActive ? "text-[var(--primary)]" : "text-[var(--color-muted)]")}>
      <Icon className="h-5 w-5" />
      {label}
    </NavLink>
  );
}
```

- [ ] **Step 4: Implement** — `src/components/app-shell.tsx`

```tsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { AddHabitDialog } from "./add-habit-dialog";

export function AppShell() {
  const [addOpen, setAddOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <Sidebar onNewHabit={() => setAddOpen(true)} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-24 pt-5 md:pb-8">
        <Outlet context={{ openAddHabit: () => setAddOpen(true) }} />
      </main>
      <MobileNav onNewHabit={() => setAddOpen(true)} />
      <AddHabitDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
```

- [ ] **Step 5: Implement placeholder routes** (replaced in Plan 3)

`src/routes/calendar.tsx`, `src/routes/insights.tsx`, `src/routes/settings.tsx`, `src/routes/habit-detail.tsx` — each:
```tsx
export default function CalendarRoute() {
  return <div className="text-sm text-[var(--color-muted)]">Coming in Plan 3.</div>;
}
```
(name the function per file: `CalendarRoute`, `InsightsRoute`, `SettingsRoute`, `HabitDetailRoute`).

- [ ] **Step 6: Wire the router** — `src/App.tsx`

```tsx
import { HashRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import TodayRoute from "@/routes/today";
import CalendarRoute from "@/routes/calendar";
import InsightsRoute from "@/routes/insights";
import SettingsRoute from "@/routes/settings";
import HabitDetailRoute from "@/routes/habit-detail";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<TodayRoute />} />
          <Route path="/calendar" element={<CalendarRoute />} />
          <Route path="/insights" element={<InsightsRoute />} />
          <Route path="/settings" element={<SettingsRoute />} />
          <Route path="/habits/:id" element={<HabitDetailRoute />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
```

- [ ] **Step 7: Commit** (do NOT run `npm run build` yet)

`App.tsx` imports `today.tsx` (Task 7) and `app-shell.tsx` imports `add-habit-dialog.tsx` (Task 8), so the build can't succeed until those exist. Commit now; build is verified at the Task 8 gate.

```bash
git add src/components/nav-items.ts src/components/sidebar.tsx src/components/mobile-nav.tsx src/components/app-shell.tsx src/routes/calendar.tsx src/routes/insights.tsx src/routes/settings.tsx src/routes/habit-detail.tsx src/App.tsx
git commit -m "feat(ui): add AppShell, sidebar, mobile nav, and router"
```

---

## Task 7: Today route

**Files:**
- Create: `src/routes/today.tsx`

- [ ] **Step 1: Implement** — `src/routes/today.tsx`

```tsx
import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useHabitStore } from "@/store/habit-store";
import { todayKey } from "@/lib/date-utils";
import { currentStreak, isHabitCompleted, isScheduledOn } from "@/lib/habit-utils";
import { TodayHeader } from "@/components/today-header";
import { DailyProgressCard } from "@/components/daily-progress-card";
import { HabitCard } from "@/components/habit-card";
import { EmptyState } from "@/components/empty-state";

export default function TodayRoute() {
  const { openAddHabit } = useOutletContext<{ openAddHabit: () => void }>();
  const habits = useHabitStore((s) => s.habits);
  const entries = useHabitStore((s) => s.entries);
  const addOrUpdateEntry = useHabitStore((s) => s.addOrUpdateEntry);
  const loadSampleData = useHabitStore((s) => s.loadSampleData);

  const today = todayKey();

  const scheduled = useMemo(
    () => habits.filter((h) => !h.archivedAt && isScheduledOn(h, today)),
    [habits, today],
  );

  const entryFor = (habitId: string) =>
    entries.find((e) => e.habitId === habitId && e.date === today);

  const completed = scheduled.filter((h) => isHabitCompleted(h, entryFor(h.id))).length;
  const bestStreak = scheduled.reduce(
    (max, h) => Math.max(max, currentStreak(h, entries.filter((e) => e.habitId === h.id), today)),
    0,
  );

  if (habits.filter((h) => !h.archivedAt).length === 0) {
    return (
      <>
        <TodayHeader todayKey={today} />
        <EmptyState
          icon={<Sparkles className="h-8 w-8" />}
          title="Start your first habit"
          description="Small actions, tracked consistently, create visible momentum."
        >
          <button onClick={openAddHabit} className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white">
            Create a habit
          </button>
          <button onClick={loadSampleData} className="rounded-xl bg-[var(--secondary)] px-4 py-2 text-sm font-medium text-[var(--foreground)]">
            Load sample data
          </button>
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <TodayHeader todayKey={today} />
      <DailyProgressCard completed={completed} total={scheduled.length} bestStreak={bestStreak} />
      <div className="flex flex-col gap-2">
        {scheduled.map((h) => (
          <HabitCard
            key={h.id}
            habit={h}
            entry={entryFor(h.id)}
            streak={currentStreak(h, entries.filter((e) => e.habitId === h.id), today)}
            onLog={(value) => addOrUpdateEntry({ habitId: h.id, date: today, value })}
          />
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit** (build verified at Task 8 gate)

```bash
git add src/routes/today.tsx
git commit -m "feat(today): assemble Today dashboard"
```

---

## Task 8: HabitForm + AddHabitDialog (add & edit)

**Files:**
- Create: `src/components/habit-form.tsx`, `src/components/add-habit-dialog.tsx`

- [ ] **Step 1: Implement** — `src/components/habit-form.tsx`

```tsx
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Habit, HabitType, HabitFrequency } from "@/lib/types";
import type { AddHabitInput } from "@/store/habit-store";
import { presetFor } from "@/lib/habit-presets";
import { HABIT_COLORS } from "@/lib/color-palette";
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
  const [target, setTarget] = useState<string>(initial?.target?.toString() ?? "");
  const [targetUnit, setTargetUnit] = useState(initial?.targetUnit ?? "");
  const [frequency, setFrequency] = useState<HabitFrequency>(initial?.frequency ?? "daily");
  const [activeDays, setActiveDays] = useState<number[]>(initial?.activeDays ?? [1, 2, 3, 4, 5]);
  const [error, setError] = useState("");

  // Apply presets when changing type while creating (not editing).
  useEffect(() => {
    if (initial) return;
    const p = presetFor(type);
    setColor(p.color);
    setTarget(p.target?.toString() ?? "");
    setTargetUnit(p.targetUnit ?? "");
  }, [type, initial]);

  const showTarget = type === "number" || type === "duration";

  function submit() {
    if (!name.trim()) {
      setError("Give your habit a name.");
      return;
    }
    const preset = presetFor(type);
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      color,
      icon: initial?.icon ?? preset.icon,
      target: showTarget && target ? Number(target) : undefined,
      targetUnit: showTarget && targetUnit ? targetUnit : undefined,
      categoryOptions: type === "category" ? initial?.categoryOptions ?? preset.categoryOptions : undefined,
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
            <button key={t} type="button" onClick={() => setType(t)} disabled={!!initial} className={cn("rounded-lg px-2 py-1.5 text-xs font-medium", type === t ? "bg-[var(--primary)] text-white" : "bg-[var(--secondary)] text-[var(--color-muted)]", initial && "opacity-60")}>
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        {initial ? <p className="mt-1 text-[11px] text-[var(--color-muted)]">Type can't change after creation.</p> : null}
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

      <Field label="Color">
        <div className="flex flex-wrap gap-2">
          {HABIT_COLORS.map((c) => (
            <button key={c} type="button" aria-label={`Color ${c}`} onClick={() => setColor(c)} className={cn("h-7 w-7 rounded-full border-2", color === c ? "border-[var(--foreground)]" : "border-transparent")} style={{ backgroundColor: c }} />
          ))}
        </div>
      </Field>

      <Field label="Frequency">
        <div className="flex gap-1.5">
          {(["daily", "custom"] as HabitFrequency[]).map((f) => (
            <button key={f} type="button" onClick={() => setFrequency(f)} className={cn("rounded-lg px-3 py-1.5 text-xs font-medium", frequency === f ? "bg-[var(--primary)] text-white" : "bg-[var(--secondary)] text-[var(--color-muted)]")}>
              {f === "daily" ? "Every day" : "Specific days"}
            </button>
          ))}
        </div>
        {frequency === "custom" ? (
          <div className="mt-2 flex gap-1.5">
            {WEEKDAY_LABELS.map((d, i) => {
              const on = activeDays.includes(i);
              return (
                <button key={i} type="button" aria-label={`Toggle day ${i}`} onClick={() => setActiveDays((prev) => (on ? prev.filter((x) => x !== i) : [...prev, i]))} className={cn("h-8 w-8 rounded-full text-xs font-medium", on ? "bg-[var(--primary)] text-white" : "bg-[var(--secondary)] text-[var(--color-muted)]")}>
                  {d}
                </button>
              );
            })}
          </div>
        ) : null}
      </Field>

      {error ? <p className="text-xs text-[var(--destructive)]">{error}</p> : null}

      <div className="mt-1 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--color-muted)]">Cancel</button>
        <button type="button" onClick={submit} className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white">{initial ? "Save" : "Create habit"}</button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-1 flex-col gap-1">
      <span className="text-xs font-medium text-[var(--color-muted)]">{label}</span>
      {children}
    </label>
  );
}
```

- [ ] **Step 2: Implement** — `src/components/add-habit-dialog.tsx`

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useHabitStore } from "@/store/habit-store";
import type { Habit } from "@/lib/types";
import { HabitForm } from "./habit-form";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: Habit;
}

export function AddHabitDialog({ open, onOpenChange, editing }: Props) {
  const addHabit = useHabitStore((s) => s.addHabit);
  const updateHabit = useHabitStore((s) => s.updateHabit);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit habit" : "New habit"}</DialogTitle>
        </DialogHeader>
        <HabitForm
          initial={editing}
          onCancel={() => onOpenChange(false)}
          onSubmit={(value) => {
            if (editing) updateHabit(editing.id, value);
            else addHabit(value);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Build + run the full suite (Plan 2 gate)**

```bash
npm run build
npm test
npx tsc --noEmit
npm run lint
```
Expected: build succeeds; all tests pass; no type/lint errors.

- [ ] **Step 4: Manual smoke check**

```bash
npm run dev
```
Open the printed URL. Verify: Today shows seeded habits; logging works for each type (toggle, stepper, duration chips, time, category chips); progress ring updates; "New habit" opens the dialog and creating a habit adds a card; refresh persists everything.

- [ ] **Step 5: Commit**

```bash
git add src/components/habit-form.tsx src/components/add-habit-dialog.tsx
git commit -m "feat(habits): add HabitForm + Add/Edit dialog; Plan 2 complete"
```

---

## Self-review notes (coverage vs. spec)

- §3 stack (Tailwind/shadcn/Lucide/HashRouter) → Task 0, Task 6. §15 palette tokens → Task 0. §9 Today dashboard (header, progress card, habit list, empty state, add button) → Tasks 5–7. §11 all five log controls → Task 3 (TDD). §2 Add/Edit dialog with presets + active days → Tasks 1, 8. §1 dependency rule respected (components call store + pure utils; no logic in UI).
- Deferred to Plan 3: Calendar, Habit Detail, Insights page, Settings, charts/heatmap, and final responsive/a11y polish.
```
