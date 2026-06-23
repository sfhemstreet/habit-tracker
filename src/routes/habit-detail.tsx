import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, Pencil, Archive } from "lucide-react";
import { useHabitStore } from "@/store/habit-store";
import { computeStats, formatValue } from "@/lib/habit-utils";
import { todayKey, addDays } from "@/lib/date-utils";
import { StatsCard } from "@/components/stats-card";
import { HabitHeatmap } from "@/components/habit-heatmap";
import { TrendChart } from "@/components/trend-chart";
import { HabitIcon } from "@/components/habit-icon";
import { AddHabitDialog } from "@/components/add-habit-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";

export default function HabitDetailRoute() {
  const { id } = useParams();
  const habits = useHabitStore((s) => s.habits);
  const entries = useHabitStore((s) => s.entries);
  const archiveHabit = useHabitStore((s) => s.archiveHabit);
  const settings = useHabitStore((s) => s.settings);
  const [editing, setEditing] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const habit = habits.find((h) => h.id === id);
  const habitEntries = useMemo(
    () => entries.filter((e) => e.habitId === id).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [entries, id],
  );

  if (!habit) {
    return (
      <div className="text-sm text-[var(--muted-foreground)]">
        Habit not found. <Link to="/" className="text-[var(--primary)]">Back to Today</Link>
      </div>
    );
  }

  const stats = computeStats(habit, habitEntries, todayKey(), settings);
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  const weekAgo = addDays(todayKey(), -6);
  const thisWeekCount = habitEntries.filter((e) => e.date >= weekAgo && e.date <= todayKey()).length;

  return (
    <div className="flex flex-col gap-4">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)]">
        <ChevronLeft className="h-4 w-4" /> Today
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${habit.color}1a`, color: habit.color }}>
          <HabitIcon name={habit.icon} className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-[var(--foreground)]">{habit.name}</h1>
          {habit.description ? <p className="text-sm text-[var(--muted-foreground)]">{habit.description}</p> : null}
        </div>
        <button onClick={() => setEditing(true)} aria-label="Edit habit" className="rounded-lg bg-[var(--secondary)] p-2"><Pencil className="h-4 w-4" /></button>
        {!habit.archivedAt ? (
          <button onClick={() => setConfirmArchive(true)} aria-label="Archive habit" className="rounded-lg bg-[var(--secondary)] p-2"><Archive className="h-4 w-4" /></button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {stats.streak.type === "daily" ? (
          <>
            <StatsCard label="Current streak" value={`${stats.streak.count}`} hint="days" />
            <StatsCard label="Longest streak" value={`${stats.longestStreak}`} hint="days" />
            <StatsCard label="7-day" value={pct(stats.completionRate7Days)} />
            <StatsCard label="30-day" value={pct(stats.completionRate30Days)} />
            <StatsCard label="Total" value={`${stats.totalCompletions}`} hint="completions" />
            <StatsCard label="Missed" value={`${stats.missedDays}`} hint="days" />
          </>
        ) : stats.streak.type === "weekly" ? (
          <>
            <StatsCard label="Current streak" value={`${stats.streak.count}`} hint="weeks" />
            <StatsCard label="Longest streak" value={`${stats.longestStreak}`} hint="weeks" />
            <StatsCard label="This week" value={`${stats.streak.thisWeek}/${stats.streak.required}`} hint="logged" />
            <StatsCard label="Total" value={`${stats.totalCompletions}`} hint="sessions" />
          </>
        ) : (
          <>
            <StatsCard label="Total" value={`${stats.totalCompletions}`} hint="check-ins" />
            <StatsCard label="This week" value={`${thisWeekCount}`} hint="entries" />
          </>
        )}
      </div>

      <section className="rounded-2xl border bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold">Consistency</h2>
        <HabitHeatmap habit={habit} entries={habitEntries} />
      </section>

      <section className="rounded-2xl border bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold">Trend</h2>
        <TrendChart habit={habit} entries={habitEntries} />
      </section>

      <section className="rounded-2xl border bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold">Recent entries</h2>
        {habitEntries.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No entries yet.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {habitEntries.slice(0, 10).map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-[var(--muted-foreground)]">{e.date}</span>
                <span className="font-medium">{formatValue(habit, e.value)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AddHabitDialog open={editing} onOpenChange={setEditing} editing={habit} />
      <ConfirmDialog
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title={`Archive ${habit.name}?`}
        description="It will be hidden from Today but its history is kept."
        confirmLabel="Archive"
        onConfirm={() => { archiveHabit(habit.id); setConfirmArchive(false); }}
      />
    </div>
  );
}
