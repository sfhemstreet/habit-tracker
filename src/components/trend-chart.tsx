import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { Habit, HabitEntry } from "@/lib/types";
import { buildTrendSeries, buildRatingDistribution } from "@/lib/chart-data";
import { todayKey } from "@/lib/date-utils";
import { EmptyState } from "./empty-state";

export function TrendChart({ habit, entries }: { habit: Habit; entries: HabitEntry[] }) {
  const today = todayKey();

  if (entries.length === 0) {
    return <EmptyState title="No data yet" description="Log this habit a few times to see trends here." />;
  }

  if (habit.type === "rating") {
    const data = buildRatingDistribution(habit, entries);
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="count" fill={habit.color} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  const series = buildTrendSeries(habit, entries, 30, today);
  const tickLabel = (d: string) => d.slice(5); // MM-DD

  if (habit.type === "yes_no") {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={series}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis dataKey="date" tickFormatter={tickLabel} tick={{ fontSize: 10 }} interval={4} />
          <YAxis domain={[0, 1]} ticks={[0, 1]} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="value" fill={habit.color} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={series}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
        <XAxis dataKey="date" tickFormatter={tickLabel} tick={{ fontSize: 10 }} interval={4} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        {habit.target ? <ReferenceLine y={habit.target} stroke="var(--muted-foreground)" strokeDasharray="4 4" /> : null}
        <Line type="monotone" dataKey="value" stroke={habit.color} strokeWidth={2} dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
