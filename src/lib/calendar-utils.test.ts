import { describe, it, expect } from "vitest";
import { buildMonthGrid, monthLabel } from "./calendar-utils";

describe("buildMonthGrid", () => {
  it("returns whole weeks (multiple of 7 cells)", () => {
    const cells = buildMonthGrid("2026-06-15", 1);
    expect(cells.length % 7).toBe(0);
  });

  it("marks in-month vs adjacent-month days", () => {
    const cells = buildMonthGrid("2026-06-15", 1); // June 2026
    const inMonth = cells.filter((c) => c.inMonth);
    expect(inMonth).toHaveLength(30); // June has 30 days
    expect(inMonth[0].key).toBe("2026-06-01");
    expect(inMonth[29].key).toBe("2026-06-30");
  });

  it("Monday start: first cell is the Monday on/before the 1st", () => {
    // 2026-06-01 is a Monday, so the grid starts exactly there
    const cells = buildMonthGrid("2026-06-15", 1);
    expect(cells[0].key).toBe("2026-06-01");
  });

  it("Sunday start: pads with the prior Sunday", () => {
    const cells = buildMonthGrid("2026-06-15", 0);
    // 2026-06-01 is Monday; Sunday-start grid begins 2026-05-31
    expect(cells[0].key).toBe("2026-05-31");
    expect(cells[0].inMonth).toBe(false);
  });
});

describe("monthLabel", () => {
  it("formats as 'Month YYYY'", () => {
    expect(monthLabel("2026-06-15")).toBe("June 2026");
  });
});
