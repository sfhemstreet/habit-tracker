import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useHabitStore } from "@/store/habit-store";
import { todayKey } from "@/lib/date-utils";
import { currentStreak, isHabitCompleted, isScheduledOn } from "@/lib/habit-utils";
import { TodayHeader } from "@/components/today-header";
import { DailyProgressCard } from "@/components/daily-progress-card";
import { HabitCard } from "@/components/habit-card";
import { EmptyState } from "@/components/empty-state";

export default function TodayRoute() {
  const { openAddHabit } = useOutletContext<{ openAddHabit: () => void }>();
  const habits = useHabitStore((s) => s.habits);
  const entries = useHabitStore((s) => s.entries);
  const addOrUpdateEntry = useHabitStore((s) => s.addOrUpdateEntry);
  const loadSampleData = useHabitStore((s) => s.loadSampleData);

  const today = todayKey();

  const scheduled = useMemo(
    () => habits.filter((h) => !h.archivedAt && isScheduledOn(h, today)),
    [habits, today],
  );

  const entryFor = (habitId: string) =>
    entries.find((e) => e.habitId === habitId && e.date === today);

  const completed = scheduled.filter((h) => isHabitCompleted(h, entryFor(h.id))).length;
  const bestStreak = scheduled.reduce(
    (max, h) => Math.max(max, currentStreak(h, entries.filter((e) => e.habitId === h.id), today)),
    0,
  );

  if (habits.filter((h) => !h.archivedAt).length === 0) {
    return (
      <>
        <TodayHeader todayKey={today} />
        <EmptyState
          icon={<Sparkles className="h-8 w-8" />}
          title="Start your first habit"
          description="Small actions, tracked consistently, create visible momentum."
        >
          <button onClick={openAddHabit} className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white">
            Create a habit
          </button>
          <button onClick={loadSampleData} className="rounded-xl bg-[var(--secondary)] px-4 py-2 text-sm font-medium text-[var(--foreground)]">
            Load sample data
          </button>
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <TodayHeader todayKey={today} />
      <DailyProgressCard completed={completed} total={scheduled.length} bestStreak={bestStreak} />
      <div className="flex flex-col gap-2">
        {scheduled.map((h) => (
          <HabitCard
            key={h.id}
            habit={h}
            entry={entryFor(h.id)}
            streak={currentStreak(h, entries.filter((e) => e.habitId === h.id), today)}
            onLog={(value) => addOrUpdateEntry({ habitId: h.id, date: today, value })}
          />
        ))}
      </div>
    </>
  );
}
