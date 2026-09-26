import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type BadgeProps = Readonly<ComponentPropsWithoutRef<"span">>;

function Badge({ className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm bg-surface-subtle px-1.5 py-0.5 text-xs font-medium text-fg-muted [&_svg]:size-3",
        className
      )}
      {...props}
    />
  );
}

export { Badge };
