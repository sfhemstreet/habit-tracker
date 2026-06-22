import type { ComponentType } from "react";
import {
  BookOpen,
  Check,
  Circle,
  Clock,
  Droplet,
  Dumbbell,
  Flower,
  Hash,
  Moon,
  Tag,
  type LucideProps,
} from "lucide-react";

// Curated map of the icons the app actually uses (from seed-data + presets).
// Importing named icons instead of `import * as Icons` keeps Lucide
// tree-shakeable — the full icon set (~600 kB) never ships.
const ICONS: Record<string, ComponentType<LucideProps>> = {
  "book-open": BookOpen,
  check: Check,
  clock: Clock,
  droplet: Droplet,
  dumbbell: Dumbbell,
  flower: Flower,
  hash: Hash,
  moon: Moon,
  tag: Tag,
};

export function HabitIcon({ name, ...props }: { name?: string } & LucideProps) {
  const Cmp = (name && ICONS[name]) || Circle;
  return <Cmp {...props} />;
}
