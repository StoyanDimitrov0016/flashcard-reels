import { ErrorDetails } from "@/shared/presentation/components/error-details";
import { ErrorState, type ErrorStateAction } from "@/shared/presentation/components/error-state";
import { AppResetAction } from "@/shared/presentation/components/app-reset-action";
import { getErrorFeedback } from "@/shared/presentation/errors/get-error-feedback";

type ViewErrorStateProps = Readonly<{
  error: unknown;
  retry: () => void;
  scope: "section" | "screen";
  onHomeAction?: () => void;
  allowAppRecovery?: boolean;
}>;

export function ViewErrorState({
  error,
  retry,
  scope,
  onHomeAction,
  allowAppRecovery = false,
}: ViewErrorStateProps) {
  const feedback = getErrorFeedback(error);
  const actions: ErrorStateAction[] = [{ label: "Try again", onPress: retry }];
  if (onHomeAction) {
    actions.push({ kind: "secondary", label: "Go to Home", onPress: onHomeAction });
  }

  return (
    <ErrorState
      actions={actions}
      message={feedback.message}
      title={scope === "section" ? "Couldn’t load this section" : "Couldn’t load this screen"}
    >
      <ErrorDetails error={error} />
      {allowAppRecovery ? <AppResetAction /> : null}
    </ErrorState>
  );
}
