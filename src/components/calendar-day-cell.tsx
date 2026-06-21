import { cn } from "@/lib/utils";

interface Props {
  dayNumber: number;
  inMonth: boolean;
  ratio: number; // 0..1 completion
  isToday: boolean;
  disabled: boolean;
  selected: boolean;
  onClick: () => void;
}

export function CalendarDayCell({ dayNumber, inMonth, ratio, isToday, disabled, selected, onClick }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative flex aspect-square items-center justify-center rounded-lg text-xs",
        !inMonth && "opacity-30",
        disabled && "cursor-not-allowed opacity-40",
        selected ? "ring-2 ring-[var(--primary)]" : "",
        isToday ? "font-bold" : "",
      )}
      style={{ backgroundColor: ratio > 0 ? `color-mix(in srgb, var(--primary) ${Math.round(ratio * 70) + 10}%, var(--card))` : "var(--secondary)" }}
    >
      <span className={ratio > 0.5 ? "text-white" : "text-[var(--foreground)]"}>{dayNumber}</span>
    </button>
  );
}
