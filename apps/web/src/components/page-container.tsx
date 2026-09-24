import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageContainerProps = Readonly<{ children: ReactNode; className?: string }>;

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10", className)}>
      {children}
    </div>
  );
}
