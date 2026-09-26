import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type LabelProps = Readonly<ComponentPropsWithoutRef<"label">>;

function Label({ className, ...props }: LabelProps) {
  return <label className={cn("text-sm font-medium text-fg", className)} {...props} />;
}

export { Label };
