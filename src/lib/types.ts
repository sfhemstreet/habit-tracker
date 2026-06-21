export type HabitType = "boolean" | "number" | "duration" | "time" | "category";
export type HabitFrequency = "daily" | "custom"; // "weekly" reserved for later

export interface CategoryOption {
  id: string;
  label: string;
  color?: string;
}

export interface Habit {
  id: string;
  name: string;
  description?: string;
  type: HabitType;
  color: string;
  icon?: string; // Lucide icon name
  target?: number;
  targetUnit?: string;
  categoryOptions?: CategoryOption[];
  frequency: HabitFrequency;
  activeDays?: number[]; // 0=Sun..6=Sat, used when frequency === "custom"
  createdAt: string; // ISO timestamp
  archivedAt?: string | null;
}

export type HabitEntryValue = boolean | number | string;

export interface HabitEntry {
  id: string;
  habitId: string;
  date: string; // "YYYY-MM-DD" local day key
  value: HabitEntryValue;
  note?: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface HabitStats {
  currentStreak: number;
  longestStreak: number;
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
