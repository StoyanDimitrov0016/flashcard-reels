import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = Readonly<{
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  action?: ReactNode;
}>;

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-input px-6 py-14 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon aria-hidden className="size-5" />
      </span>
      <h2 className="mt-4 text-[15px] font-semibold">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
