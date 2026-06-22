import { Circle, type LucideProps } from "lucide-react";
import { HABIT_ICON_MAP } from "@/lib/habit-icons";

export function HabitIcon({ name, ...props }: { name?: string } & LucideProps) {
  const Cmp = (name && HABIT_ICON_MAP[name]) || Circle;
  return <Cmp {...props} />;
}
