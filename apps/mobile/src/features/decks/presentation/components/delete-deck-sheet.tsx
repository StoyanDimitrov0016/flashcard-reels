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
      message="Its cards and learning progress will be permanently deleted."
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={`Delete ${deck?.title ?? "deck"}?`}
      visible={deck !== null}
    />
  );
}
