import { describe, it, expect } from "vitest";
import { createSeedHabits } from "./seed-data";

describe("createSeedHabits v2", () => {
  const habits = createSeedHabits(new Date("2026-06-22T08:00:00.000Z"));
  it("creates 5 habits with no entries baked in", () => {
    expect(habits).toHaveLength(5);
  });
  it("only uses the 4 new types", () => {
    const types = new Set(habits.map((h) => h.type));
    for (const t of types) expect(["yes_no", "number", "duration", "rating"]).toContain(t);
  });
  it("includes a weekly-streak demo", () => {
    expect(habits.some((h) => h.streakType === "weekly")).toBe(true);
  });
  it("every habit has rhythm + streakType set", () => {
    for (const h of habits) {
      expect(h.intendedRhythm).toBeTruthy();
      expect(h.streakType).toBeTruthy();
    }
  });
});
