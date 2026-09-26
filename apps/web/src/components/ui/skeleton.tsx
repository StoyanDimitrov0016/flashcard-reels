import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type SkeletonProps = Readonly<ComponentPropsWithoutRef<"div">>;

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-surface-subtle", className)}
      {...props}
    />
  );
}

export { Skeleton };
