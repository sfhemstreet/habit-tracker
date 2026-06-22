import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { AddHabitDialog } from "./add-habit-dialog";

export function AppShell() {
  const [addOpen, setAddOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <Sidebar onNewHabit={() => setAddOpen(true)} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-24 pt-5 md:pb-8">
        <Outlet context={{ openAddHabit: () => setAddOpen(true) }} />
      </main>
      <MobileNav onNewHabit={() => setAddOpen(true)} />
      <AddHabitDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
