import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type InputProps = Readonly<ComponentPropsWithoutRef<"input">>;

function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-line-strong bg-surface px-3 text-[15px] text-fg transition-colors outline-none placeholder:text-fg-subtle focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-accent/20 focus-visible:outline-none aria-invalid:border-danger aria-invalid:ring-danger/20",
        className
      )}
      {...props}
    />
  );
}

export { Input };
