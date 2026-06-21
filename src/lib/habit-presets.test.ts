import { describe, it, expect } from "vitest";
import { presetFor } from "./habit-presets";

describe("presetFor", () => {
  it("duration defaults to a 20-minute target", () => {
    const p = presetFor("duration");
    expect(p.target).toBe(20);
    expect(p.targetUnit).toBe("min");
  });
  it("number defaults to 8 with a unit", () => {
    const p = presetFor("number");
    expect(p.target).toBe(8);
    expect(p.targetUnit).toBeTruthy();
  });
  it("category supplies starter options", () => {
    const p = presetFor("category");
    expect((p.categoryOptions ?? []).length).toBeGreaterThan(0);
  });
  it("boolean has no target", () => {
    expect(presetFor("boolean").target).toBeUndefined();
  });
});
