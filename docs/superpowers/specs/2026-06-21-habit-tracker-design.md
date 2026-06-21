# Habit Tracker — Design Doc

- **Status:** Approved (brainstorming complete) — ready for implementation planning
- **Date:** 2026-06-21
- **Owner:** sfhemstreet
- **Location:** `~/Documents/habit-tracker`

---

## 1. Overview & philosophy

Habit Tracker is a lightweight but data-rich habit tracker for people who want to
build consistent routines without overcomplicating their lives. The core idea:
**small actions, tracked consistently, create visible momentum.**

It is simple on the surface (log today in a few taps) and analytically useful
underneath (streaks, consistency rates, trends, deterministic weekly insights).
Original product — no copying of any existing app's branding, name, assets, copy,
or code.

This is a **local-first MVP**: a single local user, no authentication, no backend.
All data lives in `localStorage`, behind an abstraction that lets us later swap in
Supabase/Postgres (web) or a file/SQLite store (Electron desktop) without touching
business logic or UI.

## 2. Goals & non-goals

**In scope (MVP):**
- Create / edit / archive / delete habits of five types (boolean, number,
  duration, time, category).
- Log daily progress with minimal friction, per-type quick controls.
- Streaks, consistency rates, totals, missed days.
- Today dashboard, Calendar (edit past days), Habit detail (charts + heatmap),
  Insights / Weekly Review, Settings (export/import/clear).
- Local persistence; responsive (mobile + desktop); accessible, polished UI.

**Out of scope (designed so they can be added later):**
- Accounts, subscriptions, push notifications, native mobile, Apple Health,
  social sharing, AI recommendations, backend database.
- `"weekly"` ("X times per week") frequency — see Decision A.

## 3. Tech stack & key decisions

| Area | Choice | Notes |
|------|--------|-------|
| Framework | **React + TypeScript** | strict mode |
| Build | **Vite** | SPA; `base: './'` for `file://`/Electron portability |
| Routing | **React Router (`HashRouter`)** | works under `file://` (Electron) and static hosting with no SPA-fallback config |
| Styling | **Tailwind CSS** | design tokens via CSS variables |
| Components | **shadcn/ui** | Dialog, Sheet, Button, Input, Select, etc. |
| Icons | **Lucide** | `icon` field stores a Lucide name string |
| Charts | **Recharts** | per-type trend charts |
| State | **Zustand** (v5) | with `persist` middleware |
| Storage | **localStorage** | behind `lib/storage.ts` swap point |
| Tests | **Vitest + React Testing Library + jsdom** | TDD on pure core |
| Theme | **Light only** | dark deferred; tokens structured to allow it later |

**Decisions locked during brainstorming:**
- **A — Frequency scope:** ship `"daily"` and `"custom"` (specific weekdays via
  `activeDays`). `"weekly"` is dropped from the MVP because it makes streak math
  ambiguous; the model keeps room to add it later.
- **B — Streak grace rule:** a today that is not yet logged is **"pending," not a
  miss** — streaks do not visually break mid-day. Only a *past* scheduled,
  incomplete day breaks a streak.
- **C — Seed data:** on first ever load, seed exactly **5 example habits (one per
  type) with no historical entries**, so a new user starts by editing or deleting
  real examples. After `clearData`, the app stays empty; a "Load sample data"
  action in the empty state can re-add the 5.
- **D — Add/Edit habit** is a responsive **Dialog (desktop) / Sheet (mobile)**,
  not a separate full-page route.
- **Visual direction:** "Cool Mist" — soft blue-gray base, indigo accent (see §15).
- **Electron-readiness:** `HashRouter` + relative `base` baked in now; persistence
  swap point already abstracted. No further changes needed to ship as an Electron
  app later.

## 4. Architecture & folder structure

**Dependency rule:** everything in `lib/` is **pure** and never imports the store.
The store composes pure utils and owns persistence. Components read the store and
call utils. This keeps every calculation unit-testable in isolation.

```
src/
  main.tsx, App.tsx            # router + AppShell mount
  routes/
    today.tsx                  # "/"
    calendar.tsx               # "/calendar"
    insights.tsx               # "/insights"
    settings.tsx               # "/settings"
    habit-detail.tsx           # "/habits/:id"
  components/
    app-shell.tsx, sidebar.tsx, mobile-nav.tsx
    today-header.tsx, daily-progress-card.tsx
    habit-card.tsx, habit-log-control.tsx
    habit-form.tsx, add-habit-dialog.tsx
    calendar-month.tsx, calendar-day-cell.tsx, day-editor.tsx
    habit-heatmap.tsx, stats-card.tsx, trend-chart.tsx
    weekly-review.tsx, empty-state.tsx, confirm-dialog.tsx
    progress-ring.tsx
    ui/                        # shadcn primitives
  lib/
    types.ts                   # domain types
    date-utils.ts              # local-day strings, ranges, week math   (pure)
    habit-utils.ts             # completion, streaks, stats, formatting (pure)
    insights.ts                # deterministic rule engine              (pure)
    seed-data.ts               # 5 sample habits (no entries)
    storage.ts                 # the swap point (load/save/export/import/clear)
    cn.ts                      # className helper
  store/
    habit-store.ts             # Zustand store (state + actions)
  test/
    setup.ts
```

## 5. Data model

```ts
type HabitType = "boolean" | "number" | "duration" | "time" | "category";
type HabitFrequency = "daily" | "custom";   // "weekly" reserved for later

interface CategoryOption {
  id: string;          // stable id stored as the entry value
  label: string;       // e.g. "Sharp"
  color?: string;
}

interface Habit {
  id: string;
  name: string;
  description?: string;
  type: HabitType;
  color: string;                  // from app palette (§15)
  icon?: string;                  // Lucide icon name
  target?: number;                // number/duration
  targetUnit?: string;            // "glasses", "min", ...
  categoryOptions?: CategoryOption[];  // category type only
  frequency: HabitFrequency;
  activeDays?: number[];          // 0=Sun..6=Sat, used when frequency="custom"
  createdAt: string;              // ISO timestamp
  archivedAt?: string | null;
}

interface HabitEntry {
  id: string;
  habitId: string;
  date: string;                   // "YYYY-MM-DD" LOCAL day key
  value: boolean | number | string;  // bool | count/minutes | "HH:mm" | categoryOptionId
  note?: string;
  createdAt: string;              // ISO timestamp
  updatedAt: string;              // ISO timestamp
}

interface HabitStats {
  currentStreak: number;
  longestStreak: number;
  completionRate7Days: number;    // 0..1
  completionRate30Days: number;   // 0..1
  totalCompletions: number;
  missedDays: number;
}

interface AppSettings {
  weekStartsOn: 0 | 1;            // default 1 (Mon); easy to change
}

interface PersistedData {
  schemaVersion: number;          // currently 1
  habits: Habit[];
  entries: HabitEntry[];
  settings: AppSettings;
  initializedAt: string | null;   // set once seeding has run / been skipped
}
```

Value encoding by type:
- **boolean** → `true`/`false`
- **number** → count (e.g. glasses)
- **duration** → minutes
- **time** → `"HH:mm"` 24h string (displayed per locale, e.g. "11:20 PM")
- **category** → the chosen `CategoryOption.id`

## 6. Storage, persistence & migration

- Zustand store is wrapped with the **`persist` middleware** using
  `createJSONStorage`, a namespaced key (`habit-tracker.v1`), and a `version` +
  `migrate` hook so future schema changes don't corrupt existing data.
- `lib/storage.ts` is the **single swap point** and exposes a small surface:
  - `loadData(): PersistedData`
  - `saveData(data: PersistedData): void`
  - `exportData(): string` — pretty JSON
  - `importData(json: string): PersistedData` — parsed + **validated**; throws a
    friendly error on malformed/incompatible input
  - `clearData(): void` — wipes habits/entries, keeps `initializedAt` set so the
    app stays empty (no re-seed)
- **Migration path:** swapping to Supabase (web) or file/SQLite (Electron) means
  reimplementing this module's body and making the affected store actions async.
  `lib/` pure functions and all components remain unchanged.

## 7. State management — store API

```ts
// state
habits: Habit[]
entries: HabitEntry[]
settings: AppSettings

// actions
addHabit(input): Habit
updateHabit(id, patch): void
archiveHabit(id): void            // sets archivedAt; keeps history
deleteHabit(id): void             // removes habit + its entries
addOrUpdateEntry(input): HabitEntry   // keyed on (habitId, date) — upsert, never duplicate
deleteEntry(habitId, date): void
getEntriesForDate(date): HabitEntry[]
getEntriesForHabit(habitId): HabitEntry[]
exportData(): string
importData(json): void            // replaces store after validation
clearData(): void
loadSampleData(): void            // re-add the 5 seed habits on demand
```

`addOrUpdateEntry` upserts on `(habitId, date)` so re-logging a day overwrites the
existing entry rather than creating duplicates.

## 8. Date, completion & streak semantics (TDD core)

**Dates** — all day keys are **local** `YYYY-MM-DD`; no UTC conversion, so no
midnight off-by-one. `date-utils.ts` provides `today()`, `toDayKey(date)`,
`addDays()`, `eachDayInRange(from,to)`, `startOfWeek(date, weekStartsOn)`,
`isFuture(dayKey)`, `weekdayOf(dayKey)`.

**Scheduled day** — a day is "scheduled" for a habit if:
- `frequency === "daily"`, or
- `frequency === "custom"` and `activeDays.includes(weekdayOf(day))`.
Days before `createdAt` and future days are never scheduled/counted.

**Completion** (per habit type):
- boolean: `value === true`
- number / duration: `value > 0`, or `value >= target` when a `target` exists
- time: any value present
- category: any value present

**Current streak** — walk backwards over scheduled days:
- Start at the most recent scheduled day ≤ today.
- If that day is **today and not completed**, treat it as *pending* (Decision B):
  skip it and start counting from the previous scheduled day.
- Count consecutive completed scheduled days; stop at the first past scheduled day
  that is incomplete (a miss).

**Longest streak** — scan all scheduled days from the habit's first activity
(min of `createdAt` day and earliest entry) through today; return the longest run
of consecutive completed scheduled days.

**Completion rate (7 / 30 days)** — `completed scheduled days / total scheduled
days` within the trailing window (excluding future). If no scheduled days in the
window, rate is `0` and the UI shows "—".

**Total completions** — count of completed entries.
**Missed days** — scheduled, past (non-pending) days with no completion.

## 9. Pages & navigation

Routes (HashRouter): `/` Today · `/calendar` · `/insights` · `/settings` ·
`/habits/:id` Detail. Desktop = persistent left **Sidebar**; mobile = bottom
**MobileNav** with a centered **+** for new habit. No dead ends — every nav target
renders real content or a real empty state.

- **Today (`/`):** `TodayHeader` (greeting + date + microcopy), `DailyProgressCard`
  (completion ring, "N of M done", best-streak chip), list of `HabitCard`s with
  inline `HabitLogControl`, "New habit" button. Empty state: "Create your first
  habit" + "Load sample data".
- **Add/Edit (Dialog/Sheet):** `HabitForm` — type-aware fields, sensible presets
  (Read=duration/20m, Drink water=number/8 glasses, Meditate=boolean, Sleep=time,
  Workout=category), live card preview, keyboard-friendly, validated.
- **Calendar (`/calendar`):** `CalendarMonth` + prev/next month nav;
  `CalendarDayCell` tinted by that day's completion ratio (heatmap); click a day →
  `DayEditor` to add/edit entries for all scheduled habits on that date. Future
  days disabled.
- **Habit Detail (`/habits/:id`):** name + description, edit/archive, four
  `StatsCard`s (current streak, longest streak, 7-day, 30-day, total),
  `HabitHeatmap`, type-appropriate `TrendChart`, recent-entries list.
- **Insights (`/insights`):** `WeeklyReview` — overall consistency, best habit,
  most-friction habit, missed days, active streaks, suggestion cards (§13).
- **Settings (`/settings`):** export JSON, import JSON (validated, friendly
  errors), clear all (ConfirmDialog), About/philosophy.

## 10. Components

`AppShell`, `Sidebar`, `MobileNav`, `TodayHeader`, `DailyProgressCard`,
`HabitCard`, `HabitLogControl`, `AddHabitDialog`, `HabitForm`, `CalendarMonth`,
`CalendarDayCell`, `DayEditor`, `HabitHeatmap`, `StatsCard`, `TrendChart`,
`WeeklyReview`, `EmptyState`, `ConfirmDialog`, `ProgressRing`, plus shadcn `ui/`
primitives. Each component has one clear purpose and a well-defined prop interface.

## 11. Habit logging controls (`HabitLogControl`)

Type-driven dispatch:
- **boolean** — complete/not-complete circular toggle (✓), completed card gets a
  subtle green tint.
- **number** — − / value / + stepper, plus optional direct input; shows
  "x of target unit".
- **duration** — quick buttons (5m, 10m, 30m, 60m) + custom input; shows progress
  toward target.
- **time** — time picker; shows logged time formatted per locale.
- **category** — selectable chips from `categoryOptions`; selected chip uses accent.

## 12. Charts (Recharts)

- **boolean** → completion-rate bar over time (weekly buckets)
- **number / duration** → line/bar of values with a dashed target reference line
- **time** → line of logged time-of-day
- **category** → distribution bar across categories

Every chart is wrapped so a habit with no entries renders an empty state, never a
crash.

## 13. Insights / Weekly Review rules (deterministic, no AI)

Computed in `lib/insights.ts` from the trailing week / windows:
- **Celebrate:** a current streak that is a positive multiple of 7.
- **Lower the target:** habit has a `target` **and** > 3 misses in the last 7
  scheduled days → "This habit may be too heavy. Try lowering the target."
- **Stack the habit:** 14-day completion rate between ~30% and ~70%
  (inconsistent) → "Try attaching this to an existing routine."
- **Simplify:** > 8 habits scheduled today → "Your day looks heavy. Consider
  simplifying."
- **Best habit** = highest 7-day completion rate; **most friction** = lowest
  (among scheduled habits). Overall weekly consistency = completed scheduled
  slots / total scheduled slots this week.

## 14. Seed data (`lib/seed-data.ts`)

On first ever load (`initializedAt === null`), seed **5 example habits, one per
type, with zero entries**:
- Read — duration, target 20 min
- Drink water — number, target 8 glasses
- Meditate — boolean
- Sleep time — time
- Workout — category (e.g. Strength / Cardio / Mobility / Rest)

Then set `initializedAt`. After `clearData`, the app stays empty; the empty state
offers "Load sample data" to re-add the 5. Seed data is never force-restored.

## 15. Visual design — "Cool Mist" palette

CSS variables (light theme):
```
--bg:            #F4F6FA   /* app background */
--surface:       #FFFFFF   /* cards */
--text:          #1E2230
--muted:         #7A8194
--border:        #EEF1F6
--accent:        #5B6CF0   /* indigo */
--accent-soft:   #E7EAFD
--success:       #0E9F77   /* completed */
--success-soft:  #E2F3EC
```
Habit color palette (per-habit picker): indigo `#5B6CF0`, teal `#23B5A8`, emerald
`#0E9F77`, amber `#E8A23D`, rose `#E5689B`, violet `#8B6CF0`, sky `#3BA8E5`, slate
`#64748B`.

Style: rounded corners (cards ~`16px`, controls ~`9–12px`), subtle shadows, ample
whitespace, restrained color. Calm, modern, slightly premium — analytics-dashboard
feel. Lucide line icons (emoji used only in mockups). Progress rings for daily +
habit progress; calendar heatmap tints for consistency.

## 16. Accessibility & UX details

Smooth loading/empty states; friendly success interactions; clear import/export
errors; confirm-before-clear; responsive layouts; accessible buttons/labels;
keyboard-friendly forms; realistic microcopy ("What did you make progress on
today?", "Small actions compound.", "Your week at a glance."). No broken links, no
placeholder pages.

## 17. Testing strategy (TDD)

**Vitest + React Testing Library + jsdom.** Test-first, focused on the pure core
where correctness lives:
- `date-utils` — day keys, ranges, week math, future detection
- `habit-utils` — completion per type, current/longest streak (incl. grace rule),
  7/30-day rates, totals, missed days, value formatting
- `insights` — each rule fires/abstains on crafted fixtures
- `store` — add/update/archive/delete, upsert entry, export→import round-trip,
  clear-keeps-empty, seed-on-first-load
- Lighter component tests for each `HabitLogControl` type and import-error / empty
  states.

Gate: **TS strict clean + ESLint clean + all tests green** before the review pass.

## 18. Quality gate / acceptance checklist

- **All tests pass** — the full Vitest suite is green; TS strict + ESLint clean.
- App runs with no TypeScript errors; no missing imports.
- Navigation works across all routes (desktop sidebar + mobile bottom nav).
- Habit creation + editing works; logging works for **every** type.
- Data persists across refresh; export → import round-trips.
- Calendar editing of past days works; future days disabled.
- Streaks/rates calculate correctly (covered by tests).
- Charts render without crashing, including empty habits.
- Empty states render correctly; clear-all confirmed and effective.
- Layout verified on mobile and desktop widths.

## 19. Future work

Dark theme; `"weekly"` frequency; reminders/notifications; accounts + Supabase
sync; Electron desktop packaging (already structurally ready); richer insights;
drag-to-reorder habits; per-habit goal scheduling.
```
