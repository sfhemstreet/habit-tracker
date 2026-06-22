import type { Habit } from "./types";
import { newId } from "./id";

export function createSeedHabits(now: Date = new Date()): Habit[] {
  const createdAt = now.toISOString();
  return [
    {
      id: newId(),
      name: "Read",
      description: "A little reading every day.",
      type: "duration",
      color: "#5B6CF0",
      icon: "book-open",
      target: 20,
      targetUnit: "min",
      frequency: "daily",
      createdAt,
      archivedAt: null,
    },
    {
      id: newId(),
      name: "Drink water",
      type: "number",
      color: "#3BA8E5",
      icon: "droplet",
      target: 8,
      targetUnit: "glasses",
      frequency: "daily",
      createdAt,
      archivedAt: null,
    },
    {
      id: newId(),
      name: "Meditate",
      type: "boolean",
      color: "#0E9F77",
      icon: "flower",
      frequency: "daily",
      createdAt,
      archivedAt: null,
    },
    {
      id: newId(),
      name: "Sleep time",
      type: "time",
      color: "#8B6CF0",
      icon: "moon",
      frequency: "daily",
      createdAt,
      archivedAt: null,
    },
    {
      id: newId(),
      name: "Workout",
      type: "category",
      color: "#E8A23D",
      icon: "dumbbell",
      frequency: "daily",
      categoryOptions: [
        { id: newId(), label: "Strength" },
        { id: newId(), label: "Cardio" },
        { id: newId(), label: "Mobility" },
        { id: newId(), label: "Rest" },
      ],
      createdAt,
      archivedAt: null,
    },
  ];
}
