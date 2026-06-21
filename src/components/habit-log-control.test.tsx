import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Habit } from "@/lib/types";
import { HabitLogControl } from "./habit-log-control";

function habit(p: Partial<Habit>): Habit {
  return {
    id: "h1",
    name: "Test",
    type: "boolean",
    color: "#5B6CF0",
    frequency: "daily",
    createdAt: "2026-06-01T00:00:00Z",
    archivedAt: null,
    ...p,
  };
}

describe("HabitLogControl", () => {
  it("boolean: clicking the toggle completes the habit", async () => {
    const onChange = vi.fn();
    render(<HabitLogControl habit={habit({ type: "boolean" })} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /mark.*done|complete/i }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("number: + increments from the current value", async () => {
    const onChange = vi.fn();
    render(<HabitLogControl habit={habit({ type: "number", target: 8 })} value={5} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /increase/i }));
    expect(onChange).toHaveBeenCalledWith(6);
  });

  it("number: − does not go below 0", async () => {
    const onChange = vi.fn();
    render(<HabitLogControl habit={habit({ type: "number" })} value={0} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /decrease/i }));
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it("duration: a quick-chip logs its minutes", async () => {
    const onChange = vi.fn();
    render(<HabitLogControl habit={habit({ type: "duration", target: 20 })} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "30m" }));
    expect(onChange).toHaveBeenCalledWith(30);
  });

  it("time: changing the input logs HH:mm", () => {
    const onChange = vi.fn();
    render(<HabitLogControl habit={habit({ type: "time" })} onChange={onChange} />);
    const input = screen.getByLabelText(/time/i);
    // jsdom's <input type="time"> rejects partial values, so set it in one change.
    fireEvent.change(input, { target: { value: "23:20" } });
    expect(onChange).toHaveBeenCalledWith("23:20");
  });

  it("category: clicking a chip logs its option id", async () => {
    const onChange = vi.fn();
    const h = habit({ type: "category", categoryOptions: [{ id: "opt-1", label: "Strength" }] });
    render(<HabitLogControl habit={h} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Strength" }));
    expect(onChange).toHaveBeenCalledWith("opt-1");
  });
});
