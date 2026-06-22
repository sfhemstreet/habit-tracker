import { Flame } from "lucide-react";
import { ProgressRing } from "./progress-ring";

interface Props {
  completed: number;
  total: number;
  bestStreak: number;
}

export function DailyProgressCard({ completed, total, bestStreak }: Props) {
  const ratio = total === 0 ? 0 : completed / total;
  const remaining = total - completed;
  return (
    <div className="mb-4 flex items-center gap-4 rounded-2xl border bg-[var(--card)] p-4">
      <ProgressRing value={ratio} size={56} stroke={6} label={`${Math.round(ratio * 100)}%`} />
      <div className="flex-1">
        <div className="text-sm font-semibold text-[var(--foreground)]">
          {completed} of {total} habit{total === 1 ? "" : "s"} done
        </div>
        <div className="text-xs text-[var(--muted-foreground)]">
          {remaining > 0 ? `Small actions compound. ${remaining} to go.` : "All done today. Nice work."}
        </div>
      </div>
      {bestStreak > 0 ? (
        <div className="rounded-xl bg-[var(--secondary)] px-3 py-2 text-center">
          <div className="flex items-center gap-1 text-base font-bold text-[var(--foreground)]">
            <Flame className="h-4 w-4 text-[#E8A23D]" /> {bestStreak}
          </div>
          <div className="text-[10px] text-[var(--muted-foreground)]">top streak</div>
        </div>
      ) : null}
    </div>
  );
}
