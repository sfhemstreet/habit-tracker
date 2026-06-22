import { useRef, useState } from "react";
import { Download, Upload, Trash2 } from "lucide-react";
import { useHabitStore } from "@/store/habit-store";
import { ConfirmDialog } from "@/components/confirm-dialog";

export default function SettingsRoute() {
  const exportData = useHabitStore((s) => s.exportData);
  const importData = useHabitStore((s) => s.importData);
  const clearData = useHabitStore((s) => s.clearData);
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  function handleExport() {
    const blob = new Blob([exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `habit-tracker-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus({ kind: "ok", msg: "Exported your data." });
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      importData(text);
      setStatus({ kind: "ok", msg: "Imported successfully." });
    } catch (e) {
      setStatus({ kind: "err", msg: e instanceof Error ? e.message : "Import failed." });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Your data lives on this device.</p>
      </header>

      <section className="rounded-2xl border bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold">Your data</h2>
        <div className="flex flex-col gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 rounded-lg bg-[var(--secondary)] px-3 py-2 text-sm font-medium">
            <Download className="h-4 w-4" /> Export as JSON
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 rounded-lg bg-[var(--secondary)] px-3 py-2 text-sm font-medium">
            <Upload className="h-4 w-4" /> Import from JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImportFile(f);
              e.target.value = "";
            }}
          />
          <button onClick={() => setConfirmClear(true)} className="flex items-center gap-2 rounded-lg bg-[var(--secondary)] px-3 py-2 text-sm font-medium text-[var(--destructive)]">
            <Trash2 className="h-4 w-4" /> Clear all data
          </button>
        </div>
        {status ? (
          <p className={`mt-3 text-sm ${status.kind === "ok" ? "text-[var(--success)]" : "text-[var(--destructive)]"}`}>{status.msg}</p>
        ) : null}
      </section>

      <section className="rounded-2xl border bg-[var(--card)] p-4">
        <h2 className="mb-2 text-sm font-semibold">About</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Habit Tracker helps you build consistent routines without overcomplicating your life.
          Small actions, tracked consistently, create visible momentum. Your data stays on your
          device — export anytime.
        </p>
      </section>

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear all data?"
        description="This permanently deletes all habits and entries on this device. Export first if you want a backup."
        confirmLabel="Delete everything"
        destructive
        onConfirm={() => {
          clearData();
          setConfirmClear(false);
          setStatus({ kind: "ok", msg: "All data cleared." });
        }}
      />
    </div>
  );
}
