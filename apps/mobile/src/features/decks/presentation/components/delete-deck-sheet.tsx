import type { Deck } from "@/features/decks/domain/deck.model";

import { DestructiveConfirmationSheet } from "@/shared/presentation/components/destructive-confirmation-sheet";

type DeleteDeckSheetProps = Readonly<{
  busy: boolean;
  deck: Deck | null;
  error: Error | null;
  onCancel: () => void;
  onConfirm: () => void;
}>;

export function DeleteDeckSheet({ busy, deck, error, onCancel, onConfirm }: DeleteDeckSheetProps) {
  return (
    <DestructiveConfirmationSheet
      actionLabel="Delete deck"
      busy={busy}
      error={error ? "Could not delete this deck. Try again." : null}
      icon={{ android: "delete", ios: "trash.fill", web: "delete" }}
      message="Its downloaded cards and audio will be removed. Your learning progress will be saved in Archived progress."
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={`Delete ${deck?.title ?? "deck"}?`}
      visible={deck !== null}
    />
  );
}
