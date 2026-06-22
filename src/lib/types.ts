export type HabitType = "yes_no" | "number" | "duration" | "rating";

export type RatingValue = "low" | "okay" | "great";

export type IntendedRhythm =
  | "daily"
  | "weekly"
  | "multiple_per_week"
  | "whenever";

export type StreakType = "daily" | "weekly" | "none";

export interface Habit {
  id: string;
  name: string;
  description?: string;
  type: HabitType;
  color: string;
  icon?: string; // Lucide icon name
  target?: number; // number: count · duration: minutes
  unit?: string; // number only; duration is always "minutes"
  intendedRhythm: IntendedRhythm;
  intendedCountPerWeek?: number; // used when intendedRhythm === "multiple_per_week"
  streakType: StreakType;
  createdAt: string; // ISO timestamp
  archivedAt?: string | null;
}

export type HabitEntryValue = boolean | number | RatingValue;

export interface HabitEntry {
  id: string;
  habitId: string;
  date: string; // "YYYY-MM-DD" local day key
  value: HabitEntryValue; // rating stored as literal "low" | "okay" | "great"
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export type StreakStatus =
  | { type: "daily"; count: number; todayLogged: boolean }
  | { type: "weekly"; count: number; thisWeek: number; required: number; met: boolean }
  | { type: "none" };

export interface HabitStats {
  streak: StreakStatus;
  longestStreak: number; // daily: days · weekly: weeks · none: 0
  completionRate7Days: number; // 0..1
  completionRate30Days: number; // 0..1
  totalCompletions: number;
  missedDays: number;
}

export interface AppSettings {
  weekStartsOn: 0 | 1; // 0=Sun, 1=Mon (default 1)
}

export interface PersistedData {
  schemaVersion: number;
  habits: Habit[];
  entries: HabitEntry[];
  settings: AppSettings;
  initializedAt: string | null;
}
