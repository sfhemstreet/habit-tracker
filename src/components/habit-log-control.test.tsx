import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HabitLogControl } from "./habit-log-control";
import type { Habit } from "@/lib/types";

function h(p: Partial<Habit>): Habit {
  return { id: "h", name: "H", type: "yes_no", color: "#000",
    intendedRhythm: "daily", streakType: "daily",
    createdAt: "2026-06-01T08:00:00.000Z", archivedAt: null, ...p };
}

describe("HabitLogControl v2", () => {
  it("yes_no toggles done", () => {
    const onChange = vi.fn();
    render(<HabitLogControl habit={h({ type: "yes_no" })} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("number takes a typed value and shows the unit", () => {
    const onChange = vi.fn();
    render(<HabitLogControl habit={h({ type: "number", unit: "pushups" })} onChange={onChange} />);
    expect(screen.getByText("pushups")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "15" } });
    expect(onChange).toHaveBeenLastCalledWith(15);
  });

  it("duration shows minutes and stores a number", () => {
    const onChange = vi.fn();
    render(<HabitLogControl habit={h({ type: "duration" })} onChange={onChange} />);
    expect(screen.getByText("minutes")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "20" } });
    expect(onChange).toHaveBeenLastCalledWith(20);
  });

  it("rating offers Low/Okay/Great and stores the literal", () => {
    const onChange = vi.fn();
    render(<HabitLogControl habit={h({ type: "rating", streakType: "none" })} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Great" }));
    expect(onChange).toHaveBeenCalledWith("great");
  });
});
