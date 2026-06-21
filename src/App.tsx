import { HashRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import TodayRoute from "@/routes/today";
import CalendarRoute from "@/routes/calendar";
import InsightsRoute from "@/routes/insights";
import SettingsRoute from "@/routes/settings";
import HabitDetailRoute from "@/routes/habit-detail";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<TodayRoute />} />
          <Route path="/calendar" element={<CalendarRoute />} />
          <Route path="/insights" element={<InsightsRoute />} />
          <Route path="/settings" element={<SettingsRoute />} />
          <Route path="/habits/:id" element={<HabitDetailRoute />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
