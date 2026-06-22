import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import type {
  AppSettings,
  Habit,
  HabitEntry,
  HabitEntryValue,
  PersistedData,
} from "../lib/types";
import { newId } from "../lib/id";
import { createSeedHabits } from "../lib/seed-data";
import {
  exportData as exportDataFn,
  loadData,
  parseImport,
  saveData,
  defaultData,
} from "../lib/storage";

export interface AddHabitInput {
  name: string;
  type: Habit["type"];
  color: string;
  frequency: Habit["frequency"];
  description?: string;
  icon?: string;
  target?: number;
  targetUnit?: string;
  categoryOptions?: Habit["categoryOptions"];
  activeDays?: number[];
}

export interface UpsertEntryInput {
  habitId: string;
  date: string;
  value: HabitEntryValue;
  note?: string;
}

export interface HabitState {
  habits: Habit[];
  entries: HabitEntry[];
  settings: AppSettings;
  initializedAt: string | null;

  addHabit: (input: AddHabitInput) => Habit;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  archiveHabit: (id: string) => void;
  deleteHabit: (id: string) => void;

  addOrUpdateEntry: (input: UpsertEntryInput) => HabitEntry;
  deleteEntry: (habitId: string, date: string) => void;
  getEntriesForDate: (date: string) => HabitEntry[];
  getEntriesForHabit: (habitId: string) => HabitEntry[];

  exportData: () => string;
  importData: (json: string) => void;
  clearData: () => void;
  loadSampleData: () => void;
}

function snapshot(state: HabitState): PersistedData {
  return {
    schemaVersion: 1,
    habits: state.habits,
    entries: state.entries,
    settings: state.settings,
    initializedAt: state.initializedAt,
  };
}

export function createHabitStore() {
  let initial = loadData();
  // First ever load → seed the 5 examples once.
  if (initial.initializedAt === null) {
    initial = {
      ...initial,
      habits: createSeedHabits(),
      initializedAt: new Date().toISOString(),
    };
    saveData(initial);
  }

  return createStore<HabitState>((set, get) => {
    const persist = () => saveData(snapshot(get()));

    return {
      habits: initial.habits,
      entries: initial.entries,
      settings: initial.settings,
      initializedAt: initial.initializedAt,

      addHabit: (input) => {
        const now = new Date().toISOString();
        const habit: Habit = {
          id: newId(),
          name: input.name,
          description: input.description,
          type: input.type,
          color: input.color,
          icon: input.icon,
          target: input.target,
          targetUnit: input.targetUnit,
          categoryOptions: input.categoryOptions,
          frequency: input.frequency,
          activeDays: input.activeDays,
          createdAt: now,
          archivedAt: null,
        };
        set({ habits: [...get().habits, habit] });
        persist();
        return habit;
      },

      updateHabit: (id, patch) => {
        set({
          habits: get().habits.map((h) => (h.id === id ? { ...h, ...patch, id: h.id } : h)),
        });
        persist();
      },

      archiveHabit: (id) => {
        set({
          habits: get().habits.map((h) =>
            h.id === id ? { ...h, archivedAt: new Date().toISOString() } : h,
          ),
        });
        persist();
      },

      deleteHabit: (id) => {
        set({
          habits: get().habits.filter((h) => h.id !== id),
          entries: get().entries.filter((e) => e.habitId !== id),
        });
        persist();
      },

      addOrUpdateEntry: (input) => {
        const now = new Date().toISOString();
        const existing = get().entries.find(
          (e) => e.habitId === input.habitId && e.date === input.date,
        );
        let result: HabitEntry;
        if (existing) {
          result = { ...existing, value: input.value, note: input.note, updatedAt: now };
          set({ entries: get().entries.map((e) => (e.id === existing.id ? result : e)) });
        } else {
          result = {
            id: newId(),
            habitId: input.habitId,
            date: input.date,
            value: input.value,
            note: input.note,
            createdAt: now,
            updatedAt: now,
          };
          set({ entries: [...get().entries, result] });
        }
        persist();
        return result;
      },

      deleteEntry: (habitId, date) => {
        set({
          entries: get().entries.filter((e) => !(e.habitId === habitId && e.date === date)),
        });
        persist();
      },

      getEntriesForDate: (date) => get().entries.filter((e) => e.date === date),
      getEntriesForHabit: (habitId) => get().entries.filter((e) => e.habitId === habitId),

      exportData: () => exportDataFn(snapshot(get())),

      importData: (json) => {
        const data = parseImport(json);
        set({
          habits: data.habits,
          entries: data.entries,
          settings: data.settings,
          initializedAt: data.initializedAt ?? new Date().toISOString(),
        });
        persist();
      },

      clearData: () => {
        const base = defaultData();
        set({
          habits: [],
          entries: [],
          settings: base.settings,
          initializedAt: new Date().toISOString(), // keep set so we never reseed
        });
        persist();
      },

      loadSampleData: () => {
        set({ habits: [...get().habits, ...createSeedHabits()] });
        persist();
      },
    };
  });
}

export const habitStore = createHabitStore();

export function useHabitStore<T>(selector: (state: HabitState) => T): T {
  return useStore(habitStore, selector);
}
