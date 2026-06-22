# Habit Tracker v2 — Type Model + Rhythm-Aware Streaks

**Date:** 2026-06-22
**Branch:** `habit-model-v2`
**Status:** Approved design, ready for implementation plan.

## Summary

Two related changes that rewrite the `Habit` shape, shipped together as one branch:

1. **Simplify habit types** to four user-facing kinds — **Yes/No**, **Number**, **Duration**, **Rating** — removing the old **Time** type and renaming **Category** → **Rating** (a fixed Low/Okay/Great scale).
2. **Rhythm-aware streaks** — a habit declares an *intended rhythm* and a *streak type* (Daily / Weekly / None) so streaks reflect the habit's cadence instead of assuming everything is daily. A blank day is not automatically a failure.

They ship together because both rewrite the same `Habit` interface; splitting them would leave an unbuildable intermediate state.

## Resolved conflicts (decisions)

The two source specs disagreed in two places; the user chose:

- **Rhythm model:** Adopt the rhythm/count model fully. **Drop per-weekday scheduling** (`activeDays`/`frequency`). A habit's cadence is Daily, Weekly, "A few times per week" (a count, any days), or Whenever. The "pick specific weekdays" feature is removed.
- **Existing saved data:** **Best-effort migrate** (schema 1→2). Preserve what maps cleanly; drop what cannot.

Additional sub-decisions made during design (all user-approved):

- Rename internal type key `boolean` → `yes_no` and field `targetUnit` → `unit` to match the spec's TypeScript exactly. Migration handles old data.
- The source spec listed both `multiple_per_week` and `custom_per_week`; they behave identically (count-based). **Collapsed into one** rhythm `multiple_per_week`, surfaced as "A few times per week" + a count.
- `intendedRhythm` and `streakType` are **required** fields (not optional), so downstream code never has to guess a default.
- `CategoryOption`, `activeDays`, and `frequency` are deleted from the model.
- Number/Duration logging switches from the stepper/chips to **typed numeric inputs** (per the QA checklist).
- Seed adds one weekly demo habit ("Lower Body", 2×/week) on top of the spec's four, so the weekly-streak UI is visible out of the box.

## Data model (`src/lib/types.ts`)

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
  icon?: string;
  target?: number;               // number: count · duration: minutes
  unit?: string;                 // number only (required at form level); duration is always "minutes"
  intendedRhythm: IntendedRhythm;
  intendedCountPerWeek?: number; // used when intendedRhythm === "multiple_per_week"
  streakType: StreakType;
  createdAt: string;             // ISO timestamp
  archivedAt?: string | null;
}

export type HabitEntryValue = boolean | number | RatingValue;

export interface HabitEntry {
  id: string;
  habitId: string;
  date: string;     // "YYYY-MM-DD" local day key
  value: HabitEntryValue; // rating stored as the literal "low" | "okay" | "great"
  note?: string;
  createdAt: string;
  updatedAt: string;
}
```

`CategoryOption` is removed. `HabitStats` is revised (see Streaks). `AppSettings` and `PersistedData` are unchanged except `PersistedData.schemaVersion` becomes 2.

## Completion logic (`src/lib/habit-utils.ts`)

```text
yes_no:    completed = value === true
number:    completed = target != null ? value >= target : value > 0
duration:  completed = target != null ? value >= target : value > 0
rating:    completed = value === "low" || value === "okay" || value === "great"
```

A rating is a **check-in**: any logged value counts as completed. A "low" rating is never a failure.

With `activeDays` removed, `isScheduledOn` is deleted — every day is eligible. `completionRate`, `longestStreak`, and `missedDays` simplify accordingly (no per-day scheduling filter).

## Streaks (`src/lib/habit-utils.ts`)

Primary API is a discriminated status so the UI renders the right unit:

```ts
export type StreakStatus =
  | { type: "daily";  count: number; todayLogged: boolean }
  | { type: "weekly"; count: number; thisWeek: number; required: number; met: boolean }
  | { type: "none" };

export function streakStatus(
  habit: Habit,
  entries: HabitEntry[],
  todayK: string,
  settings: AppSettings,
): StreakStatus;
```

### Daily streak (`streakType: "daily"`)
- Consecutive **completed** days ending today.
- Grace rule: if today is not yet logged, the streak counts through yesterday and the UI shows "Today not logged yet" (`todayLogged: false`). Only a full elapsed day with no completion breaks it.

### Weekly streak (`streakType: "weekly"`)
- Group completed entries into calendar weeks (week start from `settings.weekStartsOn`).
- `required = intendedCountPerWeek ?? 1` (weekly rhythm → 1; multiple_per_week → the count).
- A past week succeeds when its completed-entry count ≥ `required`.
- Streak = consecutive successful weeks ending at the current week. The **current week counts only once it has met `required`**; while in progress it neither adds to nor breaks the streak. A finished week below `required` resets the streak.
- `thisWeek` = completed entries in the current week; `met = thisWeek >= required`.

### No streak (`streakType: "none"`)
- No streak shown. Dashboard shows tracking stats instead: this-week entry count and (for rating) most-common value.

### Defaults (set at create time, overridable)
| Intended rhythm | Default streak type |
|---|---|
| Daily | Daily |
| Weekly | Weekly |
| A few times per week | Weekly |
| Whenever | None |

Rating habits default to **None** regardless of rhythm, unless the user manually enables a streak.

### Revised `HabitStats`
`computeStats` returns the `StreakStatus` plus the still-meaningful aggregates (`longestStreak` as consecutive completed days for daily / consecutive successful weeks for weekly; `completionRate7/30` for daily and weekly habits; rating/none habits surface a distribution instead of a rate). `missedDays` excludes pending today.

## Add/Edit form (`src/components/habit-form.tsx`)

**Type** — four buttons: Yes/No, Number, Duration, Rating.

**Per-type fields:**
- Number → optional Target + **required** Unit (placeholders: "pushups", "glasses", "miles", "pages").
- Duration → optional **"Target minutes"**; no unit input (unit is always "minutes").
- Yes/No → no target, no unit.
- Rating → no target, no unit; helper text: "Use this for subjective check-ins like energy, mood, focus, or sleep quality."

**Tracking rhythm** section — Daily / Weekly / A few times per week / Whenever. When "A few times per week", show "How many times per week?" count input.

**Streaks** section — Daily streak / Weekly streak / No streak, with the recommended default pre-selected from rhythm+type, fully overridable. Helper copy per option.

Removed: the Frequency (every day / specific days) toggle, the weekday picker, and the Categories editor. Color and icon pickers are retained.

## Logging controls (`src/components/habit-log-control.tsx`)

- **Yes/No** — Done / Not Done toggle (stores `true`; `false` or no entry = not done).
- **Number** — typed numeric input + the unit label, e.g. `[ 15 ] pushups`.
- **Duration** — typed numeric input + fixed `minutes`, e.g. `[ 20 ] minutes`.
- **Rating** — `[ Low ] [ Okay ] [ Great ]`, stores `"low" | "okay" | "great"`.

Time and category controls are removed.

## Display (`src/components/habit-card.tsx`)

- Entry text: Yes/No → "Done"; Number → "{value} {unit}"; Duration → "{value} minutes"; Rating → "Low" / "Okay" / "Great".
- Streak area: daily → "{n} days" (+ "Today not logged yet" when pending); weekly → "{n} weeks" + "{thisWeek} of {required} this week"; none → "This week: {n} entries".
- Mobile-first: keep wide controls on their own row beneath the name (re-evaluate which controls are "wide" now that number/duration are compact inputs and rating is three buttons).

## Charts (`src/lib/chart-data.ts`)

- Yes/No → completion over time (0/1).
- Number → numeric values over time.
- Duration → minutes over time.
- Rating → **distribution of Low / Okay / Great** (replaces the category-by-id distribution). `buildRatingDistribution(habit, entries)` counts the three literal values.

Time handling is removed.

## Insights (`src/lib/insights.ts`)

Deterministic, neutral, tracking-first language:

- Yes/No, Number, Duration → evaluate completion against target when available.
- Rating → never treat low as a failure; summarize the distribution, e.g. "Energy was mostly Great this week", "Focus was mixed this week", "Stress was logged as Low on 4 days".
- Daily-streak habits → "Meditate is on a 12-day streak."
- Weekly-streak habits → "Lower Body has hit its 2×/week rhythm for 4 weeks in a row"; in-progress → "Lower Body is at 1 of 2 sessions this week."
- Avoid punitive phrasing. Say "No Lower Body entry today", never "You missed Lower Body today".

## Migration (`src/lib/storage.ts`, schema 1 → 2)

Bump `SCHEMA_VERSION` to 2; `snapshot()` and exports write version 2. `migrate()` becomes version-aware and idempotent, and runs for both `loadData` and `parseImport` (so old exports import correctly).

Per habit (when `schemaVersion < 2`):
- `type: "boolean"` → `"yes_no"`.
- `type: "time"` → **drop the habit and its entries** (no clean mapping).
- `type: "category"`:
  - If `categoryOptions` labels (trimmed, case-insensitive) are exactly {low, okay, great} → convert to `"rating"`; remap each entry's value from the option `id` to the literal `"low"|"okay"|"great"`; keep entries.
  - Otherwise → **drop the habit and its entries**.
- Field rename `targetUnit` → `unit`; drop `categoryOptions`.
- Scheduling → rhythm:
  - `frequency: "daily"` → `intendedRhythm: "daily"`, `streakType: "daily"`.
  - `frequency: "custom"` (had `activeDays`) → `intendedRhythm: "multiple_per_week"`, `intendedCountPerWeek = clamp(activeDays.length, 1, 7)`, `streakType: "weekly"`.
  - Any converted **rating** habit → `streakType: "none"`.

## Seed data (`src/lib/seed-data.ts`)

- **Meditate** — yes_no, daily, daily streak.
- **Pushups** — number, unit "pushups", target 15, daily, daily streak.
- **Read** — duration, target 20 (minutes), daily, daily streak.
- **Energy** — rating, whenever, none.
- **Lower Body** — duration, multiple_per_week (count 2), weekly streak (demo so the weekly UI is visible out of the box).

Five example habits, no historical entries.

## Store (`src/store/habit-store.ts`)

- `AddHabitInput` drops `frequency`/`activeDays`/`categoryOptions`; adds `intendedRhythm`, `intendedCountPerWeek`, `streakType`, and renames `targetUnit`→`unit`.
- `addHabit` builds the new `Habit` shape.
- `snapshot()` writes `schemaVersion: 2`.

## Testing (TDD)

Extend the existing suite:
- `habit-utils.test.ts` — completion per 4 types; daily / weekly / none `streakStatus`; weekly edge cases (in-progress current week, reset after a missed completed week); revised stats.
- `storage.test.ts` — migration cases: boolean→yes_no, time dropped, category(low/okay/great)→rating with value remap, category(other)→dropped, frequency→rhythm, idempotent on v2, import of an old export.
- `insights.test.ts` — rating distribution summaries, weekly-streak phrasing, neutral language.
- `chart-data.test.ts` — rating distribution; number/duration/yes_no series.
- `habit-log-control.test.tsx` — four controls, value shapes.
- `habit-presets.test.ts`, `seed-data.test.ts`, `habit-store.test.ts` — updated to the new model.

## QA checklist (from the source specs)

- Time and Category no longer appear anywhere; Rating appears instead of Category.
- Duration uses typed input + fixed "minutes"; Number uses typed input + custom unit; Yes/No toggle works; Rating uses only Low/Okay/Great and any selection counts as logged.
- Daily habits get day streaks; 2×/week habits get week streaks; weekly streaks count successful weeks, not consecutive days; the current week isn't marked failed before it ends; blank days don't break weekly streaks; "Whenever" and Rating default to no streak.
- Streaks calculate correctly for all four types; charts don't crash for any type; import/export works with the updated model.
- Dashboard clearly distinguishes daily vs weekly streaks; weekly insights use neutral, tracking-first language.
- Tests pass; build and lint are clean.

## Out of scope

- No Supabase/sync changes (storage stays the localStorage swap point).
- No new routes; existing routes (Today, Calendar, Habit Detail, Insights, Settings) adapt to the new model.
- No reintroduction of per-weekday scheduling.
