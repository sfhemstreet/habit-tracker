import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useHabitStore } from "@/store/habit-store";
import type { Habit } from "@/lib/types";
import { HabitForm } from "./habit-form";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: Habit;
}

export function AddHabitDialog({ open, onOpenChange, editing }: Props) {
  const addHabit = useHabitStore((s) => s.addHabit);
  const updateHabit = useHabitStore((s) => s.updateHabit);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit habit" : "New habit"}</DialogTitle>
        </DialogHeader>
        <HabitForm
          initial={editing}
          onCancel={() => onOpenChange(false)}
          onSubmit={(value) => {
            if (editing) updateHabit(editing.id, value);
            else addHabit(value);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
