import { formatLongDate } from "@/lib/date-utils";

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function TodayHeader({ todayKey }: { todayKey: string }) {
  return (
    <header className="mb-4">
      <div className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">{formatLongDate(todayKey)}</div>
      <h1 className="text-xl font-bold text-[var(--foreground)]">{greeting(new Date())}</h1>
      <p className="text-sm text-[var(--muted-foreground)]">What did you make progress on today?</p>
    </header>
  );
}
