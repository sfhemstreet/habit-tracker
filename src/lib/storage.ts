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
  if (typeof raw !== "object" || raw === null) return null;
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
      return { ...common, type: "duration", unit: undefined, ...sched }; // duration has no unit field in v2
    case "time":
      return null; // no clean mapping
    case "category": {
      const opts = (Array.isArray(raw.categoryOptions) ? raw.categoryOptions : []).filter(
        (o): o is Record<string, unknown> => typeof o === "object" && o !== null,
      );
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
    if (typeof e !== "object" || e === null) continue;
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
