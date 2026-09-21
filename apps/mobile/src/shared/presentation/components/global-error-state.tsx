import { useEffect } from "react";

import { reportError } from "@/shared/errors/report-error";
import { AppResetAction } from "@/shared/presentation/components/app-reset-action";
import { ErrorDetails } from "@/shared/presentation/components/error-details";
import { ErrorState } from "@/shared/presentation/components/error-state";
import { getErrorFeedback } from "@/shared/presentation/errors/get-error-feedback";

type GlobalErrorStateProps = Readonly<{
  error: unknown;
  retry: () => void;
}>;

export function GlobalErrorState({ error, retry }: GlobalErrorStateProps) {
  const feedback = getErrorFeedback(error);

  useEffect(
    function reportGlobalFailure() {
      reportError(error, "Root failure");
    },
    [error]
  );

  return (
    <ErrorState
      actions={[{ label: "Try again", onPress: retry }]}
      message={feedback.message}
      title="Couldn’t start the app"
    >
      <ErrorDetails error={error} />
      <AppResetAction />
    </ErrorState>
  );
}
