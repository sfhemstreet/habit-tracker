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
