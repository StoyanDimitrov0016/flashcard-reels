import { usePathname, useRouter, type ErrorBoundaryProps } from "expo-router";
import { useEffect } from "react";

import { reportError } from "@/shared/errors/report-error";
import { ViewErrorState } from "@/shared/presentation/components/view-error-state";

const viewTitles: Readonly<Record<string, string>> = {
  "/": "Couldn’t load Discover",
  "/focus": "Couldn’t load Focus",
  "/library": "Couldn’t load Library",
  "/progress": "Couldn’t load Progress",
  "/you": "Couldn’t open Controls",
};

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
      onHomeAction={isHomeRoute ? undefined : () => router.replace("/(tabs)/(discover)")}
      retry={retry}
      scope="screen"
      title={pathname.startsWith("/decks/") ? "Couldn’t load this deck" : viewTitles[pathname]}
    />
  );
}
