import type { HabitType } from "./types";
import { newId } from "./id";
import { DEFAULT_COLOR } from "./color-palette";

export interface HabitPreset {
  color: string;
  icon?: string;
  target?: number;
  targetUnit?: string;
  categoryOptions?: { id: string; label: string }[];
}

export function presetFor(type: HabitType): HabitPreset {
  switch (type) {
    case "duration":
      return { color: DEFAULT_COLOR, icon: "clock", target: 20, targetUnit: "min" };
    case "number":
      return { color: "#3BA8E5", icon: "hash", target: 8, targetUnit: "glasses" };
    case "time":
      return { color: "#8B6CF0", icon: "moon" };
    case "category":
      return {
        color: "#E8A23D",
        icon: "tag",
        categoryOptions: [
          { id: newId(), label: "Low" },
          { id: newId(), label: "Okay" },
          { id: newId(), label: "Great" },
        ],
      };
    case "boolean":
    default:
      return { color: "#0E9F77", icon: "check" };
  }
}
