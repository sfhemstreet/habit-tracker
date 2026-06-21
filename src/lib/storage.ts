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
