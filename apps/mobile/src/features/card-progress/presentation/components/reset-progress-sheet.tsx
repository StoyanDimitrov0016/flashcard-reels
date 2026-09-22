import { DestructiveConfirmationSheet } from "@/shared/presentation/components/destructive-confirmation-sheet";

type ResetProgressSheetProps = Readonly<{
  busy: boolean;
  error: string | null;
  isPresented: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  scope: string;
}>;

export function ResetProgressSheet({
  busy,
  error,
  isPresented,
  onCancel,
  onConfirm,
  scope,
}: ResetProgressSheetProps) {
  return (
    <DestructiveConfirmationSheet
      actionLabel="Reset progress"
      busy={busy}
      error={error}
      icon={{ android: "restart_alt", ios: "arrow.counterclockwise", web: "restart_alt" }}
      message="Learning history and profiling will be cleared. Your decks and cards will remain."
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={`Reset ${scope}?`}
      visible={isPresented}
    />
  );
}
