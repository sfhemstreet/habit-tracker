interface Props {
  label: string;
  value: string;
  hint?: string;
}

export function StatsCard({ label, value, hint }: Props) {
  return (
    <div className="rounded-2xl border bg-[var(--card)] p-3">
      <div className="text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">{label}</div>
      <div className="text-xl font-bold text-[var(--foreground)]">{value}</div>
      {hint ? <div className="text-[11px] text-[var(--muted-foreground)]">{hint}</div> : null}
    </div>
  );
}
