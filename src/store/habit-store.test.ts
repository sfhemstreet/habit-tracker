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
      type: "yes_no",
      color: "#0E9F77",
      intendedRhythm: "daily",
      streakType: "daily",
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

  it("addHabit persists rhythm + streak fields", () => {
    const store = createHabitStore();
    const h = store.getState().addHabit({
      name: "Meditate", type: "yes_no", color: "#000",
      intendedRhythm: "daily", streakType: "daily",
    });
    expect(h.intendedRhythm).toBe("daily");
    expect(h.streakType).toBe("daily");
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
    store.getState().addHabit({ name: "X", type: "yes_no", color: "#000", intendedRhythm: "daily", streakType: "daily" });
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
