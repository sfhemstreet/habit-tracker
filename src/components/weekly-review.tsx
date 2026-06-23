import type { ReactNode } from "react";
import { Flame, Sparkles, TriangleAlert, Trophy } from "lucide-react";
import type { Habit } from "@/lib/types";
import type { WeeklyReview as Review } from "@/lib/insights";

interface Props {
  review: Review;
  habits: Habit[];
}

export function WeeklyReview({ review, habits }: Props) {
  const nameOf = (id: string | null) => habits.find((h) => h.id === id)?.name ?? "—";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Consistency" value={`${Math.round(review.consistency * 100)}%`} />
        <Tile label="Best habit" value={nameOf(review.bestHabitId)} icon={<Trophy className="h-4 w-4 text-[#E8A23D]" />} />
        <Tile label="Most friction" value={nameOf(review.frictionHabitId)} icon={<TriangleAlert className="h-4 w-4 text-[var(--muted-foreground)]" />} />
        <Tile label="Missed days" value={`${review.missedDays}`} />
      </div>

      {review.activeStreaks.length > 0 ? (
        <div className="rounded-2xl border bg-[var(--card)] p-4">
          <h2 className="mb-2 text-sm font-semibold">Active streaks</h2>
          <div className="flex flex-wrap gap-2">
            {review.activeStreaks.map((s) => (
              <span key={s.habitId} className="inline-flex items-center gap-1 rounded-full bg-[var(--secondary)] px-3 py-1 text-xs">
                <Flame className="h-3 w-3 text-[#E8A23D]" /> {nameOf(s.habitId)} · {s.streak} {s.unit}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {review.insights.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-[var(--card)] p-4 text-sm text-[var(--muted-foreground)]">
            Keep logging — suggestions will appear as patterns emerge.
          </div>
        ) : (
          review.insights.map((ins) => (
            <div key={ins.id} className="flex items-start gap-3 rounded-2xl border bg-[var(--card)] p-4">
              <div className="mt-0.5">
                {ins.tone === "positive" ? <Sparkles className="h-5 w-5 text-[var(--success)]" /> : <TriangleAlert className="h-5 w-5 text-[#E8A23D]" />}
              </div>
              <div>
                <div className="text-sm font-semibold">{ins.title}</div>
                <div className="text-sm text-[var(--muted-foreground)]">{ins.message}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-2xl border bg-[var(--card)] p-3">
      <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">{icon}{label}</div>
      <div className="truncate text-base font-bold">{value}</div>
    </div>
  );
}
