import { AppResetAction } from "@/shared/presentation/components/app-reset-action";
import { ErrorDetails } from "@/shared/presentation/components/error-details";
import { ErrorState, type ErrorStateAction } from "@/shared/presentation/components/error-state";
import { getErrorFeedback } from "@/shared/presentation/errors/get-error-feedback";

type ViewErrorStateProps = Readonly<{
  error: unknown;
  retry: () => void;
  scope: "section" | "screen";
  onHomeAction?: () => void;
  allowAppRecovery?: boolean;
  title?: string;
}>;

export function ViewErrorState({
  error,
  retry,
  scope,
  onHomeAction,
  allowAppRecovery = false,
  title,
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
      title={
        title ??
        (scope === "section" ? "Couldn’t open this part of the app" : "Something went wrong")
      }
    >
      <ErrorDetails error={error} />
      {allowAppRecovery && <AppResetAction />}
    </ErrorState>
  );
}
