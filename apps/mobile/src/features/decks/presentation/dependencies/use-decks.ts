import type { CardProgressService } from "@/features/card-progress/domain/card-progress.service";
import type { DeckPackageDownloader } from "@/features/decks/application/deck-package-downloader";
import type { DeckPackagePicker } from "@/features/decks/application/deck-package-picker";
import type { DeckInstaller } from "@/features/decks/deck-installer";
import type { DeckService } from "@/features/decks/domain/deck.service";
import type { FlashcardService } from "@/features/flashcards/domain/flashcard.service";

import { useAppServices } from "@/infrastructure/app-services";

export type DecksCapability = Readonly<{
  deckInstaller: DeckInstaller;
  deckPackageDownloader: DeckPackageDownloader;
  deckPackagePicker: DeckPackagePicker;
  deckService: DeckService;
  flashcardService: FlashcardService;
  cardProgressService: CardProgressService;
}>;

export function useDecks(): DecksCapability {
  const {
    deckInstaller,
    deckPackageDownloader,
    deckPackagePicker,
    deckService,
    flashcardService,
    cardProgressService,
  } = useAppServices();

  return {
    deckInstaller,
    deckPackageDownloader,
    deckPackagePicker,
    deckService,
    flashcardService,
    cardProgressService,
  };
}
