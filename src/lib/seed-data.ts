import type { Habit } from "./types";
import { newId } from "./id";

export function createSeedHabits(now: Date = new Date()): Habit[] {
  const createdAt = now.toISOString();
  const base = { createdAt, archivedAt: null as string | null };
  return [
    { id: newId(), name: "Meditate", type: "yes_no", color: "#0E9F77", icon: "flower",
      intendedRhythm: "daily", streakType: "daily", ...base },
    { id: newId(), name: "Pushups", type: "number", color: "#3BA8E5", icon: "dumbbell",
      target: 15, unit: "pushups", intendedRhythm: "daily", streakType: "daily", ...base },
    { id: newId(), name: "Read", type: "duration", color: "#5B6CF0", icon: "book-open",
      target: 20, intendedRhythm: "daily", streakType: "daily", ...base },
    { id: newId(), name: "Energy", type: "rating", color: "#E8A23D", icon: "smile",
      intendedRhythm: "whenever", streakType: "none", ...base },
    { id: newId(), name: "Lower Body", type: "duration", color: "#8B6CF0", icon: "activity",
      target: 30, intendedRhythm: "multiple_per_week", intendedCountPerWeek: 2,
      streakType: "weekly", ...base },
  ];
}
