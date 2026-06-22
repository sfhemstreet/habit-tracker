import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import TodayRoute from "@/routes/today";

// Secondary routes are code-split so the initial load (Today) stays lean.
// Habit detail carries Recharts, so deferring it keeps charts out of the
// first bundle until a user opens a habit.
const CalendarRoute = lazy(() => import("@/routes/calendar"));
const InsightsRoute = lazy(() => import("@/routes/insights"));
const SettingsRoute = lazy(() => import("@/routes/settings"));
const HabitDetailRoute = lazy(() => import("@/routes/habit-detail"));

function RouteFallback() {
  return (
    <div className="py-12 text-center text-sm text-[var(--muted-foreground)]">Loading…</div>
  );
}

function lazyRoute(element: ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<TodayRoute />} />
          <Route path="/calendar" element={lazyRoute(<CalendarRoute />)} />
          <Route path="/insights" element={lazyRoute(<InsightsRoute />)} />
          <Route path="/settings" element={lazyRoute(<SettingsRoute />)} />
          <Route path="/habits/:id" element={lazyRoute(<HabitDetailRoute />)} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
