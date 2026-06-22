import type { ComponentType } from "react";
import * as Icons from "lucide-react";
import type { LucideProps } from "lucide-react";

const fallback = Icons.Circle;

function toPascal(name: string): string {
  return name
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

export function HabitIcon({ name, ...props }: { name?: string } & LucideProps) {
  const key = name ? toPascal(name) : "";
  const Cmp = (Icons as unknown as Record<string, ComponentType<LucideProps>>)[key] ?? fallback;
  return <Cmp {...props} />;
}
