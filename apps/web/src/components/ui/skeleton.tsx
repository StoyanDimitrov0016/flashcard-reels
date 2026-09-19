import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type SkeletonProps = Readonly<HTMLAttributes<HTMLDivElement>>;

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-[var(--surface-subtle)]", className)}
      {...props}
    />
  );
}

export { Skeleton };
