import type { ReactNode } from "react";

import { AppHeader } from "@/components/app-header";

type PortalLayoutProps = Readonly<{ children: ReactNode }>;

export default function PortalLayout({ children }: PortalLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}
