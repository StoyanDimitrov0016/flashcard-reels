import { usePathname, useRouter, type ErrorBoundaryProps } from "expo-router";
import { useEffect } from "react";

import { reportError } from "@/shared/errors/report-error";
import { ViewErrorState } from "@/shared/presentation/components/view-error-state";

const viewTitles: Readonly<Record<string, string>> = {
  "/": "Couldn’t load For you",
  "/focus": "Couldn’t load Focus",
  "/reading": "Couldn’t load Reading",
  "/library": "Couldn’t load Library",
  "/progress": "Couldn’t load Progress",
  "/you": "Couldn’t open Controls",
  "/archived-progress": "Couldn’t load archived progress",
  "/progress-backup": "Couldn’t open progress backup",
};

function resolveViewTitle(pathname: string): string | undefined {
  if (pathname.startsWith("/decks/")) {
    return "Couldn’t load this deck";
  }
  if (pathname.startsWith("/lessons/")) {
    return "Couldn’t load this lesson";
  }
  return viewTitles[pathname];
}

type ViewErrorBoundaryProps = Readonly<Pick<ErrorBoundaryProps, "error" | "retry">>;

export function ViewErrorBoundary({ error, retry }: ViewErrorBoundaryProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isHomeRoute = pathname === "/";

  useEffect(
    function reportViewFailure() {
      reportError(error, "View failure");
    },
    [error]
  );

  return (
    <ViewErrorState
      error={error}
      onHomeAction={isHomeRoute ? undefined : () => router.replace("/(tabs)/(study)")}
      retry={retry}
      scope="screen"
      title={resolveViewTitle(pathname)}
    />
  );
}
