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
