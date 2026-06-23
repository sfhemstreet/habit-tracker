import { describe, it, expect } from "vitest";
import { presetFor } from "./habit-presets";

describe("presetFor v2", () => {
  it("yes_no → daily rhythm + daily streak", () => {
    const p = presetFor("yes_no");
    expect(p.intendedRhythm).toBe("daily");
    expect(p.streakType).toBe("daily");
  });
  it("number → has a unit and a target", () => {
    const p = presetFor("number");
    expect(p.unit).toBeTruthy();
    expect(typeof p.target).toBe("number");
  });
  it("duration → target in minutes, no unit", () => {
    const p = presetFor("duration");
    expect(p.unit).toBeUndefined();
    expect(p.target).toBe(20);
  });
  it("rating → whenever rhythm + no streak", () => {
    const p = presetFor("rating");
    expect(p.intendedRhythm).toBe("whenever");
    expect(p.streakType).toBe("none");
  });
});
