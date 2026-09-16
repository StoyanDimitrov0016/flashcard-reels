import { useEffect } from "react";
import { usePathname, useRouter, type ErrorBoundaryProps } from "expo-router";

import { ViewErrorState } from "@/shared/presentation/components/view-error-state";
import { reportError } from "@/shared/presentation/errors/report-error";

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
    />
  );
}
