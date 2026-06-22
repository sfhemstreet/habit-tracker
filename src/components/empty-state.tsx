import type { ReactNode } from "react";

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
}

export function EmptyState({ icon, title, description, children }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-[var(--card)] px-6 py-12 text-center">
      {icon ? <div className="mb-3 text-[var(--muted-foreground)]">{icon}</div> : null}
      <h3 className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-[var(--muted-foreground)]">{description}</p> : null}
      {children ? <div className="mt-4 flex gap-2">{children}</div> : null}
    </div>
  );
}
