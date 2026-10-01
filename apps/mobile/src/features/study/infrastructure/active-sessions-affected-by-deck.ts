import { and, eq, isNull, or } from "drizzle-orm";

import type { DeckId } from "@/features/decks/domain/deck.model";

import { studySessions } from "@/infrastructure/sqlite/schema";

export function activeSessionsAffectedByDeck(
  deckId: DeckId,
  { includeFocus }: Readonly<{ includeFocus: boolean }>
) {
  return and(
    isNull(studySessions.completedAt),
    includeFocus
      ? or(
          eq(studySessions.scope, "discover"),
          and(eq(studySessions.scope, "focus"), eq(studySessions.deckId, deckId))
        )
      : eq(studySessions.scope, "discover")
  );
}
