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
    schemaVersion: 2,
    habits: [
      {
        id: "h1",
        name: "Read",
        type: "duration",
        color: "#5B6CF0",
        intendedRhythm: "daily",
        streakType: "daily",
        createdAt: "2026-06-01T08:00:00.000Z",
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
    expect(data.schemaVersion).toBe(2);
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
    expect((d.habits[0] as unknown as Record<string, unknown>).targetUnit).toBeUndefined();
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

  it("custom frequency with no activeDays falls back to 1×/week", () => {
    const d = parseImport(v1([{ id: "a", name: "Gym", type: "boolean", color: "#000",
      frequency: "custom", activeDays: [],
      createdAt: "2026-06-01T08:00:00.000Z", archivedAt: null }]));
    expect(d.habits[0].intendedCountPerWeek).toBe(1);
  });

  it("drops a null habit element without throwing", () => {
    const d = parseImport(v1([null, { id: "a", name: "OK", type: "boolean", color: "#000",
      frequency: "daily", createdAt: "2026-06-01T08:00:00.000Z", archivedAt: null }] as unknown[]));
    expect(d.habits).toHaveLength(1);
    expect(d.habits[0].name).toBe("OK");
  });

  it("drops a category habit whose options aren't all objects, without throwing", () => {
    const d = parseImport(v1([{ id: "c", name: "Mood", type: "category", color: "#000", frequency: "daily",
      categoryOptions: [null, 5, "Low"], createdAt: "2026-06-01T08:00:00.000Z", archivedAt: null }]));
    expect(d.habits).toHaveLength(0);
  });

  it("skips a null entry element without throwing", () => {
    const d = parseImport(v1(
      [{ id: "a", name: "OK", type: "boolean", color: "#000", frequency: "daily",
        createdAt: "2026-06-01T08:00:00.000Z", archivedAt: null }],
      [null, { id: "e1", habitId: "a", date: "2026-06-02", value: true, createdAt: "x", updatedAt: "x" }] as unknown[],
    ));
    expect(d.entries).toHaveLength(1);
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
