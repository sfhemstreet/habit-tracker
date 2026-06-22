import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
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
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const title = editing ? "Edit habit" : "New habit";

  const form = (
    <HabitForm
      initial={editing}
      onCancel={() => onOpenChange(false)}
      onSubmit={(value) => {
        if (editing) updateHabit(editing.id, value);
        else addHabit(value);
        onOpenChange(false);
      }}
    />
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {form}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="px-4 pb-0">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">{form}</div>
      </SheetContent>
    </Sheet>
  );
}
