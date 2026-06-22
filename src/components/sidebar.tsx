import { NavLink } from "react-router-dom";
import { Plus } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";
import { cn } from "@/lib/utils";

export function Sidebar({ onNewHabit }: { onNewHabit: () => void }) {
  return (
    <aside className="hidden w-[200px] shrink-0 flex-col border-r bg-[var(--card)] p-3 md:flex">
      <div className="flex items-center gap-2 px-2 pb-4 pt-1">
        <img
          src={`${import.meta.env.BASE_URL}habit-tracker-logo.png`}
          alt=""
          className="h-6 w-6 rounded-md"
        />
        <span className="text-sm font-bold">Habit Tracker</span>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm",
                isActive ? "bg-[var(--accent)] font-semibold text-[var(--primary)]" : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)]",
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <button onClick={onNewHabit} className="mt-auto flex items-center justify-center gap-1.5 rounded-xl bg-[var(--primary)] py-2.5 text-sm font-semibold text-white">
        <Plus className="h-4 w-4" /> New habit
      </button>
    </aside>
  );
}
