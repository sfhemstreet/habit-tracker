import type { HabitType, IntendedRhythm, StreakType } from "./types";
import { DEFAULT_COLOR } from "./color-palette";

export interface HabitPreset {
  color: string;
  icon?: string;
  target?: number;
  unit?: string;
  intendedRhythm: IntendedRhythm;
  intendedCountPerWeek?: number;
  streakType: StreakType;
}

export function presetFor(type: HabitType): HabitPreset {
  switch (type) {
    case "number":
      return { color: "#3BA8E5", icon: "hash", target: 8, unit: "glasses", intendedRhythm: "daily", streakType: "daily" };
    case "duration":
      return { color: DEFAULT_COLOR, icon: "clock", target: 20, intendedRhythm: "daily", streakType: "daily" };
    case "rating":
      return { color: "#E8A23D", icon: "smile", intendedRhythm: "whenever", streakType: "none" };
    case "yes_no":
    default:
      return { color: "#0E9F77", icon: "check", intendedRhythm: "daily", streakType: "daily" };
  }
}
