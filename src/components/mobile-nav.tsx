import { NavLink } from "react-router-dom";
import { Plus } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";
import { cn } from "@/lib/utils";

export function MobileNav({ onNewHabit }: { onNewHabit: () => void }) {
  const [today, calendar, insights, settings] = NAV_ITEMS;
  const left = [today, calendar];
  const right = [insights, settings];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t bg-[var(--card)] px-2 pb-[calc(env(safe-area-inset-bottom)_+_0.25rem)] pt-2 md:hidden">
      {left.map((item) => <NavTab key={item.to} {...item} />)}
      <button onClick={onNewHabit} aria-label="New habit" className="-mt-1 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-lg">
        <Plus className="h-5 w-5" />
      </button>
      {right.map((item) => <NavTab key={item.to} {...item} />)}
    </nav>
  );
}

function NavTab({ to, label, icon: Icon }: (typeof NAV_ITEMS)[number]) {
  return (
    <NavLink to={to} end={to === "/"} className={({ isActive }) => cn("flex flex-col items-center gap-0.5 text-[10px]", isActive ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")}>
      <Icon className="h-5 w-5" />
      {label}
    </NavLink>
  );
}
