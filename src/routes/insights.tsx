import { useHabitStore } from "@/store/habit-store";
import { buildWeeklyReview } from "@/lib/insights";
import { todayKey } from "@/lib/date-utils";
import { WeeklyReview } from "@/components/weekly-review";

export default function InsightsRoute() {
  const habits = useHabitStore((s) => s.habits);
  const entries = useHabitStore((s) => s.entries);
  const settings = useHabitStore((s) => s.settings);

  const review = buildWeeklyReview(habits, entries, todayKey(), settings);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold">Your week at a glance</h1>
        <p className="text-sm text-[var(--muted-foreground)]">What worked, what slipped, what to adjust.</p>
      </header>
      <WeeklyReview review={review} habits={habits} />
    </div>
  );
}
