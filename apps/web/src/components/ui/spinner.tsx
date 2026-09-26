import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type SpinnerProps = Readonly<{ className?: string; label?: string }>;

/** An inline progress indicator. Pass a label when nothing nearby explains what is loading. */
function Spinner({ className, label }: SpinnerProps) {
  return (
    <span className="inline-flex items-center" role={label ? "status" : undefined}>
      <LoaderCircle aria-hidden className={cn("size-4 animate-spin", className)} />
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}

export { Spinner };
